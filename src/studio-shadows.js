const PROJECT_KEY = 'stories-in-swadya-project-v1';
const OUTPUT_KEY = 'stories-in-swadya-output';
const STUDIO_KEY = 'stories-in-swadya-studio-v1';
const SHADOW_CHANNEL = 'stories-in-swadya-ground-shadows';
const NS = 'http://www.w3.org/2000/svg';

const DEFAULTS = {
  groundShadows: true,
  shadowIntensity: 0.28,
  shadowSoftness: 16,
  shadowDirection: 'center'
};

const PRESETS = {
  clean: { groundShadows: true, shadowIntensity: 0.18, shadowSoftness: 12, shadowDirection: 'center' },
  paper: { groundShadows: true, shadowIntensity: 0.25, shadowSoftness: 15, shadowDirection: 'center' },
  cinematic: { groundShadows: true, shadowIntensity: 0.38, shadowSoftness: 20, shadowDirection: 'right' },
  night: { groundShadows: true, shadowIntensity: 0.34, shadowSoftness: 22, shadowDirection: 'left' },
  fire: { groundShadows: true, shadowIntensity: 0.42, shadowSoftness: 18, shadowDirection: 'left' }
};

const CHARACTER_KEYS = new Set(['hero', 'villager', 'villager2', 'merchant', 'dragon', 'slime']);
const SCENE_KEYS = new Set(['tavern', 'roof', 'castle', 'forest', 'mountains']);
const EFFECT_KEYS = new Set(['fire', 'smoke', 'lightning']);

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    node.setAttribute(key, String(value));
  }
  return node;
}

function readJson(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function readMeta() {
  const meta = readJson(STUDIO_KEY, {}) || {};
  return {
    ...meta,
    objectMeta: meta.objectMeta && typeof meta.objectMeta === 'object' ? meta.objectMeta : {},
    sceneVisuals: meta.sceneVisuals && typeof meta.sceneVisuals === 'object' ? meta.sceneVisuals : {}
  };
}

function writeMeta(meta) {
  localStorage.setItem(STUDIO_KEY, JSON.stringify(meta));
  shadowChannel.postMessage({ type: 'refresh' });
}

function currentProject() {
  return readJson(PROJECT_KEY, null);
}

function currentSceneId() {
  return currentProject()?.activeSceneId || null;
}

function currentScene() {
  return readJson(OUTPUT_KEY, null);
}

function currentVisual(meta = readMeta()) {
  const sceneId = currentSceneId();
  const stored = sceneId ? meta.sceneVisuals[sceneId] || {} : {};
  return { ...DEFAULTS, ...stored };
}

function inferLayer(obj = {}) {
  if (obj.studioLayer) return obj.studioLayer;
  if (obj.type === 'path' || obj.type === 'text') return 'drawing';
  if (EFFECT_KEYS.has(obj.assetKey) || obj.role === 'fire') return 'effects';
  if (CHARACTER_KEYS.has(obj.assetKey) || ['hero', 'crowd', 'dragon', 'villager'].includes(obj.role)) return 'characters';
  if (SCENE_KEYS.has(obj.assetKey) || ['tavern', 'roof'].includes(obj.role)) return 'scene';
  return 'props';
}

function defaultShadowFor(obj) {
  const layer = inferLayer(obj);
  return layer === 'characters' || layer === 'props';
}

function shadowEnabledFor(obj, meta) {
  const override = meta.objectMeta[obj.id]?.groundShadow;
  return typeof override === 'boolean' ? override : defaultShadowFor(obj);
}

function ensureShadowDefs(svg, softness) {
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = svgEl('defs');
    svg.prepend(defs);
  }

  let filter = defs.querySelector('#studio-ground-shadow-blur');
  if (!filter) {
    filter = svgEl('filter', {
      id: 'studio-ground-shadow-blur',
      x: '-60%', y: '-250%', width: '220%', height: '600%',
      colorInterpolationFilters: 'sRGB'
    });
    filter.appendChild(svgEl('feGaussianBlur', { stdDeviation: softness }));
    defs.appendChild(filter);
  } else {
    filter.querySelector('feGaussianBlur')?.setAttribute('stdDeviation', String(softness));
  }
}

function shadowOffset(obj, direction) {
  const amount = Math.min(72, Math.max(8, Number(obj.w || 100) * 0.12));
  if (direction === 'left') return -amount;
  if (direction === 'right') return amount;
  return 0;
}

function shadowShape(obj, visual) {
  const width = Math.max(24, Number(obj.w || 120));
  const height = Math.max(24, Number(obj.h || 120));
  const layer = inferLayer(obj);
  const rxFactor = layer === 'characters' ? 0.29 : 0.37;
  const rx = clamp(width * rxFactor, 16, 250);
  const ry = clamp(height * (layer === 'characters' ? 0.035 : 0.055), 5, 34);
  const x = Number(obj.x || 0) + shadowOffset(obj, visual.shadowDirection);
  const y = Number(obj.y || 0) + height / 2 - Math.min(14, height * 0.035);
  const rotation = clamp(Number(obj.rotation || 0) * 0.12, -10, 10);
  return { x, y, rx, ry, rotation };
}

function insertShadowGroup(svg, group) {
  const firstObject = svg.querySelector('.stage-object');
  if (firstObject) {
    svg.insertBefore(group, firstObject);
    return;
  }
  const over = svg.querySelector('.stage-visual-over, [data-studio-runtime="over"]');
  if (over) svg.insertBefore(group, over);
  else svg.appendChild(group);
}

function renderGroundShadows(svg) {
  if (!svg) return;
  const scene = currentScene();
  const meta = readMeta();
  const visual = currentVisual(meta);
  svg.querySelector('[data-studio-ground-shadows]')?.remove();

  if (!scene?.objects?.length || visual.groundShadows === false || Number(visual.shadowIntensity) <= 0) return;

  const softness = clamp(visual.shadowSoftness ?? DEFAULTS.shadowSoftness, 2, 36);
  const intensity = clamp(visual.shadowIntensity ?? DEFAULTS.shadowIntensity, 0, 0.7);
  ensureShadowDefs(svg, softness);

  const group = svgEl('g', {
    'data-studio-ground-shadows': 'true',
    class: 'stage-ground-shadows',
    'pointer-events': 'none'
  });

  const visibleIds = new Set([...svg.querySelectorAll('.stage-object[data-object-id]')].map(node => node.dataset.objectId));
  const objects = [...scene.objects]
    .filter(obj => obj.visible !== false && visibleIds.has(obj.id) && shadowEnabledFor(obj, meta))
    .sort((a, b) => (a.z || 0) - (b.z || 0));

  for (const obj of objects) {
    const shape = shadowShape(obj, visual);
    group.appendChild(svgEl('ellipse', {
      cx: shape.x,
      cy: shape.y,
      rx: shape.rx,
      ry: shape.ry,
      fill: '#07070a',
      opacity: intensity,
      filter: 'url(#studio-ground-shadow-blur)',
      transform: `rotate(${shape.rotation} ${shape.x} ${shape.y})`,
      'data-shadow-for': obj.id
    }));

    if (inferLayer(obj) === 'characters') {
      group.appendChild(svgEl('ellipse', {
        cx: shape.x - shadowOffset(obj, visual.shadowDirection) * 0.35,
        cy: shape.y,
        rx: Math.max(8, shape.rx * 0.46),
        ry: Math.max(3, shape.ry * 0.55),
        fill: '#07070a',
        opacity: clamp(intensity * 0.8, 0, 0.55),
        'data-shadow-contact-for': obj.id
      }));
    }
  }

  if (group.childNodes.length) insertShadowGroup(svg, group);
}

function selectedIds() {
  return [...document.querySelectorAll('#stage .stage-object.is-selected')]
    .map(node => node.dataset.objectId)
    .filter(Boolean);
}

function refreshSelectionButton() {
  const button = document.querySelector('#studio-ground-shadow-selection');
  if (!button) return;
  const ids = selectedIds();
  button.disabled = !ids.length;
  if (!ids.length) {
    button.textContent = 'Ombra a terra selezione';
    button.classList.remove('is-active');
    return;
  }

  const scene = currentScene();
  const lookup = new Map((scene?.objects || []).map(obj => [obj.id, obj]));
  const meta = readMeta();
  const states = ids.map(id => shadowEnabledFor(lookup.get(id) || { id }, meta));
  const allOn = states.every(Boolean);
  const allOff = states.every(value => !value);
  button.textContent = allOn ? 'Ombra a terra: attiva' : allOff ? 'Ombra a terra: disattiva' : 'Ombra a terra: mista';
  button.classList.toggle('is-active', allOn);
}

function toggleSelectionShadows() {
  const ids = selectedIds();
  if (!ids.length) return;
  const scene = currentScene();
  const lookup = new Map((scene?.objects || []).map(obj => [obj.id, obj]));
  const meta = readMeta();
  const allOn = ids.every(id => shadowEnabledFor(lookup.get(id) || { id }, meta));
  for (const id of ids) {
    meta.objectMeta[id] = { ...(meta.objectMeta[id] || {}), groundShadow: !allOn };
  }
  writeMeta(meta);
  refreshAll();
}

function updateSceneVisual(patch) {
  const sceneId = currentSceneId();
  if (!sceneId) return;
  const meta = readMeta();
  meta.sceneVisuals[sceneId] = { ...DEFAULTS, ...(meta.sceneVisuals[sceneId] || {}), ...patch };
  writeMeta(meta);
  syncControls();
  refreshAll();
}

function syncControls() {
  const visual = currentVisual();
  const enabled = document.querySelector('#studio-ground-shadows-enabled');
  const intensity = document.querySelector('#studio-shadow-intensity');
  const softness = document.querySelector('#studio-shadow-softness');
  const direction = document.querySelector('#studio-shadow-direction');
  if (enabled) enabled.checked = visual.groundShadows !== false;
  if (intensity) intensity.value = String(visual.shadowIntensity);
  if (softness) softness.value = String(visual.shadowSoftness);
  if (direction) direction.value = visual.shadowDirection;
  const intensityValue = document.querySelector('#studio-shadow-intensity-value');
  const softnessValue = document.querySelector('#studio-shadow-softness-value');
  if (intensityValue) intensityValue.textContent = `${Math.round(Number(visual.shadowIntensity) * 100)}%`;
  if (softnessValue) softnessValue.textContent = `${Math.round(Number(visual.shadowSoftness))}`;
  refreshSelectionButton();
}

function injectControls() {
  const dialog = document.querySelector('#studio-look-dialog');
  if (!dialog || dialog.querySelector('#studio-ground-shadow-controls')) return false;
  const sceneSection = dialog.querySelector('section');
  const fxSection = dialog.querySelectorAll('section')[1];
  if (!sceneSection || !fxSection) return false;

  sceneSection.insertAdjacentHTML('beforeend', `
    <div id="studio-ground-shadow-controls" class="studio-shadow-controls">
      <div class="studio-section-title">Ombre a terra</div>
      <label class="studio-check-line"><input id="studio-ground-shadows-enabled" type="checkbox"> Ombre automatiche per personaggi e props</label>
      <label class="studio-range">Intensità ombre <output id="studio-shadow-intensity-value"></output><input id="studio-shadow-intensity" type="range" min="0" max="0.7" step="0.01"></label>
      <label class="studio-range">Morbidezza <output id="studio-shadow-softness-value"></output><input id="studio-shadow-softness" type="range" min="2" max="36" step="1"></label>
      <label class="studio-full-field">Direzione luce<select id="studio-shadow-direction"><option value="left">Da destra</option><option value="center">Dall’alto</option><option value="right">Da sinistra</option></select></label>
    </div>`);

  fxSection.insertAdjacentHTML('beforeend', '<button type="button" id="studio-ground-shadow-selection" class="studio-wide-button">Ombra a terra selezione</button>');

  document.querySelector('#studio-ground-shadows-enabled')?.addEventListener('change', event => updateSceneVisual({ groundShadows: event.target.checked }));
  document.querySelector('#studio-shadow-intensity')?.addEventListener('input', event => updateSceneVisual({ shadowIntensity: Number(event.target.value) }));
  document.querySelector('#studio-shadow-softness')?.addEventListener('input', event => updateSceneVisual({ shadowSoftness: Number(event.target.value) }));
  document.querySelector('#studio-shadow-direction')?.addEventListener('change', event => updateSceneVisual({ shadowDirection: event.target.value }));
  document.querySelector('#studio-ground-shadow-selection')?.addEventListener('click', toggleSelectionShadows);

  document.querySelectorAll('[data-look]').forEach(button => button.addEventListener('click', () => {
    const preset = PRESETS[button.dataset.look];
    if (preset) setTimeout(() => updateSceneVisual(preset), 0);
  }));

  syncControls();
  return true;
}

let refreshFrame = 0;
function refreshAll() {
  cancelAnimationFrame(refreshFrame);
  refreshFrame = requestAnimationFrame(() => {
    renderGroundShadows(document.querySelector('#stage'));
    renderGroundShadows(document.querySelector('#output-stage'));
    syncControls();
  });
}

const shadowChannel = new BroadcastChannel(SHADOW_CHANNEL);
shadowChannel.addEventListener('message', refreshAll);

const observer = new MutationObserver(mutations => {
  const meaningful = mutations.some(mutation => [...mutation.addedNodes, ...mutation.removedNodes]
    .some(node => node.nodeType !== 1 || !node.hasAttribute?.('data-studio-ground-shadows')));
  if (meaningful) {
    injectControls();
    refreshAll();
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener('pointerup', () => setTimeout(() => { refreshSelectionButton(); refreshAll(); }, 0), true);
document.addEventListener('click', () => setTimeout(() => { injectControls(); refreshSelectionButton(); }, 0), true);
window.addEventListener('storage', event => {
  if ([PROJECT_KEY, OUTPUT_KEY, STUDIO_KEY].includes(event.key)) refreshAll();
});
window.addEventListener('focus', refreshAll);

injectControls();
refreshAll();
