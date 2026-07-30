import { ASSET_MAP, STAGE_WIDTH, STAGE_HEIGHT } from './assets.js';

const NS = 'http://www.w3.org/2000/svg';

const DEFAULT_VISUAL = {
  lighting: 'warm',
  lightIntensity: 0.22,
  texture: 'paper',
  grain: 0.07,
  vignette: 0.14
};

const CHARACTER_KEYS = new Set(['hero', 'villager', 'villager2', 'merchant', 'dragon', 'slime']);
const SCENE_KEYS = new Set(['tavern', 'roof', 'castle', 'forest', 'mountains']);
const EFFECT_KEYS = new Set(['fire', 'smoke', 'lightning']);

export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    el.setAttribute(key, String(value));
  }
  return el;
}

function safeColor(value, fallback) {
  return /^#[0-9a-fA-F]{3,8}$/.test(value || '') ? value : fallback;
}

function safeNumber(value, fallback, min = -Infinity, max = Infinity) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function sceneVisual(scene) {
  return { ...DEFAULT_VISUAL, ...(scene?.visual || {}) };
}

export function inferStudioLayer(obj = {}) {
  if (obj.studioLayer) return obj.studioLayer;
  if (obj.type === 'path' || obj.type === 'text') return 'drawing';
  if (EFFECT_KEYS.has(obj.assetKey) || obj.role === 'fire') return 'effects';
  if (CHARACTER_KEYS.has(obj.assetKey) || ['hero', 'crowd', 'dragon', 'villager'].includes(obj.role)) return 'characters';
  if (SCENE_KEYS.has(obj.assetKey) || ['tavern', 'roof'].includes(obj.role)) return 'scene';
  return 'props';
}

function visualDefs() {
  return `
    <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity="0.18"/>
    </filter>
    <filter id="studio-shadow" x="-35%" y="-35%" width="170%" height="180%">
      <feDropShadow dx="0" dy="12" stdDeviation="8" flood-color="#07070a" flood-opacity="0.32"/>
    </filter>
    <filter id="studio-depth" x="-35%" y="-35%" width="175%" height="185%">
      <feDropShadow dx="0" dy="16" stdDeviation="10" flood-color="#07070a" flood-opacity="0.38"/>
      <feColorMatrix type="saturate" values="1.08"/>
    </filter>
    <filter id="studio-glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feFlood flood-color="#fbbf24" flood-opacity="0.78" result="glowColor"/>
      <feComposite in="glowColor" in2="blur" operator="in" result="softGlow"/>
      <feMerge><feMergeNode in="softGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="studio-ink" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="1" seed="11" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="studio-paper" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" seed="7" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <radialGradient id="studio-light-warm" cx="35%" cy="24%" r="75%">
      <stop offset="0" stop-color="#ffd98a" stop-opacity="0.82"/>
      <stop offset="0.48" stop-color="#fbbf24" stop-opacity="0.15"/>
      <stop offset="1" stop-color="#fbbf24" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="studio-light-cool" cx="34%" cy="22%" r="78%">
      <stop offset="0" stop-color="#dce9ff" stop-opacity="0.72"/>
      <stop offset="0.5" stop-color="#8b87dc" stop-opacity="0.13"/>
      <stop offset="1" stop-color="#8b87dc" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="studio-light-fire" cx="65%" cy="72%" r="72%">
      <stop offset="0" stop-color="#ffcf70" stop-opacity="0.9"/>
      <stop offset="0.38" stop-color="#f97316" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#b91c1c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="studio-vignette" cx="50%" cy="48%" r="70%">
      <stop offset="0.56" stop-color="#07070a" stop-opacity="0"/>
      <stop offset="1" stop-color="#07070a" stop-opacity="1"/>
    </radialGradient>
    <pattern id="stage-grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(7,7,10,.09)" stroke-width="2"/>
    </pattern>`;
}

function addSceneAtmosphere(svg, visual, position = 'under') {
  const layer = svgEl('g', {
    class: `stage-visual-layer stage-visual-${position}`,
    'pointer-events': 'none'
  });

  const lighting = ['warm', 'cool', 'fire'].includes(visual.lighting) ? visual.lighting : 'none';
  const lightIntensity = safeNumber(visual.lightIntensity, DEFAULT_VISUAL.lightIntensity, 0, 1);
  if (position === 'under' && lighting !== 'none' && lightIntensity > 0) {
    layer.appendChild(svgEl('rect', {
      x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT,
      fill: `url(#studio-light-${lighting})`,
      opacity: lightIntensity
    }));
  }

  const grain = safeNumber(visual.grain, DEFAULT_VISUAL.grain, 0, 0.35);
  if (position === 'over' && visual.texture !== 'none' && grain > 0) {
    layer.appendChild(svgEl('rect', {
      x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT,
      fill: '#ffffff',
      filter: 'url(#studio-paper)',
      opacity: grain,
      'mix-blend-mode': visual.texture === 'film' ? 'overlay' : 'multiply'
    }));
  }

  const vignette = safeNumber(visual.vignette, DEFAULT_VISUAL.vignette, 0, 0.7);
  if (position === 'over' && vignette > 0) {
    layer.appendChild(svgEl('rect', {
      x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT,
      fill: 'url(#studio-vignette)',
      opacity: vignette
    }));
  }

  if (layer.childNodes.length) svg.appendChild(layer);
}

export function renderScene(svg, scene, options = {}) {
  const { interactive = false, selection = new Set(), showGrid = false } = options;
  const visual = sceneVisual(scene);
  svg.replaceChildren();
  svg.setAttribute('viewBox', `0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`);
  svg.style.background = scene.background || '#f4ead0';
  svg.dataset.visualLighting = visual.lighting || 'none';
  svg.dataset.visualTexture = visual.texture || 'none';

  const defs = svgEl('defs');
  defs.innerHTML = visualDefs();
  svg.appendChild(defs);

  addSceneAtmosphere(svg, visual, 'under');

  if (showGrid) {
    svg.appendChild(svgEl('rect', { x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT, fill: 'url(#stage-grid)', 'pointer-events': 'none' }));
  }

  const objects = [...(scene.objects || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const obj of objects) {
    if (obj.visible === false) continue;
    const group = renderObject(obj, interactive);
    if (selection.has(obj.id)) group.classList.add('is-selected');
    svg.appendChild(group);
  }

  addSceneAtmosphere(svg, visual, 'over');
}

export function renderObject(obj, interactive = false) {
  const fx = ['shadow', 'depth', 'glow', 'ink'].includes(obj.fx) ? obj.fx : 'none';
  const g = svgEl('g', {
    class: `stage-object stage-object-${obj.type || 'asset'}`,
    'data-object-id': obj.id,
    'data-studio-layer': inferStudioLayer(obj),
    'data-studio-fx': fx,
    transform: objectTransform(obj),
    opacity: obj.opacity ?? 1,
    filter: fx === 'none' ? undefined : `url(#studio-${fx})`,
    tabindex: interactive ? '0' : undefined,
    role: interactive ? 'button' : undefined,
    'aria-label': interactive ? obj.name : undefined
  });
  g.style.color = safeColor(obj.color, '#171419');
  g.style.setProperty('--asset-accent', safeColor(obj.accent, '#fbbf24'));
  g.style.setProperty('--asset-danger', safeColor(obj.danger, '#b91c1c'));
  if (obj.locked) g.classList.add('is-locked');

  if (obj.type === 'image') {
    const image = svgEl('image', {
      href: obj.src,
      x: -obj.w / 2,
      y: -obj.h / 2,
      width: obj.w,
      height: obj.h,
      preserveAspectRatio: 'xMidYMid meet'
    });
    g.appendChild(image);
  } else if (obj.type === 'path') {
    const sx = obj.w / (obj.baseW || obj.w || 1);
    const sy = obj.h / (obj.baseH || obj.h || 1);
    const path = svgEl('path', {
      d: obj.path,
      transform: `scale(${sx} ${sy})`,
      fill: obj.fill || 'none',
      stroke: safeColor(obj.color || obj.stroke, '#171419'),
      'stroke-width': obj.strokeWidth || 9,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'vector-effect': 'non-scaling-stroke'
    });
    g.appendChild(path);
  } else if (obj.type === 'text') {
    const text = svgEl('text', {
      x: 0,
      y: 0,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      fill: safeColor(obj.color, '#171419'),
      'font-size': (obj.fontSize || 52) * (obj.h / (obj.baseH || obj.h || 1)),
      'font-family': 'Inter, system-ui, sans-serif',
      'font-weight': obj.fontWeight || 700
    });
    text.textContent = obj.text || 'Testo';
    g.appendChild(text);
  } else {
    const asset = ASSET_MAP[obj.assetKey];
    if (asset) {
      const inner = svgEl('g', {
        transform: `translate(${-obj.w / 2} ${-obj.h / 2}) scale(${obj.w / asset.w} ${obj.h / asset.h})`
      });
      inner.innerHTML = asset.svg;
      g.appendChild(inner);
      if (obj.bubbleText) {
        const text = svgEl('text', {
          x: 0,
          y: -obj.h * 0.05,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          fill: safeColor(obj.color, '#171419'),
          'font-size': Math.max(24, Math.min(54, obj.w / 7)),
          'font-family': 'Inter, system-ui, sans-serif',
          'font-weight': 700
        });
        text.textContent = obj.bubbleText;
        g.appendChild(text);
      }
    }
  }
  return g;
}

export function objectTransform(obj) {
  const flipX = obj.flipX ? -1 : 1;
  const flipY = obj.flipY ? -1 : 1;
  return `translate(${obj.x} ${obj.y}) rotate(${obj.rotation || 0}) scale(${flipX} ${flipY})`;
}

export function getObjectBounds(obj) {
  return {
    x: obj.x - obj.w / 2,
    y: obj.y - obj.h / 2,
    width: obj.w,
    height: obj.h,
    cx: obj.x,
    cy: obj.y
  };
}

export function sceneToSvgString(scene) {
  const clone = document.createElementNS(NS, 'svg');
  clone.setAttribute('xmlns', NS);
  clone.setAttribute('viewBox', `0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`);
  clone.setAttribute('width', String(STAGE_WIDTH));
  clone.setAttribute('height', String(STAGE_HEIGHT));
  renderScene(clone, scene, { interactive: false, showGrid: false });
  const bg = svgEl('rect', { x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT, fill: scene.background || '#f4ead0' });
  clone.insertBefore(bg, clone.firstChild?.nextSibling || clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}
