const PROJECT_KEY = 'stories-in-swadya-project-v1';
const OUTPUT_KEY = 'stories-in-swadya-output';
const STUDIO_KEY = 'stories-in-swadya-studio-v1';
const CHANNEL_NAME = 'stories-in-swadya-output';
const NS = 'http://www.w3.org/2000/svg';

const ORIGINAL_GET = Storage.prototype.getItem;
const ORIGINAL_SET = Storage.prototype.setItem;

const LAYERS = [
  { id: 'all', label: 'Tutto' },
  { id: 'scene', label: 'Ambiente' },
  { id: 'characters', label: 'Personaggi' },
  { id: 'props', label: 'Props' },
  { id: 'drawing', label: 'Disegni' },
  { id: 'effects', label: 'FX' }
];

const DEFAULT_VISUAL = {
  lighting: 'warm',
  lightIntensity: 0.22,
  texture: 'paper',
  grain: 0.07,
  vignette: 0.14
};

const LOOKS = {
  clean: { lighting: 'none', lightIntensity: 0, texture: 'none', grain: 0, vignette: 0 },
  paper: { lighting: 'warm', lightIntensity: 0.22, texture: 'paper', grain: 0.07, vignette: 0.14 },
  cinematic: { lighting: 'cool', lightIntensity: 0.2, texture: 'film', grain: 0.09, vignette: 0.28 },
  fire: { lighting: 'fire', lightIntensity: 0.34, texture: 'film', grain: 0.08, vignette: 0.24 },
  night: { lighting: 'cool', lightIntensity: 0.3, texture: 'film', grain: 0.06, vignette: 0.38 }
};

const DEFAULT_META = {
  version: 1,
  palette: ['#171419', '#fbbf24', '#f4ead0', '#8b87dc', '#b91c1c', '#5b8a55'],
  recent: [],
  colorTarget: 'color',
  layerFilter: 'all',
  carryLayers: ['scene', 'characters', 'props', 'drawing'],
  includeHidden: true,
  objectMeta: {},
  sceneVisuals: {},
  sceneBackgrounds: {},
  shortcuts: {
    select: 'v',
    draw: 'b',
    next: 'space',
    previous: 'shift+space',
    presentation: 'p',
    layers: 'l',
    scenes: 's',
    studio: 'q',
    newScene: 'n'
  }
};

const CHARACTER_KEYS = new Set(['hero', 'villager', 'villager2', 'merchant', 'dragon', 'slime']);
const SCENE_KEYS = new Set(['tavern', 'roof', 'castle', 'forest', 'mountains']);
const EFFECT_KEYS = new Set(['fire', 'smoke', 'lightning']);

let bridgeInstalled = false;
let studioStarted = false;
let activeSceneHint = null;
let stageObserver = null;
let refreshFrame = 0;

const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

function rawGet(key) {
  return ORIGINAL_GET.call(window.localStorage, key);
}

function rawSet(key, value) {
  return ORIGINAL_SET.call(window.localStorage, key, value);
}

function normalizeHex(value, fallback = '#171419') {
  const next = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(next) ? next.toLowerCase() : fallback;
}

function readMeta() {
  try {
    const parsed = JSON.parse(rawGet(STUDIO_KEY) || 'null');
    return {
      ...clone(DEFAULT_META),
      ...(parsed || {}),
      palette: Array.isArray(parsed?.palette) && parsed.palette.length ? parsed.palette.slice(0, 12).map(color => normalizeHex(color)) : [...DEFAULT_META.palette],
      recent: Array.isArray(parsed?.recent) ? parsed.recent.slice(0, 6).map(color => normalizeHex(color)) : [],
      carryLayers: Array.isArray(parsed?.carryLayers) ? parsed.carryLayers : [...DEFAULT_META.carryLayers],
      objectMeta: parsed?.objectMeta && typeof parsed.objectMeta === 'object' ? parsed.objectMeta : {},
      sceneVisuals: parsed?.sceneVisuals && typeof parsed.sceneVisuals === 'object' ? parsed.sceneVisuals : {},
      sceneBackgrounds: parsed?.sceneBackgrounds && typeof parsed.sceneBackgrounds === 'object' ? parsed.sceneBackgrounds : {},
      shortcuts: { ...DEFAULT_META.shortcuts, ...(parsed?.shortcuts || {}) }
    };
  } catch {
    return clone(DEFAULT_META);
  }
}

function writeMeta(meta) {
  rawSet(STUDIO_KEY, JSON.stringify(meta));
}

function inferLayer(obj = {}) {
  if (obj.studioLayer) return obj.studioLayer;
  if (obj.type === 'path' || obj.type === 'text') return 'drawing';
  if (EFFECT_KEYS.has(obj.assetKey) || obj.role === 'fire') return 'effects';
  if (CHARACTER_KEYS.has(obj.assetKey) || ['hero', 'crowd', 'dragon', 'villager'].includes(obj.role)) return 'characters';
  if (SCENE_KEYS.has(obj.assetKey) || ['tavern', 'roof'].includes(obj.role)) return 'scene';
  return 'props';
}

function decorateObject(obj, meta) {
  const extra = meta.objectMeta[obj.id] || {};
  return {
    ...obj,
    studioLayer: extra.layer || obj.studioLayer || inferLayer(obj),
    fx: extra.fx ?? obj.fx ?? 'none',
    color: extra.color || obj.color,
    accent: extra.accent || obj.accent,
    studioPinned: extra.pinned ?? obj.studioPinned ?? false
  };
}

function decorateScene(scene, sceneId, meta) {
  if (!scene) return scene;
  const visual = { ...DEFAULT_VISUAL, ...(scene.visual || {}), ...(meta.sceneVisuals[sceneId] || {}) };
  return {
    ...scene,
    background: meta.sceneBackgrounds[sceneId] || scene.background,
    visual,
    objects: Array.isArray(scene.objects) ? scene.objects.map(obj => decorateObject(obj, meta)) : []
  };
}

function decorateProjectValue(value, meta = readMeta()) {
  if (!value?.scenes) return value;
  const next = clone(value);
  next.scenes = next.scenes.map(entry => ({
    ...entry,
    scene: decorateScene(entry.scene, entry.id, meta)
  }));
  return next;
}

function decorateOutputValue(value, meta = readMeta()) {
  if (!value) return value;
  let sceneId = activeSceneHint;
  try {
    sceneId ||= JSON.parse(rawGet(PROJECT_KEY) || 'null')?.activeSceneId || null;
  } catch {
    // Il progetto verrà decorato al prossimo salvataggio valido.
  }
  return decorateScene(clone(value), sceneId, meta);
}

function decorateStoredJson(key, raw) {
  if (!raw) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (key === PROJECT_KEY) return JSON.stringify(decorateProjectValue(parsed));
    if (key === OUTPUT_KEY) return JSON.stringify(decorateOutputValue(parsed));
  } catch {
    return raw;
  }
  return raw;
}

function installStudioStorageBridge() {
  if (bridgeInstalled) return;
  bridgeInstalled = true;
  try { activeSceneHint = JSON.parse(rawGet(PROJECT_KEY) || 'null')?.activeSceneId || null; } catch { activeSceneHint = null; }

  Storage.prototype.getItem = function getItem(key) {
    const raw = ORIGINAL_GET.call(this, key);
    if (this !== window.localStorage || (key !== PROJECT_KEY && key !== OUTPUT_KEY)) return raw;
    return decorateStoredJson(key, raw);
  };

  Storage.prototype.setItem = function setItem(key, value) {
    if (this !== window.localStorage || (key !== PROJECT_KEY && key !== OUTPUT_KEY)) {
      return ORIGINAL_SET.call(this, key, value);
    }
    if (key === PROJECT_KEY) {
      try { activeSceneHint = JSON.parse(String(value))?.activeSceneId || activeSceneHint; } catch { /* dati non validi gestiti dal progetto */ }
    }
    return ORIGINAL_SET.call(this, key, decorateStoredJson(key, String(value)));
  };
}

function readProject() {
  try {
    return JSON.parse(window.localStorage.getItem(PROJECT_KEY) || 'null');
  } catch {
    return null;
  }
}

function readOutputScene() {
  try {
    return JSON.parse(window.localStorage.getItem(OUTPUT_KEY) || 'null');
  } catch {
    return null;
  }
}

function activeSceneId() {
  return activeSceneHint || readProject()?.activeSceneId || null;
}

function selectedIds() {
  return [...document.querySelectorAll('#stage .stage-object.is-selected')]
    .map(node => node.dataset.objectId)
    .filter(Boolean);
}
