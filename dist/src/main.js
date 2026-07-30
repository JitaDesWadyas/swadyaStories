import { BUILTIN_ASSETS, ASSET_MAP, STAGE_WIDTH, STAGE_HEIGHT, assetThumbnail } from './assets.js';
import { renderScene, svgEl, getObjectBounds, sceneToSvgString } from './render.js';
import { MusicController } from './music.js';

const STORAGE_KEY = 'stories-in-swadya-project-v1';
const OUTPUT_KEY = 'stories-in-swadya-output';
const channel = new BroadcastChannel('stories-in-swadya-output');
const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const ASSET_CATEGORIES = ['Persone', 'Creature', 'Luoghi', 'Oggetti', 'Effetti', 'Altro'];

function makeAssetObject(assetKey, overrides = {}) {
  const asset = ASSET_MAP[assetKey];
  return {
    id: uid('obj'),
    type: 'asset',
    assetKey,
    name: asset?.name || 'Asset',
    x: STAGE_WIDTH / 2,
    y: STAGE_HEIGHT / 2,
    w: asset?.w || 180,
    h: asset?.h || 180,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    flipX: false,
    flipY: false,
    color: '#171419',
    accent: '#fbbf24',
    danger: '#b91c1c',
    role: asset?.role || null,
    groupId: null,
    z: 1,
    ...overrides
  };
}

function demoObjects({ dragon = false, fire = false, roof = true } = {}) {
  const crowdGroup = 'group-crowd';
  return [
    makeAssetObject('mountains', { id: 'demo-mountains', x: 800, y: 215, w: 1120, h: 485, z: 0, color: '#3e3a43', opacity: 0.56, locked: true, name: 'Montagne sullo sfondo' }),
    makeAssetObject('tavern', { id: 'demo-tavern', x: 800, y: 590, w: 1180, h: 645, z: 1, locked: true, role: 'tavern' }),
    makeAssetObject('table', { id: 'demo-table', x: 805, y: 686, w: 330, h: 175, z: 3, name: 'Tavolo centrale' }),
    makeAssetObject('barrel', { id: 'demo-barrel', x: 1110, y: 682, w: 120, h: 152, z: 3 }),
    makeAssetObject('merchant', { id: 'demo-merchant', x: 1010, y: 570, w: 150, h: 212, z: 4, groupId: crowdGroup, role: 'crowd', name: 'Oste' }),
    makeAssetObject('villager', { id: 'demo-villager-1', x: 760, y: 585, w: 120, h: 197, z: 4, groupId: crowdGroup, role: 'crowd', name: 'Paesano' }),
    makeAssetObject('villager2', { id: 'demo-villager-2', x: 885, y: 580, w: 116, h: 190, z: 4, groupId: crowdGroup, role: 'crowd', name: 'Paesana' }),
    makeAssetObject('villager', { id: 'demo-villager-3', x: 1165, y: 570, w: 112, h: 184, z: 4, groupId: crowdGroup, role: 'crowd', name: 'Cliente' }),
    makeAssetObject('hero', { id: 'demo-hero', x: 540, y: 612, w: 158, h: 242, z: 6, role: 'hero', name: 'Eroe improvvisato' }),
    makeAssetObject('dragon', { id: 'demo-dragon', x: 1180, y: 305, w: 475, h: 334, z: 7, visible: dragon, role: 'dragon', name: 'Drago' }),
    makeAssetObject('fire', { id: 'demo-fire', x: 1050, y: 672, w: 170, h: 214, z: 8, visible: fire, role: 'fire', name: 'Fuoco' }),
    makeAssetObject('smoke', { id: 'demo-smoke', x: 1090, y: 490, w: 220, h: 220, z: 7, visible: fire, role: 'fire', name: 'Fumo' }),
    makeAssetObject('roof', { id: 'demo-roof', x: 800, y: 255, w: 1240, h: 357, z: 10, visible: roof, role: 'roof', locked: false, name: 'Tetto rimovibile' })
  ];
}

function makeBlankProject(name = 'Nuova storia') {
  const sceneId = uid('scene');
  return {
    version: 2,
    name,
    activeSceneId: sceneId,
    customAssets: [],
    useBuiltinAssets: false,
    settings: { grid: false, safeArea: false },
    music: { bpm: 118, masterVolume: 0.9, masterMuted: false, tracks: [] },
    scenes: [{ id: sceneId, name: 'Scena 1', scene: { background: '#f4ead0', objects: [] } }]
  };
}

function makeDemoProject() {
  const firstId = uid('scene');
  const secondId = uid('scene');
  const thirdId = uid('scene');
  return {
    version: 2,
    name: 'Armatura di drago — prova',
    activeSceneId: firstId,
    customAssets: [],
    useBuiltinAssets: true,
    settings: { grid: false, safeArea: false },
    music: { bpm: 118, masterVolume: 0.9, masterMuted: false, tracks: [] },
    scenes: [
      { id: firstId, name: '1 · La taverna', scene: { background: '#f4ead0', objects: demoObjects({ roof: true }) } },
      { id: secondId, name: '2 · Arriva il drago', scene: { background: '#f4ead0', objects: demoObjects({ roof: false, dragon: true }) } },
      { id: thirdId, name: '3 · Tutto brucia', scene: { background: '#f0d5b5', objects: demoObjects({ roof: false, dragon: true, fire: true }) } }
    ]
  };
}

function normalizeProject(next) {
  const normalized = next?.scenes?.length ? next : makeDemoProject();
  normalized.version = 2;
  normalized.customAssets = Array.isArray(normalized.customAssets) ? normalized.customAssets : [];
  normalized.useBuiltinAssets = typeof normalized.useBuiltinAssets === 'boolean' ? normalized.useBuiltinAssets : normalized.scenes.some(entry => entry.scene?.objects?.some(object => object.type === 'asset'));
  normalized.customAssets = normalized.customAssets.map(asset => ({ ...asset, category: normalizeAssetCategory(asset.category) }));
  normalized.settings = { grid: false, safeArea: false, ...(normalized.settings || {}) };
  normalized.music = {
    bpm: 118,
    masterVolume: 0.9,
    masterMuted: false,
    tracks: [],
    ...(normalized.music || {})
  };
  normalized.music.tracks = Array.isArray(normalized.music.tracks) ? normalized.music.tracks : [];
  return normalized;
}

function loadProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.scenes?.length) return normalizeProject(parsed);
    }
  } catch {
    // Ignora dati corrotti e riparti dalla demo.
  }
  return normalizeProject(makeDemoProject());
}

let project = loadProject();
let selection = new Set();
let activeTool = 'select';
let activeRightTab = 'inspector';
let draggedAssetKey = null;
let activeLeftCategory = 'Oggetti';
let assetDraft = null;
let assetDraftHistory = [];
let assetDraftFuture = [];
let outputWindow = null;
let history = [];
let future = [];
let pointerAction = null;
let drawPoints = [];
let temporaryPath = null;
let autosaveTimer = null;
let toastTimer = null;

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-block">
        <div class="brand-mark" aria-hidden="true"><span></span><span></span></div>
        <div><strong>Stories in sWadya</strong><small>live story stage</small></div>
      </div>
      <div class="toolbar" aria-label="Strumenti">
        <button class="tool-button is-active" data-tool="select" title="Seleziona (V)">↖ <span>Seleziona</span></button>
        <button class="tool-button" data-tool="draw" title="Disegna (B)">✎ <span>Disegna</span></button>
        <button class="tool-button" id="add-text" title="Aggiungi testo">T <span>Testo</span></button>
        <span class="toolbar-separator"></span>
        <button class="icon-button" id="undo" title="Annulla (Ctrl+Z)">↶</button>
        <button class="icon-button" id="redo" title="Ripeti (Ctrl+Y)">↷</button>
        <button class="icon-button" id="group" title="Raggruppa (Ctrl+G)">▦</button>
        <button class="icon-button" id="ungroup" title="Separa (Ctrl+Shift+G)">▤</button>
      </div>
      <div class="top-actions">
        <button class="secondary-button" id="new-project">Nuovo</button>
        <button class="secondary-button" id="help-button">Comandi</button>
        <button class="secondary-button" id="open-output">Output OBS</button>
        <button class="primary-button" id="present">Presenta</button>
      </div>
    </header>

    <div class="workspace">
      <aside class="side-panel left-panel">
        <div class="panel-heading">
          <div><strong>Asset</strong><span>disegna, trascina o clicca</span></div>
          <div class="asset-heading-actions">
            <button class="upload-button" id="new-drawn-asset" title="Disegna un asset direttamente nella scena">＋</button>
            <button class="upload-button small-symbol" id="export-assets" title="Esporta libreria asset">↓</button>
            <label class="upload-button small-symbol" title="Importa libreria asset">↑<input id="assets-import" type="file" accept="application/json,.swadya-assets" hidden></label>
          </div>
        </div>
        <label class="asset-category-field">Sezione
          <select id="asset-category-filter"></select>
        </label>
        <input id="asset-search" class="search-input" type="search" placeholder="Cerca nella sezione…" />
        <div id="asset-grid" class="asset-grid"></div>
        <div class="left-footer asset-library-footer">
          <label class="plain-button">Importa immagine<input id="asset-upload" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" multiple hidden></label>
          <button id="export-project" class="plain-button">Esporta progetto</button>
          <label class="plain-button">Importa progetto<input id="project-import" type="file" accept="application/json,.swadya" hidden></label>
        </div>
      </aside>

      <main class="stage-column">
        <div class="stage-topline">
          <div class="project-name-wrap"><input id="project-name" value="" aria-label="Nome progetto" /></div>
          <div class="stage-toggles">
            <label><input id="grid-toggle" type="checkbox"> Griglia</label>
            <label><input id="safe-toggle" type="checkbox"> Area sicura</label>
          </div>
        </div>
        <div id="stage-viewport" class="stage-viewport">
          <div id="asset-draw-toolbar" class="asset-draw-toolbar" hidden>
            <div class="asset-draw-main">
              <label>Nome<input id="asset-draft-name" value="Nuovo asset" maxlength="60"></label>
              <label>Sezione<select id="asset-draft-category"></select></label>
              <div class="asset-draw-tools">
                <button type="button" data-asset-draft-tool="draw" class="is-active">✎ Penna</button>
                <button type="button" data-asset-draft-tool="erase">⌫ Gomma</button>
                <button type="button" data-asset-draft-tool="move">✥ Sposta</button>
              </div>
              <label class="asset-draw-color">Colore<input id="asset-draft-color" type="color" value="#171419"></label>
              <label class="asset-draw-width">Tratto<input id="asset-draft-width" type="range" min="2" max="60" value="10"><output id="asset-draft-width-value">10</output></label>
            </div>
            <div class="asset-draw-actions">
              <button type="button" id="asset-draft-undo" class="icon-button" title="Annulla tratto">↶</button>
              <button type="button" id="asset-draft-redo" class="icon-button" title="Ripeti tratto">↷</button>
              <button type="button" id="asset-draft-cancel" class="secondary-button">Annulla</button>
              <button type="button" id="asset-draft-confirm" class="primary-button">Conferma asset</button>
            </div>
          </div>
          <div id="stage-frame" class="stage-frame">
            <svg id="stage" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" aria-label="Palco della storia"></svg>
            <div id="safe-area" class="safe-area" hidden><span>AREA SICURA 16:9</span></div>
          </div>
        </div>
        <div class="stage-statusbar">
          <span id="status-selection">Nessuna selezione</span>
          <span id="status-scene"></span>
          <span id="status-music">Musica ferma</span>
          <span>V seleziona · B disegna · Spazio scena successiva</span>
        </div>
      </main>

      <aside class="side-panel right-panel">
        <div class="right-tabs" role="tablist">
          <button data-right-tab="inspector" class="is-active">Proprietà</button>
          <button data-right-tab="layers">Livelli</button>
          <button data-right-tab="scenes">Scene</button>
          <button data-right-tab="music">Musica</button>
        </div>
        <div id="right-content" class="right-content"></div>
      </aside>
    </div>

    <div id="toast" class="toast" role="status" aria-live="polite"></div>
    <button id="exit-present" class="exit-present" hidden>Esci dalla presentazione · Esc</button>

    <dialog id="help-dialog" class="help-dialog">
      <div class="dialog-heading"><div><strong>Comandi rapidi</strong><span>pensati per non spezzare il freestyle</span></div><button id="close-help" class="icon-button">×</button></div>
      <div class="shortcut-grid">
        <kbd>1</kbd><span>Seleziona l'eroe</span>
        <kbd>2</kbd><span>Seleziona tutta la folla</span>
        <kbd>3</kbd><span>Seleziona il drago</span>
        <kbd>D</kbd><span>Mostra/nasconde il drago</span>
        <kbd>T</kbd><span>Toglie/rimette il tetto</span>
        <kbd>F</kbd><span>Mostra/nasconde fuoco e fumo</span>
        <kbd>Spazio</kbd><span>Passa alla scena successiva</span>
        <kbd>V / B</kbd><span>Selezione / disegno</span>
        <kbd>Ctrl G</kbd><span>Raggruppa la selezione</span>
        <kbd>Ctrl D</kbd><span>Duplica</span>
        <kbd>Del</kbd><span>Elimina</span>
        <kbd>P</kbd><span>Presentazione pulita</span>
        <kbd>M</kbd><span>Muta/riattiva la musica senza perdere il tempo</span>
      </div>
      <div class="dialog-note">Asset: premi + nella sezione scelta, poi disegna direttamente sulla scena. Sinistro disegna, destro cancella, centrale sposta tutto il disegno. Conferma solo quando l'asset è finito.</div>
    </dialog>

    <dialog id="new-project-dialog" class="help-dialog new-project-dialog">
      <div class="dialog-heading"><div><strong>Nuovo progetto</strong><span>crea un palco vuoto senza asset oppure riparti dalla demo</span></div><button id="close-new-project" class="icon-button">×</button></div>
      <div class="new-project-body">
        <label class="field-label">Nome progetto<input id="new-project-name" value="Nuova storia" maxlength="80"></label>
        <div class="new-project-actions">
          <button id="create-blank-project" class="primary-button">Progetto vuoto</button>
          <button id="create-demo-project" class="secondary-button">Carica demo</button>
        </div>
        <p class="muted-copy">Il progetto vuoto parte senza asset. Esporta prima la libreria asset se vuoi riutilizzarla in un altro progetto. I loop musicali restano nel file progetto esportato.</p>
      </div>
    </dialog>
  </div>`;

const stage = document.querySelector('#stage');
const stageFrame = document.querySelector('#stage-frame');
const assetGrid = document.querySelector('#asset-grid');
const assetCategoryFilter = document.querySelector('#asset-category-filter');
const assetDrawToolbar = document.querySelector('#asset-draw-toolbar');
const rightContent = document.querySelector('#right-content');
const toastEl = document.querySelector('#toast');
const helpDialog = document.querySelector('#help-dialog');
const newProjectDialog = document.querySelector('#new-project-dialog');

const musicController = new MusicController({
  getProject: () => project,
  onCommit: options => commit(options),
  onSave: () => saveProject(),
  onToast: message => toast(message),
  uid
});
musicController.ensureProject();

function activeSceneEntry() {
  return project.scenes.find(scene => scene.id === project.activeSceneId) || project.scenes[0];
}

function currentScene() {
  return activeSceneEntry()?.scene;
}

function selectedObjects() {
  const ids = selection;
  return currentScene().objects.filter(obj => ids.has(obj.id));
}

function objectById(id) {
  return currentScene().objects.find(obj => obj.id === id);
}

function normalizeZ() {
  currentScene().objects
    .sort((a, b) => (a.z || 0) - (b.z || 0))
    .forEach((obj, index) => { obj.z = index; });
}

function pushHistory() {
  history.push(clone(project));
  if (history.length > 60) history.shift();
  future = [];
}

function undo() {
  if (!history.length) return;
  future.push(clone(project));
  project = history.pop();
  selection.clear();
  commit({ history: false, toast: 'Annullato' });
}

function redo() {
  if (!future.length) return;
  history.push(clone(project));
  project = future.pop();
  selection.clear();
  commit({ history: false, toast: 'Ripristinato' });
}

function saveProject() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      toast('Progetto troppo grande per il salvataggio automatico. Esportalo su file.');
    }
  }, 160);
}

function sendOutput() {
  const scene = clone(currentScene());
  try { localStorage.setItem(OUTPUT_KEY, JSON.stringify(scene)); } catch { /* immagini grandi */ }
  channel.postMessage({ type: 'scene', scene });
}

channel.addEventListener('message', event => {
  if (event.data?.type === 'request-scene') sendOutput();
});

function commit(options = {}) {
  normalizeZ();
  saveProject();
  renderAll();
  sendOutput();
  if (options.toast) toast(options.toast);
}

function toast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
}

function setTool(tool) {
  activeTool = tool;
  document.querySelectorAll('[data-tool]').forEach(button => button.classList.toggle('is-active', button.dataset.tool === tool));
  stage.classList.toggle('tool-draw', tool === 'draw');
  stage.classList.toggle('tool-select', tool === 'select');
  toast(tool === 'draw' ? 'Disegno attivo · trascina sul palco' : 'Selezione attiva');
}

function renderAll() {
  project = normalizeProject(project);
  musicController.ensureProject();
  project.activeSceneId = activeSceneEntry().id;
  renderScene(stage, currentScene(), {
    interactive: true,
    selection,
    showGrid: Boolean(project.settings?.grid)
  });
  renderSelectionOverlay();
  renderAssetDraftOverlay();
  renderAssets();
  renderRightPanel();
  renderStatus();
  document.querySelector('#project-name').value = project.name || '';
  document.querySelector('#grid-toggle').checked = Boolean(project.settings?.grid);
  document.querySelector('#safe-toggle').checked = Boolean(project.settings?.safeArea);
  document.querySelector('#safe-area').hidden = !project.settings?.safeArea;
  document.querySelector('#undo').disabled = history.length === 0;
  document.querySelector('#redo').disabled = future.length === 0;
  if (assetDraft) updateAssetDraftUi();
}

function renderStatus() {
  const count = selection.size;
  const label = count === 0 ? 'Nessuna selezione' : count === 1 ? selectedObjects()[0]?.name || '1 elemento' : `${count} elementi selezionati`;
  document.querySelector('#status-selection').textContent = label;
  const index = project.scenes.findIndex(scene => scene.id === project.activeSceneId);
  document.querySelector('#status-scene').textContent = `${index + 1}/${project.scenes.length} · ${activeSceneEntry().name}`;
  const music = project.music;
  document.querySelector('#status-music').textContent = musicController.playing
    ? `♫ ${music.bpm} BPM · in riproduzione`
    : `♫ ${music.bpm} BPM · fermo`;
}

function renderSelectionOverlay() {
  const selected = selectedObjects().filter(obj => obj.visible !== false);
  if (!selected.length) return;

  const overlay = svgEl('g', { class: 'selection-overlay' });
  for (const obj of selected) {
    const bounds = getObjectBounds(obj);
    overlay.appendChild(svgEl('rect', {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      class: 'selection-box',
      transform: `rotate(${obj.rotation || 0} ${obj.x} ${obj.y})`,
      'pointer-events': 'none'
    }));
  }

  if (selected.length === 1 && !selected[0].locked) {
    const obj = selected[0];
    const bounds = getObjectBounds(obj);
    const corners = [
      ['nw', bounds.x, bounds.y], ['ne', bounds.x + bounds.width, bounds.y],
      ['sw', bounds.x, bounds.y + bounds.height], ['se', bounds.x + bounds.width, bounds.y + bounds.height]
    ];
    for (const [handle, x, y] of corners) {
      overlay.appendChild(svgEl('circle', {
        cx: x, cy: y, r: 13,
        class: 'selection-handle resize-handle',
        'data-handle': handle,
        'data-object-id': obj.id,
        transform: `rotate(${obj.rotation || 0} ${obj.x} ${obj.y})`
      }));
    }
    const rotateY = bounds.y - 55;
    overlay.appendChild(svgEl('line', {
      x1: obj.x, y1: bounds.y, x2: obj.x, y2: rotateY,
      class: 'rotate-line', transform: `rotate(${obj.rotation || 0} ${obj.x} ${obj.y})`
    }));
    overlay.appendChild(svgEl('circle', {
      cx: obj.x, cy: rotateY, r: 14,
      class: 'selection-handle rotate-handle',
      'data-object-id': obj.id,
      transform: `rotate(${obj.rotation || 0} ${obj.x} ${obj.y})`
    }));
  }
  stage.appendChild(overlay);
}

function normalizeAssetCategory(category) {
  const aliases = { Personaggi: 'Persone', Mostri: 'Creature', Segni: 'Effetti', Testo: 'Altro', 'Miei asset': 'Altro' };
  const next = aliases[category] || category;
  return ASSET_CATEGORIES.includes(next) ? next : 'Altro';
}

function getAssetList() {
  const builtins = project.useBuiltinAssets
    ? BUILTIN_ASSETS.map(asset => ({ ...asset, category: normalizeAssetCategory(asset.category) }))
    : [];
  const custom = (project.customAssets || []).map(asset => ({ ...asset, category: normalizeAssetCategory(asset.category), custom: true }));
  return [...builtins, ...custom];
}

function renderAssetCategoryOptions() {
  const counts = Object.fromEntries(ASSET_CATEGORIES.map(category => [category, 0]));
  for (const asset of getAssetList()) counts[normalizeAssetCategory(asset.category)] += 1;
  if (!ASSET_CATEGORIES.includes(activeLeftCategory)) activeLeftCategory = 'Oggetti';
  assetCategoryFilter.innerHTML = ASSET_CATEGORIES.map(category => `<option value="${category}">${category} (${counts[category] || 0})</option>`).join('');
  assetCategoryFilter.value = activeLeftCategory;
  const draftCategory = document.querySelector('#asset-draft-category');
  if (draftCategory && !draftCategory.options.length) {
    draftCategory.innerHTML = ASSET_CATEGORIES.map(category => `<option value="${category}">${category}</option>`).join('');
  }
}

function renderAssets() {
  renderAssetCategoryOptions();
  const all = getAssetList();
  const query = document.querySelector('#asset-search').value.trim().toLowerCase();
  const filtered = all.filter(asset => normalizeAssetCategory(asset.category) === activeLeftCategory && (!query || `${asset.name} ${asset.category}`.toLowerCase().includes(query)));
  assetGrid.innerHTML = filtered.map(asset => `
    <div class="asset-card ${asset.custom ? 'is-custom' : ''}" data-asset-key="${asset.key}" draggable="true" title="Trascina sul palco o clicca per aggiungere">
      <button class="asset-spawn" data-asset-action="spawn" type="button">
        <span class="asset-preview">${asset.custom ? `<img src="${asset.src}" alt="">` : assetThumbnail(asset)}</span>
        <span class="asset-name">${escapeHtml(asset.name)}</span>
        ${asset.shortcut ? `<kbd>${asset.shortcut}</kbd>` : ''}
      </button>
      ${asset.custom ? `<span class="asset-card-actions"><button type="button" data-asset-action="edit" title="Modifica asset nella scena">✎</button><button type="button" data-asset-action="delete" title="Elimina asset">×</button></span>` : ''}
    </div>`).join('') || `<div class="empty-state"><strong>${escapeHtml(activeLeftCategory)}</strong><span>Nessun asset. Premi + e disegnalo direttamente nella scena.</span></div>`;
}

function renderRightPanel() {
  document.querySelectorAll('[data-right-tab]').forEach(button => button.classList.toggle('is-active', button.dataset.rightTab === activeRightTab));
  if (activeRightTab === 'layers') renderLayers();
  else if (activeRightTab === 'scenes') renderScenes();
  else if (activeRightTab === 'music') musicController.render(rightContent);
  else renderInspector();
}

function renderInspector() {
  const objects = selectedObjects();
  if (!objects.length) {
    rightContent.innerHTML = `
      <section class="inspector-section">
        <div class="section-title">Scena</div>
        <label class="field-label">Sfondo
          <div class="color-row"><input id="scene-background" type="color" value="${currentScene().background || '#f4ead0'}"><input id="scene-background-text" value="${currentScene().background || '#f4ead0'}"></div>
        </label>
        <div class="preset-row">
          <button data-bg="#f4ead0" style="--swatch:#f4ead0">Pergamena</button>
          <button data-bg="#f7f2e8" style="--swatch:#f7f2e8">Avorio</button>
          <button data-bg="#171419" style="--swatch:#171419">Notte</button>
          <button data-bg="#c8d8d1" style="--swatch:#c8d8d1">Nebbia</button>
        </div>
      </section>
      <section class="inspector-section">
        <div class="section-title">Esporta immagine</div>
        <p class="muted-copy">Crea un fermo immagine 1600×900 della scena attuale.</p>
        <button id="export-png" class="primary-button full-width">Esporta PNG</button>
        <button id="export-svg" class="secondary-button full-width">Esporta SVG</button>
      </section>
      <section class="inspector-section danger-zone">
        <div class="section-title">Progetto</div>
        <button id="reset-demo" class="danger-button full-width">Ripristina scena demo</button>
      </section>`;
    bindSceneInspector();
    return;
  }

  if (objects.length > 1) {
    rightContent.innerHTML = `
      <section class="selection-summary"><span>${objects.length}</span><strong>elementi selezionati</strong><small>spostali insieme o trasformali in un gruppo stabile</small></section>
      <section class="inspector-section">
        <button id="group-selection" class="primary-button full-width">Raggruppa selezione</button>
        <button id="duplicate-selection" class="secondary-button full-width">Duplica</button>
        <div class="two-buttons"><button id="front-selection" class="plain-button">Porta davanti</button><button id="back-selection" class="plain-button">Porta dietro</button></div>
        <button id="delete-selection" class="danger-button full-width">Elimina selezione</button>
      </section>`;
    bindMultiInspector();
    return;
  }

  const obj = objects[0];
  const bubbleField = obj.assetKey === 'speech' ? `<label class="field-label">Testo fumetto<textarea id="prop-bubble" rows="3">${escapeHtml(obj.bubbleText || '')}</textarea></label>` : '';
  const textField = obj.type === 'text' ? `<label class="field-label">Testo<textarea id="prop-text" rows="3">${escapeHtml(obj.text || '')}</textarea></label>` : '';
  rightContent.innerHTML = `
    <section class="inspector-section">
      <label class="field-label">Nome<input id="prop-name" value="${escapeAttr(obj.name)}"></label>
      ${bubbleField}${textField}
      <div class="field-grid">
        <label class="field-label">X<input id="prop-x" type="number" value="${round(obj.x)}"></label>
        <label class="field-label">Y<input id="prop-y" type="number" value="${round(obj.y)}"></label>
        <label class="field-label">Larghezza<input id="prop-w" type="number" min="10" value="${round(obj.w)}"></label>
        <label class="field-label">Altezza<input id="prop-h" type="number" min="10" value="${round(obj.h)}"></label>
        <label class="field-label">Rotazione<input id="prop-rotation" type="number" value="${round(obj.rotation || 0)}"></label>
        <label class="field-label">Opacità<input id="prop-opacity" type="number" min="0" max="100" value="${round((obj.opacity ?? 1) * 100)}"></label>
      </div>
    </section>
    <section class="inspector-section">
      <div class="section-title">Stile</div>
      <div class="field-grid colors-grid">
        <label class="field-label">Tratto<input id="prop-color" type="color" value="${obj.color || '#171419'}"></label>
        <label class="field-label">Accento<input id="prop-accent" type="color" value="${obj.accent || '#fbbf24'}"></label>
      </div>
      <div class="toggle-grid">
        <label><input id="prop-visible" type="checkbox" ${obj.visible !== false ? 'checked' : ''}> Visibile</label>
        <label><input id="prop-locked" type="checkbox" ${obj.locked ? 'checked' : ''}> Bloccato</label>
        <label><input id="prop-flipx" type="checkbox" ${obj.flipX ? 'checked' : ''}> Specchia X</label>
        <label><input id="prop-flipy" type="checkbox" ${obj.flipY ? 'checked' : ''}> Specchia Y</label>
      </div>
    </section>
    <section class="inspector-section">
      <div class="two-buttons"><button id="bring-front" class="plain-button">Davanti</button><button id="send-back" class="plain-button">Dietro</button></div>
      <button id="duplicate-object" class="secondary-button full-width">Duplica</button>
      <button id="delete-object" class="danger-button full-width">Elimina</button>
    </section>`;
  bindObjectInspector(obj.id);
}

function bindSceneInspector() {
  const color = document.querySelector('#scene-background');
  const text = document.querySelector('#scene-background-text');
  const setBackground = value => {
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
    pushHistory();
    currentScene().background = value;
    commit();
  };
  color.addEventListener('change', () => setBackground(color.value));
  text.addEventListener('change', () => setBackground(text.value));
  document.querySelectorAll('[data-bg]').forEach(button => button.addEventListener('click', () => setBackground(button.dataset.bg)));
  document.querySelector('#export-png').addEventListener('click', exportPng);
  document.querySelector('#export-svg').addEventListener('click', exportSvg);
  document.querySelector('#reset-demo').addEventListener('click', async () => {
    pushHistory();
    await musicController.resetForProjectChange();
    project = makeDemoProject();
    selection.clear();
    commit({ toast: 'Scena demo ripristinata' });
  });
}

function bindMultiInspector() {
  document.querySelector('#group-selection').addEventListener('click', groupSelection);
  document.querySelector('#duplicate-selection').addEventListener('click', duplicateSelection);
  document.querySelector('#front-selection').addEventListener('click', bringSelectionFront);
  document.querySelector('#back-selection').addEventListener('click', sendSelectionBack);
  document.querySelector('#delete-selection').addEventListener('click', deleteSelection);
}

function bindObjectInspector(id) {
  const obj = objectById(id);
  const bindText = (selector, property) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.addEventListener('change', () => { pushHistory(); obj[property] = el.value; commit(); });
  };
  const bindNumber = (selector, property, transform = Number) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.addEventListener('change', () => {
      const value = transform(el.value);
      if (!Number.isFinite(value)) return;
      pushHistory(); obj[property] = value; commit();
    });
  };
  const bindCheck = (selector, property) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.addEventListener('change', () => { pushHistory(); obj[property] = el.checked; commit(); });
  };
  bindText('#prop-name', 'name');
  bindText('#prop-bubble', 'bubbleText');
  bindText('#prop-text', 'text');
  bindNumber('#prop-x', 'x');
  bindNumber('#prop-y', 'y');
  bindNumber('#prop-w', 'w', value => Math.max(10, Number(value)));
  bindNumber('#prop-h', 'h', value => Math.max(10, Number(value)));
  bindNumber('#prop-rotation', 'rotation');
  bindNumber('#prop-opacity', 'opacity', value => clamp(Number(value) / 100, 0, 1));
  bindText('#prop-color', 'color');
  bindText('#prop-accent', 'accent');
  bindCheck('#prop-visible', 'visible');
  bindCheck('#prop-locked', 'locked');
  bindCheck('#prop-flipx', 'flipX');
  bindCheck('#prop-flipy', 'flipY');
  document.querySelector('#bring-front').addEventListener('click', bringSelectionFront);
  document.querySelector('#send-back').addEventListener('click', sendSelectionBack);
  document.querySelector('#duplicate-object').addEventListener('click', duplicateSelection);
  document.querySelector('#delete-object').addEventListener('click', deleteSelection);
}

function renderLayers() {
  const objects = [...currentScene().objects].sort((a, b) => (b.z || 0) - (a.z || 0));
  rightContent.innerHTML = `<div class="layers-list">${objects.map(obj => `
    <div class="layer-row ${selection.has(obj.id) ? 'is-selected' : ''}" data-layer-id="${obj.id}">
      <button class="layer-visibility" data-layer-action="visibility" title="Mostra/nascondi">${obj.visible === false ? '○' : '●'}</button>
      <button class="layer-main" data-layer-action="select"><span class="layer-icon">${layerIcon(obj)}</span><span>${escapeHtml(obj.name)}</span></button>
      <button class="layer-lock" data-layer-action="lock" title="Blocca/sblocca">${obj.locked ? '◆' : '◇'}</button>
    </div>`).join('')}</div>`;
}

function renderScenes() {
  rightContent.innerHTML = `
    <div class="scenes-toolbar"><button id="add-scene" class="primary-button">＋ Nuova scena</button><button id="duplicate-scene" class="secondary-button">Duplica</button></div>
    <div class="scene-list">${project.scenes.map((entry, index) => `
      <button class="scene-card ${entry.id === project.activeSceneId ? 'is-active' : ''}" data-scene-id="${entry.id}">
        <span class="scene-number">${String(index + 1).padStart(2, '0')}</span>
        <span class="scene-card-copy"><strong>${escapeHtml(entry.name)}</strong><small>${entry.scene.objects.filter(o => o.visible !== false).length} elementi visibili</small></span>
        <span class="scene-menu">›</span>
      </button>`).join('')}</div>
    <div class="scene-actions"><button id="rename-scene" class="plain-button">Rinomina</button><button id="delete-scene" class="danger-button">Elimina</button></div>`;
  document.querySelector('#add-scene').addEventListener('click', addScene);
  document.querySelector('#duplicate-scene').addEventListener('click', duplicateScene);
  document.querySelector('#rename-scene').addEventListener('click', renameScene);
  document.querySelector('#delete-scene').addEventListener('click', deleteScene);
}

function layerIcon(obj) {
  if (obj.type === 'path') return '✎';
  if (obj.type === 'text') return 'T';
  if (obj.type === 'image') return '▧';
  if (obj.role === 'hero') return '♞';
  if (obj.role === 'dragon') return '♨';
  if (obj.role === 'roof') return '⌂';
  return '◇';
}

function selectObject(id, { additive = false, ignoreGroup = false } = {}) {
  const obj = objectById(id);
  if (!obj) return;
  const ids = !ignoreGroup && obj.groupId
    ? currentScene().objects.filter(item => item.groupId === obj.groupId).map(item => item.id)
    : [id];
  if (!additive) selection.clear();
  const allSelected = ids.every(itemId => selection.has(itemId));
  ids.forEach(itemId => allSelected && additive ? selection.delete(itemId) : selection.add(itemId));
  renderAll();
}

function selectByRole(role) {
  const matches = currentScene().objects.filter(obj => obj.role === role && obj.visible !== false);
  if (!matches.length) return toast(`Nessun elemento “${role}” visibile`);
  selection = new Set(matches.map(obj => obj.id));
  setTool('select');
  renderAll();
}

function spawnAsset(assetKey, custom = null, position = null) {
  pushHistory();
  let obj;
  if (custom) {
    const maxZ = currentScene().objects.reduce((m, o) => Math.max(m, o.z || 0), 0);
    obj = {
      id: uid('obj'), type: 'image', assetKey: custom.key, name: custom.name, src: custom.src,
      x: position?.x ?? STAGE_WIDTH / 2, y: position?.y ?? STAGE_HEIGHT / 2, w: custom.w || 300, h: custom.h || 300,
      rotation: 0, opacity: 1, visible: true, locked: false, flipX: false, flipY: false,
      color: '#171419', accent: '#fbbf24', z: maxZ + 1
    };
  } else {
    obj = makeAssetObject(assetKey);
    obj.z = currentScene().objects.reduce((m, o) => Math.max(m, o.z || 0), 0) + 1;
    if (position) { obj.x = position.x; obj.y = position.y; }
    else {
      if (assetKey === 'dragon') { obj.x = 1170; obj.y = 310; }
      if (assetKey === 'roof') { obj.x = 800; obj.y = 255; }
      if (assetKey === 'fire') { obj.x = 980; obj.y = 640; }
    }
  }
  currentScene().objects.push(obj);
  selection = new Set([obj.id]);
  setTool('select');
  commit({ toast: `${obj.name} aggiunto` });
}

function toggleRole(role, fallbackAssetKey) {
  const matches = currentScene().objects.filter(obj => obj.role === role);
  if (!matches.length) return spawnAsset(fallbackAssetKey);
  pushHistory();
  const shouldShow = matches.some(obj => obj.visible === false);
  matches.forEach(obj => { obj.visible = shouldShow; });
  selection = new Set(matches.filter(obj => obj.visible).map(obj => obj.id));
  commit({ toast: shouldShow ? `${role} mostrato` : `${role} nascosto` });
}

function groupSelection() {
  if (selection.size < 2) return toast('Seleziona almeno due elementi');
  pushHistory();
  const groupId = uid('group');
  selectedObjects().forEach(obj => { obj.groupId = groupId; });
  commit({ toast: 'Gruppo creato' });
}

function ungroupSelection() {
  if (!selection.size) return;
  pushHistory();
  selectedObjects().forEach(obj => { obj.groupId = null; });
  commit({ toast: 'Gruppo separato' });
}

function duplicateSelection() {
  if (!selection.size) return;
  pushHistory();
  const groupMap = new Map();
  const copies = selectedObjects().map(obj => {
    const copy = clone(obj);
    copy.id = uid('obj');
    copy.x += 35;
    copy.y += 35;
    copy.z = currentScene().objects.length + 1;
    if (copy.groupId) {
      if (!groupMap.has(copy.groupId)) groupMap.set(copy.groupId, uid('group'));
      copy.groupId = groupMap.get(copy.groupId);
    }
    return copy;
  });
  currentScene().objects.push(...copies);
  selection = new Set(copies.map(copy => copy.id));
  commit({ toast: 'Selezione duplicata' });
}

function deleteSelection() {
  if (!selection.size) return;
  pushHistory();
  currentScene().objects = currentScene().objects.filter(obj => !selection.has(obj.id));
  selection.clear();
  commit({ toast: 'Elementi eliminati' });
}

function bringSelectionFront() {
  if (!selection.size) return;
  pushHistory();
  const max = currentScene().objects.reduce((m, o) => Math.max(m, o.z || 0), 0);
  selectedObjects().forEach((obj, index) => { obj.z = max + index + 1; });
  commit();
}

function sendSelectionBack() {
  if (!selection.size) return;
  pushHistory();
  const min = currentScene().objects.reduce((m, o) => Math.min(m, o.z || 0), 0);
  selectedObjects().forEach((obj, index) => { obj.z = min - selection.size + index; });
  commit();
}

function addText() {
  pushHistory();
  const maxZ = currentScene().objects.reduce((m, o) => Math.max(m, o.z || 0), 0);
  const obj = {
    id: uid('obj'), type: 'text', name: 'Testo', text: 'Scrivi qui',
    x: 800, y: 450, w: 420, h: 90, rotation: 0, opacity: 1, visible: true,
    locked: false, flipX: false, flipY: false, color: '#171419', accent: '#fbbf24',
    fontSize: 64, fontWeight: 800, baseW: 420, baseH: 90, z: maxZ + 1
  };
  currentScene().objects.push(obj);
  selection = new Set([obj.id]);
  setTool('select');
  commit({ toast: 'Testo aggiunto · modificalo a destra' });
}

function addScene() {
  pushHistory();
  const entry = { id: uid('scene'), name: `Scena ${project.scenes.length + 1}`, scene: { background: currentScene().background, objects: [] } };
  project.scenes.push(entry);
  project.activeSceneId = entry.id;
  selection.clear();
  commit({ toast: 'Nuova scena creata' });
}

function duplicateScene() {
  pushHistory();
  const source = activeSceneEntry();
  const entry = { id: uid('scene'), name: `${source.name} · copia`, scene: clone(source.scene) };
  const index = project.scenes.findIndex(scene => scene.id === source.id);
  project.scenes.splice(index + 1, 0, entry);
  project.activeSceneId = entry.id;
  selection.clear();
  commit({ toast: 'Scena duplicata' });
}

function renameScene() {
  const entry = activeSceneEntry();
  const name = window.prompt('Nome della scena', entry.name);
  if (!name?.trim()) return;
  pushHistory();
  entry.name = name.trim();
  commit();
}

function deleteScene() {
  if (project.scenes.length <= 1) return toast('Il progetto deve avere almeno una scena');
  pushHistory();
  const index = project.scenes.findIndex(scene => scene.id === project.activeSceneId);
  project.scenes.splice(index, 1);
  project.activeSceneId = project.scenes[Math.max(0, index - 1)].id;
  selection.clear();
  commit({ toast: 'Scena eliminata' });
}

function loadScene(id) {
  if (!project.scenes.some(scene => scene.id === id)) return;
  project.activeSceneId = id;
  selection.clear();
  commit({ history: false });
}

function nextScene() {
  const index = project.scenes.findIndex(scene => scene.id === project.activeSceneId);
  loadScene(project.scenes[(index + 1) % project.scenes.length].id);
  toast(activeSceneEntry().name);
}

function previousScene() {
  const index = project.scenes.findIndex(scene => scene.id === project.activeSceneId);
  loadScene(project.scenes[(index - 1 + project.scenes.length) % project.scenes.length].id);
  toast(activeSceneEntry().name);
}

function stagePoint(event) {
  const point = stage.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const matrix = stage.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  const converted = point.matrixTransform(matrix.inverse());
  return { x: converted.x, y: converted.y };
}

function beginMove(event, obj) {
  if (obj.locked) return;
  if (!selection.has(obj.id)) selectObject(obj.id, { additive: event.shiftKey, ignoreGroup: event.altKey });
  const selected = selectedObjects().filter(item => !item.locked);
  if (!selected.length) return;
  pushHistory();
  pointerAction = {
    type: 'move', pointerId: event.pointerId, start: stagePoint(event),
    originals: selected.map(item => ({ id: item.id, x: item.x, y: item.y }))
  };
  stage.setPointerCapture(event.pointerId);
}

function beginResize(event, obj, handle) {
  pushHistory();
  pointerAction = { type: 'resize', pointerId: event.pointerId, objectId: obj.id, handle, original: clone(obj) };
  stage.setPointerCapture(event.pointerId);
}

function beginRotate(event, obj) {
  pushHistory();
  pointerAction = { type: 'rotate', pointerId: event.pointerId, objectId: obj.id, original: clone(obj) };
  stage.setPointerCapture(event.pointerId);
}

function beginDraw(event) {
  pushHistory();
  drawPoints = [stagePoint(event)];
  temporaryPath = svgEl('path', { class: 'temporary-path', d: `M ${drawPoints[0].x} ${drawPoints[0].y}` });
  stage.appendChild(temporaryPath);
  pointerAction = { type: 'draw', pointerId: event.pointerId };
  stage.setPointerCapture(event.pointerId);
}

function updatePointerAction(event) {
  if (updateAssetDraftPointer(event)) return;
  if (!pointerAction || pointerAction.pointerId !== event.pointerId) return;
  const point = stagePoint(event);
  if (pointerAction.type === 'move') {
    const dx = point.x - pointerAction.start.x;
    const dy = point.y - pointerAction.start.y;
    pointerAction.originals.forEach(original => {
      const obj = objectById(original.id);
      obj.x = clamp(original.x + dx, -obj.w, STAGE_WIDTH + obj.w);
      obj.y = clamp(original.y + dy, -obj.h, STAGE_HEIGHT + obj.h);
    });
    renderAll();
  } else if (pointerAction.type === 'resize') {
    const obj = objectById(pointerAction.objectId);
    const original = pointerAction.original;
    const localX = point.x - original.x;
    const localY = point.y - original.y;
    let width = Math.max(20, Math.abs(localX) * 2);
    let height = Math.max(20, Math.abs(localY) * 2);
    if (event.shiftKey) {
      const ratio = original.w / original.h;
      if (width / height > ratio) height = width / ratio;
      else width = height * ratio;
    }
    obj.w = width;
    obj.h = height;
    renderAll();
  } else if (pointerAction.type === 'rotate') {
    const obj = objectById(pointerAction.objectId);
    obj.rotation = Math.round((Math.atan2(point.y - obj.y, point.x - obj.x) * 180 / Math.PI) + 90);
    renderAll();
  } else if (pointerAction.type === 'draw') {
    const last = drawPoints[drawPoints.length - 1];
    if (Math.hypot(point.x - last.x, point.y - last.y) > 4) drawPoints.push(point);
    if (temporaryPath) temporaryPath.setAttribute('d', pointsToPath(drawPoints));
  }
}

function endPointerAction(event) {
  if (endAssetDraftPointer(event)) return;
  if (!pointerAction || pointerAction.pointerId !== event.pointerId) return;
  if (pointerAction.type === 'draw') finishDrawing();
  pointerAction = null;
  try { stage.releasePointerCapture(event.pointerId); } catch { /* già rilasciato */ }
  commit();
}

function finishDrawing() {
  temporaryPath?.remove();
  temporaryPath = null;
  if (drawPoints.length < 2) {
    history.pop();
    return;
  }
  const xs = drawPoints.map(p => p.x);
  const ys = drawPoints.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const relative = drawPoints.map(p => ({ x: p.x - cx, y: p.y - cy }));
  const maxZ = currentScene().objects.reduce((m, o) => Math.max(m, o.z || 0), 0);
  const obj = {
    id: uid('obj'), type: 'path', name: 'Disegno', path: pointsToPath(relative),
    x: cx, y: cy, w: Math.max(20, maxX - minX), h: Math.max(20, maxY - minY),
    rotation: 0, opacity: 1, visible: true, locked: false, flipX: false, flipY: false,
    stroke: '#171419', strokeWidth: 10, color: '#171419', accent: '#fbbf24', baseW: Math.max(20, maxX - minX), baseH: Math.max(20, maxY - minY), z: maxZ + 1
  };
  currentScene().objects.push(obj);
  selection = new Set([obj.id]);
}

function pointsToPath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midpoint = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
    d += ` Q ${points[i].x} ${points[i].y} ${midpoint.x} ${midpoint.y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}


function assetDraftSnapshot() {
  if (!assetDraft) return;
  assetDraftHistory.push(clone({
    strokes: assetDraft.strokes,
    baseImage: assetDraft.baseImage,
    baseRect: assetDraft.baseRect
  }));
  if (assetDraftHistory.length > 80) assetDraftHistory.shift();
  assetDraftFuture = [];
  updateAssetDraftUi();
}

function assetDraftBounds() {
  if (!assetDraft) return null;
  const points = assetDraft.strokes.flatMap(stroke => stroke.points || []);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  if (assetDraft.baseImage && assetDraft.baseRect) {
    minX = Math.min(minX, assetDraft.baseRect.x);
    minY = Math.min(minY, assetDraft.baseRect.y);
    maxX = Math.max(maxX, assetDraft.baseRect.x + assetDraft.baseRect.w);
    maxY = Math.max(maxY, assetDraft.baseRect.y + assetDraft.baseRect.h);
  }
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  if (!Number.isFinite(minX)) return null;
  const maxStroke = Math.max(4, ...assetDraft.strokes.map(stroke => Number(stroke.width) || 10));
  const padding = Math.max(14, maxStroke * 1.25);
  return {
    x: clamp(minX - padding, 0, STAGE_WIDTH),
    y: clamp(minY - padding, 0, STAGE_HEIGHT),
    right: clamp(maxX + padding, 0, STAGE_WIDTH),
    bottom: clamp(maxY + padding, 0, STAGE_HEIGHT)
  };
}

function shiftDraftToStageCenter(documentState) {
  const draft = clone(documentState || { strokes: [] });
  draft.strokes = Array.isArray(draft.strokes) ? draft.strokes : [];
  const allPoints = draft.strokes.flatMap(stroke => stroke.points || []);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const point of allPoints) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  if (draft.baseRect) {
    minX = Math.min(minX, draft.baseRect.x);
    minY = Math.min(minY, draft.baseRect.y);
    maxX = Math.max(maxX, draft.baseRect.x + draft.baseRect.w);
    maxY = Math.max(maxY, draft.baseRect.y + draft.baseRect.h);
  }
  if (!Number.isFinite(minX)) return draft;
  const dx = STAGE_WIDTH / 2 - (minX + maxX) / 2;
  const dy = STAGE_HEIGHT / 2 - (minY + maxY) / 2;
  draft.strokes = draft.strokes.map(stroke => ({
    ...stroke,
    points: (stroke.points || []).map(point => ({ x: point.x + dx, y: point.y + dy }))
  }));
  if (draft.baseRect) draft.baseRect = { ...draft.baseRect, x: draft.baseRect.x + dx, y: draft.baseRect.y + dy };
  return draft;
}

function startAssetDraft(asset = null) {
  if (assetDraft) cancelAssetDraft(false);
  const category = normalizeAssetCategory(asset?.category || activeLeftCategory || 'Oggetti');
  const sourceDocument = asset?.drawDocument ? shiftDraftToStageCenter(asset.drawDocument) : null;
  let baseImage = sourceDocument?.baseImage || null;
  let baseRect = sourceDocument?.baseRect || null;
  if ((baseImage && !baseRect) || (!sourceDocument && asset?.src)) {
    const w = Math.min(asset?.w || 360, 620);
    const h = Math.min(asset?.h || 360, 520);
    baseImage = baseImage || asset.src;
    baseRect = { x: STAGE_WIDTH / 2 - w / 2, y: STAGE_HEIGHT / 2 - h / 2, w, h };
  }
  assetDraft = {
    editingAsset: asset ? clone(asset) : null,
    name: asset?.name || `Nuovo ${category.toLowerCase()}`,
    category,
    tool: 'draw',
    color: '#171419',
    width: 10,
    baseImage,
    baseRect,
    strokes: sourceDocument?.strokes || []
  };
  assetDraftHistory = [];
  assetDraftFuture = [];
  selection.clear();
  assetDrawToolbar.hidden = false;
  document.body.classList.add('asset-draft-mode');
  document.querySelector('#asset-draft-name').value = assetDraft.name;
  document.querySelector('#asset-draft-category').value = category;
  document.querySelector('#asset-draft-color').value = assetDraft.color;
  document.querySelector('#asset-draft-width').value = String(assetDraft.width);
  document.querySelector('#asset-draft-width-value').value = String(assetDraft.width);
  updateAssetDraftUi();
  renderAll();
  toast(asset ? 'Modifica l’asset direttamente nella scena' : `Disegna nella scena · sezione ${category}`);
}

function cancelAssetDraft(showToast = true) {
  assetDraft = null;
  assetDraftHistory = [];
  assetDraftFuture = [];
  pointerAction = null;
  assetDrawToolbar.hidden = true;
  document.body.classList.remove('asset-draft-mode');
  stage.classList.remove('asset-draft-eraser', 'asset-draft-move');
  renderAll();
  if (showToast) toast('Creazione asset annullata');
}

function setAssetDraftTool(tool) {
  if (!assetDraft) return;
  assetDraft.tool = tool;
  updateAssetDraftUi();
}

function updateAssetDraftUi() {
  if (!assetDraft) return;
  document.querySelectorAll('[data-asset-draft-tool]').forEach(button => button.classList.toggle('is-active', button.dataset.assetDraftTool === assetDraft.tool));
  document.querySelector('#asset-draft-undo').disabled = !assetDraftHistory.length;
  document.querySelector('#asset-draft-redo').disabled = !assetDraftFuture.length;
  stage.classList.toggle('asset-draft-eraser', assetDraft.tool === 'erase');
  stage.classList.toggle('asset-draft-move', assetDraft.tool === 'move');
}

function renderAssetDraftOverlay() {
  stage.querySelector('.asset-draft-layer')?.remove();
  stage.querySelector('#asset-draft-mask')?.remove();
  if (!assetDraft) return;
  const defs = stage.querySelector('defs');
  const mask = svgEl('mask', { id: 'asset-draft-mask', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT });
  mask.appendChild(svgEl('rect', { x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT, fill: '#fff' }));
  for (const stroke of assetDraft.strokes.filter(item => item.mode === 'erase')) {
    mask.appendChild(svgEl('path', {
      d: pointsToPath(stroke.points || []), fill: 'none', stroke: '#000', 'stroke-width': stroke.width || 10,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));
  }
  defs?.appendChild(mask);
  const layer = svgEl('g', { class: 'asset-draft-layer', mask: 'url(#asset-draft-mask)', 'pointer-events': 'none' });
  if (assetDraft.baseImage && assetDraft.baseRect) {
    layer.appendChild(svgEl('image', {
      href: assetDraft.baseImage,
      x: assetDraft.baseRect.x,
      y: assetDraft.baseRect.y,
      width: assetDraft.baseRect.w,
      height: assetDraft.baseRect.h,
      preserveAspectRatio: 'xMidYMid meet',
      opacity: .88
    }));
  }
  for (const stroke of assetDraft.strokes.filter(item => item.mode !== 'erase')) {
    layer.appendChild(svgEl('path', {
      d: pointsToPath(stroke.points || []), fill: 'none', stroke: stroke.color || '#171419', 'stroke-width': stroke.width || 10,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));
  }
  const bounds = assetDraftBounds();
  if (bounds) {
    layer.appendChild(svgEl('rect', {
      x: bounds.x, y: bounds.y, width: Math.max(1, bounds.right - bounds.x), height: Math.max(1, bounds.bottom - bounds.y),
      class: 'asset-draft-bounds', fill: 'none', mask: 'none'
    }));
  }
  stage.appendChild(layer);
}

function beginAssetDraftPointer(event) {
  if (!assetDraft) return false;
  if (![0, 1, 2].includes(event.button)) return true;
  event.preventDefault();
  const point = stagePoint(event);
  const moving = event.button === 1 || (event.button === 0 && assetDraft.tool === 'move');
  assetDraftSnapshot();
  if (moving) {
    pointerAction = {
      type: 'asset-draft-move', pointerId: event.pointerId, start: point,
      originalStrokes: clone(assetDraft.strokes), originalBaseRect: clone(assetDraft.baseRect)
    };
  } else {
    const mode = event.button === 2 || assetDraft.tool === 'erase' ? 'erase' : 'draw';
    const stroke = {
      mode,
      color: document.querySelector('#asset-draft-color').value,
      width: Number(document.querySelector('#asset-draft-width').value),
      points: [point]
    };
    assetDraft.strokes.push(stroke);
    pointerAction = { type: 'asset-draft-stroke', pointerId: event.pointerId, stroke };
  }
  stage.setPointerCapture(event.pointerId);
  renderAssetDraftOverlay();
  return true;
}

function updateAssetDraftPointer(event) {
  if (!assetDraft || !pointerAction || pointerAction.pointerId !== event.pointerId) return false;
  if (!pointerAction.type.startsWith('asset-draft')) return false;
  event.preventDefault();
  const point = stagePoint(event);
  if (pointerAction.type === 'asset-draft-move') {
    const dx = point.x - pointerAction.start.x;
    const dy = point.y - pointerAction.start.y;
    assetDraft.strokes = pointerAction.originalStrokes.map(stroke => ({
      ...stroke,
      points: (stroke.points || []).map(item => ({ x: item.x + dx, y: item.y + dy }))
    }));
    assetDraft.baseRect = pointerAction.originalBaseRect
      ? { ...pointerAction.originalBaseRect, x: pointerAction.originalBaseRect.x + dx, y: pointerAction.originalBaseRect.y + dy }
      : null;
  } else {
    const points = pointerAction.stroke.points;
    const last = points[points.length - 1];
    if (Math.hypot(point.x - last.x, point.y - last.y) > 2.5) points.push(point);
  }
  renderAssetDraftOverlay();
  return true;
}

function endAssetDraftPointer(event) {
  if (!assetDraft || !pointerAction || pointerAction.pointerId !== event.pointerId || !pointerAction.type.startsWith('asset-draft')) return false;
  if (pointerAction.type === 'asset-draft-stroke' && pointerAction.stroke.points.length < 2) {
    assetDraft.strokes = assetDraft.strokes.filter(stroke => stroke !== pointerAction.stroke);
  }
  pointerAction = null;
  try { stage.releasePointerCapture(event.pointerId); } catch { /* già rilasciato */ }
  renderAssetDraftOverlay();
  updateAssetDraftUi();
  return true;
}

function drawCanvasStroke(ctx, stroke) {
  const points = stroke.points || [];
  if (!points.length) return;
  ctx.save();
  ctx.globalCompositeOperation = stroke.mode === 'erase' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = stroke.color || '#171419';
  ctx.lineWidth = stroke.width || 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) ctx.lineTo(points[0].x + .01, points[0].y + .01);
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}

function loadDraftImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function rasterizeAssetDraft() {
  const canvas = document.createElement('canvas');
  canvas.width = STAGE_WIDTH;
  canvas.height = STAGE_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (assetDraft.baseImage && assetDraft.baseRect) {
    try {
      const image = await loadDraftImage(assetDraft.baseImage);
      ctx.drawImage(image, assetDraft.baseRect.x, assetDraft.baseRect.y, assetDraft.baseRect.w, assetDraft.baseRect.h);
    } catch { /* ignora immagine corrotta */ }
  }
  assetDraft.strokes.filter(stroke => stroke.mode !== 'erase').forEach(stroke => drawCanvasStroke(ctx, stroke));
  assetDraft.strokes.filter(stroke => stroke.mode === 'erase').forEach(stroke => drawCanvasStroke(ctx, stroke));
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (data[(y * canvas.width + x) * 4 + 3] > 3) {
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  const padding = 8;
  minX = Math.max(0, minX - padding); minY = Math.max(0, minY - padding);
  maxX = Math.min(canvas.width - 1, maxX + padding); maxY = Math.min(canvas.height - 1, maxY + padding);
  const cropped = document.createElement('canvas');
  cropped.width = maxX - minX + 1;
  cropped.height = maxY - minY + 1;
  cropped.getContext('2d').drawImage(canvas, minX, minY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  return {
    src: cropped.toDataURL('image/png'),
    bounds: { x: minX, y: minY, w: cropped.width, h: cropped.height }
  };
}

async function confirmAssetDraft() {
  if (!assetDraft) return;
  const name = document.querySelector('#asset-draft-name').value.trim();
  if (!name) {
    document.querySelector('#asset-draft-name').focus();
    toast('Dai un nome all’asset');
    return;
  }
  const category = normalizeAssetCategory(document.querySelector('#asset-draft-category').value);
  const rasterized = await rasterizeAssetDraft();
  if (!rasterized) {
    toast('Disegna qualcosa prima di confermare');
    return;
  }
  pushHistory();
  const previous = assetDraft.editingAsset;
  const asset = {
    ...(previous || {}),
    key: previous?.key || uid('custom'),
    name,
    category,
    custom: true,
    sourceType: 'drawn',
    src: rasterized.src,
    w: rasterized.bounds.w,
    h: rasterized.bounds.h,
    drawDocument: {
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      baseImage: assetDraft.baseImage,
      baseRect: clone(assetDraft.baseRect),
      strokes: clone(assetDraft.strokes)
    }
  };
  const existingIndex = project.customAssets.findIndex(item => item.key === asset.key);
  if (existingIndex >= 0) project.customAssets[existingIndex] = asset;
  else project.customAssets.push(asset);
  for (const sceneEntry of project.scenes) {
    for (const object of sceneEntry.scene.objects) {
      if (object.type === 'image' && object.assetKey === asset.key) {
        object.src = asset.src;
        object.name = asset.name;
      }
    }
  }
  if (!previous) {
    const maxZ = currentScene().objects.reduce((max, object) => Math.max(max, object.z || 0), 0);
    const object = {
      id: uid('obj'), type: 'image', assetKey: asset.key, name: asset.name, src: asset.src,
      x: rasterized.bounds.x + rasterized.bounds.w / 2, y: rasterized.bounds.y + rasterized.bounds.h / 2,
      w: rasterized.bounds.w, h: rasterized.bounds.h, rotation: 0, opacity: 1, visible: true, locked: false,
      flipX: false, flipY: false, color: '#171419', accent: '#fbbf24', danger: '#b91c1c', role: null, groupId: null, z: maxZ + 1
    };
    currentScene().objects.push(object);
    selection = new Set([object.id]);
  }
  activeLeftCategory = category;
  assetDraft = null;
  assetDraftHistory = [];
  assetDraftFuture = [];
  assetDrawToolbar.hidden = true;
  document.body.classList.remove('asset-draft-mode');
  stage.classList.remove('asset-draft-eraser', 'asset-draft-move');
  commit({ toast: previous ? 'Asset aggiornato in tutte le scene' : `Asset salvato in ${category}` });
}

function undoAssetDraft() {
  if (!assetDraftHistory.length || !assetDraft) return;
  assetDraftFuture.push(clone({ strokes: assetDraft.strokes, baseImage: assetDraft.baseImage, baseRect: assetDraft.baseRect }));
  const previous = assetDraftHistory.pop();
  assetDraft.strokes = previous.strokes;
  assetDraft.baseImage = previous.baseImage;
  assetDraft.baseRect = previous.baseRect;
  renderAssetDraftOverlay();
  updateAssetDraftUi();
}

function redoAssetDraft() {
  if (!assetDraftFuture.length || !assetDraft) return;
  assetDraftHistory.push(clone({ strokes: assetDraft.strokes, baseImage: assetDraft.baseImage, baseRect: assetDraft.baseRect }));
  const next = assetDraftFuture.pop();
  assetDraft.strokes = next.strokes;
  assetDraft.baseImage = next.baseImage;
  assetDraft.baseRect = next.baseRect;
  renderAssetDraftOverlay();
  updateAssetDraftUi();
}

function moveSelection(dx, dy) {
  const movable = selectedObjects().filter(obj => !obj.locked);
  if (!movable.length) return;
  pushHistory();
  movable.forEach(obj => { obj.x += dx; obj.y += dy; });
  commit();
}

function togglePresentation(force) {
  const active = typeof force === 'boolean' ? force : !document.body.classList.contains('present-mode');
  document.body.classList.toggle('present-mode', active);
  document.querySelector('#exit-present').hidden = !active;
  if (active) toast('Presentazione attiva · Esc per uscire');
}

function openOutput() {
  outputWindow = window.open('./output.html', 'stories-in-swadya-output', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
  setTimeout(sendOutput, 250);
  toast('Output aperto · cattura quella finestra in OBS');
}

async function exportProject() {
  toast('Preparo il progetto con i loop audio…');
  try {
    const portableProject = await musicController.embedAudio(project);
    const blob = new Blob([JSON.stringify(portableProject, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${slug(project.name || 'stories-in-swadya')}.swadya.json`);
    toast('Progetto esportato con gli audio');
  } catch {
    toast('Esportazione non riuscita');
  }
}

function exportSvg() {
  const blob = new Blob([sceneToSvgString(currentScene())], { type: 'image/svg+xml' });
  downloadBlob(blob, `${slug(activeSceneEntry().name)}.svg`);
}

function exportPng() {
  const svgText = sceneToSvgString(currentScene());
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = STAGE_WIDTH;
    canvas.height = STAGE_HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(png => {
      if (png) downloadBlob(png, `${slug(activeSceneEntry().name)}.png`);
    }, 'image/png');
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('Impossibile esportare il PNG'); };
  img.src = url;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function saveCustomAsset(asset, previous = null) {
  pushHistory();
  const previousSrc = previous?.src;
  if (previous?.key) {
    const index = project.customAssets.findIndex(item => item.key === previous.key);
    asset.key = previous.key;
    if (index >= 0) project.customAssets[index] = asset;
    else project.customAssets.push(asset);
  } else {
    asset.key = uid('custom');
    project.customAssets.push(asset);
  }
  for (const sceneEntry of project.scenes) {
    for (const object of sceneEntry.scene.objects) {
      if (object.type === 'image' && (object.assetKey === asset.key || (previousSrc && object.src === previousSrc))) {
        object.assetKey = asset.key;
        object.src = asset.src;
        object.name = asset.name;
      }
    }
  }
  activeLeftCategory = normalizeAssetCategory(asset.category);
  commit({ toast: previous ? 'Asset aggiornato in tutte le scene' : 'Asset creato e salvato' });
}

function deleteCustomAsset(asset) {
  const used = project.scenes.some(sceneEntry => sceneEntry.scene.objects.some(object => object.assetKey === asset.key));
  const message = used
    ? `Eliminare “${asset.name}” dalla libreria? Le copie già presenti nelle scene resteranno.`
    : `Eliminare “${asset.name}” dalla libreria?`;
  if (!window.confirm(message)) return;
  pushHistory();
  project.customAssets = project.customAssets.filter(item => item.key !== asset.key);
  commit({ toast: 'Asset eliminato dalla libreria' });
}

async function importAssets(files) {
  const imageFiles = [...files].filter(file => file.type.startsWith('image/'));
  if (!imageFiles.length) return;
  pushHistory();
  for (const file of imageFiles) {
    const src = await fileToDataUrl(file);
    const dims = await imageDimensions(src);
    project.customAssets.push({
      key: uid('custom'), name: file.name.replace(/\.[^.]+$/, ''), category: activeLeftCategory, src,
      w: dims.width, h: dims.height, custom: true, sourceType: 'imported'
    });
  }
  commit({ toast: `${imageFiles.length} asset importati in ${activeLeftCategory}` });
}

function exportAssetLibrary() {
  const payload = {
    type: 'stories-in-swadya-assets',
    version: 1,
    exportedAt: new Date().toISOString(),
    assets: clone(project.customAssets || [])
  };
  if (!payload.assets.length) {
    toast('La libreria asset è vuota');
    return;
  }
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${slug(project.name)}-assets.swadya-assets.json`);
  toast(`${payload.assets.length} asset esportati`);
}

function importAssetLibraryFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const sourceAssets = Array.isArray(parsed) ? parsed : parsed?.assets;
      if (!Array.isArray(sourceAssets) || !sourceAssets.length) throw new Error('Nessun asset');
      const imported = sourceAssets.filter(asset => asset?.src && asset?.name).map(asset => ({
        ...clone(asset),
        key: uid('custom'),
        category: normalizeAssetCategory(asset.category),
        custom: true
      }));
      if (!imported.length) throw new Error('Formato non valido');
      pushHistory();
      project.customAssets.push(...imported);
      activeLeftCategory = imported[0].category;
      commit({ toast: `${imported.length} asset importati nella libreria` });
    } catch {
      toast('File libreria asset non valido');
    }
  };
  reader.readAsText(file);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function imageDimensions(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 420 / Math.max(img.width, img.height));
      resolve({ width: Math.max(80, img.width * scale), height: Math.max(80, img.height * scale) });
    };
    img.onerror = () => resolve({ width: 300, height: 300 });
    img.src = src;
  });
}

function importProjectFile(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed?.scenes?.length) throw new Error('Formato non valido');
      const next = await musicController.hydrateAudio(parsed);
      pushHistory();
      await musicController.resetForProjectChange();
      project = normalizeProject(next);
      selection.clear();
      commit({ toast: 'Progetto importato con i loop audio' });
    } catch {
      toast('File progetto non valido');
    }
  };
  reader.readAsText(file);
}

async function createNewProject(useDemo = false) {
  const name = document.querySelector('#new-project-name').value.trim() || 'Nuova storia';
  if (assetDraft) {
    assetDraft = null;
    assetDrawToolbar.hidden = true;
    document.body.classList.remove('asset-draft-mode');
    stage.classList.remove('asset-draft-eraser', 'asset-draft-move');
  }
  await musicController.resetForProjectChange();
  pushHistory();
  project = useDemo ? makeDemoProject() : makeBlankProject(name);
  if (useDemo) project.name = name === 'Nuova storia' ? project.name : name;
  selection.clear();
  history = [];
  future = [];
  activeRightTab = 'inspector';
  activeLeftCategory = 'Oggetti';
  newProjectDialog.close();
  commit({ history: false, toast: useDemo ? 'Demo caricata' : 'Nuovo progetto vuoto creato' });
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
const escapeAttr = escapeHtml;
const round = value => Math.round((Number(value) || 0) * 10) / 10;
const slug = value => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'scena';

stage.addEventListener('pointerdown', event => {
  if (assetDraft) { beginAssetDraftPointer(event); return; }
  if (event.button !== 0) return;
  const handle = event.target.closest('.selection-handle');
  if (handle) {
    event.stopPropagation();
    const obj = objectById(handle.dataset.objectId);
    if (handle.classList.contains('rotate-handle')) beginRotate(event, obj);
    else beginResize(event, obj, handle.dataset.handle);
    return;
  }
  const objectEl = event.target.closest('.stage-object');
  if (activeTool === 'draw' && !objectEl) {
    beginDraw(event);
    return;
  }
  if (objectEl) {
    const obj = objectById(objectEl.dataset.objectId);
    if (activeTool === 'draw') return;
    if (event.shiftKey) selectObject(obj.id, { additive: true, ignoreGroup: event.altKey });
    beginMove(event, obj);
  } else if (activeTool === 'select') {
    selection.clear();
    renderAll();
  }
});
stage.addEventListener('pointermove', updatePointerAction);
stage.addEventListener('pointerup', endPointerAction);
stage.addEventListener('pointercancel', endPointerAction);
stage.addEventListener('contextmenu', event => { if (assetDraft) event.preventDefault(); });
stage.addEventListener('dblclick', event => {
  if (assetDraft) return;
  const objectEl = event.target.closest('.stage-object');
  if (!objectEl) return;
  const obj = objectById(objectEl.dataset.objectId);
  selectObject(obj.id, { ignoreGroup: true });
  activeRightTab = 'inspector';
  renderAll();
});

assetGrid.addEventListener('click', event => {
  const card = event.target.closest('[data-asset-key]');
  if (!card) return;
  const key = card.dataset.assetKey;
  const custom = project.customAssets.find(asset => asset.key === key);
  const action = event.target.closest('[data-asset-action]')?.dataset.assetAction || 'spawn';
  if (action === 'edit' && custom) startAssetDraft(custom);
  else if (action === 'delete' && custom) deleteCustomAsset(custom);
  else spawnAsset(key, custom || null);
});
assetGrid.addEventListener('dragstart', event => {
  const card = event.target.closest('[data-asset-key]');
  if (!card) return;
  draggedAssetKey = card.dataset.assetKey;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('text/plain', draggedAssetKey);
  card.classList.add('is-dragging');
});
assetGrid.addEventListener('dragend', event => {
  event.target.closest('[data-asset-key]')?.classList.remove('is-dragging');
  draggedAssetKey = null;
});
stageFrame.addEventListener('dragover', event => {
  if (!draggedAssetKey && !event.dataTransfer.types.includes('text/plain')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  stageFrame.classList.add('is-drop-target');
});
stageFrame.addEventListener('dragleave', event => {
  if (!stageFrame.contains(event.relatedTarget)) stageFrame.classList.remove('is-drop-target');
});
stageFrame.addEventListener('drop', event => {
  event.preventDefault();
  stageFrame.classList.remove('is-drop-target');
  const key = draggedAssetKey || event.dataTransfer.getData('text/plain');
  if (!key) return;
  const custom = project.customAssets.find(asset => asset.key === key);
  spawnAsset(key, custom || null, stagePoint(event));
  draggedAssetKey = null;
});
assetCategoryFilter.addEventListener('change', event => {
  activeLeftCategory = normalizeAssetCategory(event.target.value);
  renderAssets();
});
document.querySelector('#asset-search').addEventListener('input', renderAssets);
document.querySelector('#new-drawn-asset').addEventListener('click', () => startAssetDraft());
document.querySelector('#asset-upload').addEventListener('change', event => { importAssets(event.target.files); event.target.value = ''; });
document.querySelector('#export-assets').addEventListener('click', exportAssetLibrary);
document.querySelector('#assets-import').addEventListener('change', event => { if (event.target.files[0]) importAssetLibraryFile(event.target.files[0]); event.target.value = ''; });
document.querySelector('#project-import').addEventListener('change', event => event.target.files[0] && importProjectFile(event.target.files[0]));
document.querySelector('#export-project').addEventListener('click', exportProject);

document.querySelectorAll('[data-asset-draft-tool]').forEach(button => button.addEventListener('click', () => setAssetDraftTool(button.dataset.assetDraftTool)));
document.querySelector('#asset-draft-color').addEventListener('input', event => { if (assetDraft) assetDraft.color = event.target.value; });
document.querySelector('#asset-draft-width').addEventListener('input', event => {
  document.querySelector('#asset-draft-width-value').value = event.target.value;
  if (assetDraft) assetDraft.width = Number(event.target.value);
});
document.querySelector('#asset-draft-name').addEventListener('input', event => { if (assetDraft) assetDraft.name = event.target.value; });
document.querySelector('#asset-draft-category').addEventListener('change', event => { if (assetDraft) assetDraft.category = normalizeAssetCategory(event.target.value); });
document.querySelector('#asset-draft-undo').addEventListener('click', undoAssetDraft);
document.querySelector('#asset-draft-redo').addEventListener('click', redoAssetDraft);
document.querySelector('#asset-draft-cancel').addEventListener('click', () => cancelAssetDraft());
document.querySelector('#asset-draft-confirm').addEventListener('click', confirmAssetDraft);

document.querySelector('.toolbar').addEventListener('click', event => {
  const tool = event.target.closest('[data-tool]');
  if (tool) setTool(tool.dataset.tool);
});
document.querySelector('#add-text').addEventListener('click', addText);
document.querySelector('#undo').addEventListener('click', undo);
document.querySelector('#redo').addEventListener('click', redo);
document.querySelector('#group').addEventListener('click', groupSelection);
document.querySelector('#ungroup').addEventListener('click', ungroupSelection);
document.querySelector('#open-output').addEventListener('click', openOutput);
document.querySelector('#present').addEventListener('click', () => togglePresentation());
document.querySelector('#exit-present').addEventListener('click', () => togglePresentation(false));
document.querySelector('#help-button').addEventListener('click', () => helpDialog.showModal());
document.querySelector('#close-help').addEventListener('click', () => helpDialog.close());
helpDialog.addEventListener('click', event => { if (event.target === helpDialog) helpDialog.close(); });
document.querySelector('#new-project').addEventListener('click', () => {
  if (assetDraft) cancelAssetDraft(false);
  document.querySelector('#new-project-name').value = 'Nuova storia';
  newProjectDialog.showModal();
  document.querySelector('#new-project-name').select();
});
document.querySelector('#close-new-project').addEventListener('click', () => newProjectDialog.close());
document.querySelector('#create-blank-project').addEventListener('click', () => createNewProject(false));
document.querySelector('#create-demo-project').addEventListener('click', () => createNewProject(true));
newProjectDialog.addEventListener('click', event => { if (event.target === newProjectDialog) newProjectDialog.close(); });

document.querySelector('.right-tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-right-tab]');
  if (!button) return;
  activeRightTab = button.dataset.rightTab;
  renderRightPanel();
});
rightContent.addEventListener('click', event => {
  const layer = event.target.closest('[data-layer-id]');
  if (layer) {
    const id = layer.dataset.layerId;
    const action = event.target.closest('[data-layer-action]')?.dataset.layerAction;
    const obj = objectById(id);
    if (action === 'visibility') { pushHistory(); obj.visible = obj.visible === false; commit(); }
    else if (action === 'lock') { pushHistory(); obj.locked = !obj.locked; commit(); }
    else selectObject(id, { additive: event.shiftKey, ignoreGroup: event.altKey });
    return;
  }
  const sceneCard = event.target.closest('[data-scene-id]');
  if (sceneCard) loadScene(sceneCard.dataset.sceneId);
});

document.querySelector('#project-name').addEventListener('change', event => {
  pushHistory(); project.name = event.target.value.trim() || 'Stories in sWadya'; commit();
});
document.querySelector('#grid-toggle').addEventListener('change', event => {
  project.settings.grid = event.target.checked; commit({ history: false });
});
document.querySelector('#safe-toggle').addEventListener('change', event => {
  project.settings.safeArea = event.target.checked; commit({ history: false });
});

document.addEventListener('keydown', event => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable;
  const key = event.key.toLowerCase();
  if (assetDraft) {
    if (event.key === 'Escape') { event.preventDefault(); cancelAssetDraft(); return; }
    if ((event.ctrlKey || event.metaKey) && key === 'z') { event.preventDefault(); event.shiftKey ? redoAssetDraft() : undoAssetDraft(); return; }
    if ((event.ctrlKey || event.metaKey) && key === 'y') { event.preventDefault(); redoAssetDraft(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); confirmAssetDraft(); return; }
    if (typing) return;
    if (key === 'b') setAssetDraftTool('draw');
    else if (key === 'e') setAssetDraftTool('erase');
    else if (key === 'v') setAssetDraftTool('move');
    return;
  }
  if (typing) return;
  if (event.ctrlKey || event.metaKey) {
    if (key === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
    else if (key === 'y') { event.preventDefault(); redo(); }
    else if (key === 'g') { event.preventDefault(); event.shiftKey ? ungroupSelection() : groupSelection(); }
    else if (key === 'd') { event.preventDefault(); duplicateSelection(); }
    else if (key === 's') { event.preventDefault(); exportProject(); }
    return;
  }
  if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelection(); }
  else if (event.key === 'Escape') { if (document.body.classList.contains('present-mode')) togglePresentation(false); else { selection.clear(); setTool('select'); renderAll(); } }
  else if (event.code === 'Space') { event.preventDefault(); event.shiftKey ? previousScene() : nextScene(); }
  else if (key === 'v') setTool('select');
  else if (key === 'b') setTool('draw');
  else if (key === 'p') togglePresentation();
  else if (key === 'm') musicController.toggleMasterMute();
  else if (key === 'd') toggleRole('dragon', 'dragon');
  else if (key === 't') toggleRole('roof', 'roof');
  else if (key === 'f') toggleRole('fire', 'fire');
  else if (key === '1') selectByRole('hero');
  else if (key === '2') selectByRole('crowd');
  else if (key === '3') selectByRole('dragon');
  else if (event.key === 'ArrowLeft') { event.preventDefault(); moveSelection(event.shiftKey ? -10 : -1, 0); }
  else if (event.key === 'ArrowRight') { event.preventDefault(); moveSelection(event.shiftKey ? 10 : 1, 0); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); moveSelection(0, event.shiftKey ? -10 : -1); }
  else if (event.key === 'ArrowDown') { event.preventDefault(); moveSelection(0, event.shiftKey ? 10 : 1); }
});

window.addEventListener('beforeunload', saveProject);
window.addEventListener('focus', sendOutput);

renderAll();
sendOutput();
setTool('select');
