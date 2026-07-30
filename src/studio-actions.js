function setColorTarget(target) {
  const meta = readMeta();
  meta.colorTarget = ['background', 'color', 'accent'].includes(target) ? target : 'color';
  writeMeta(meta);
  document.querySelectorAll('[data-color-target]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.colorTarget === meta.colorTarget);
  });
}

function renderPalette() {
  const container = document.querySelector('#studio-palette');
  if (!container) return;
  const meta = readMeta();
  const colors = [...meta.palette, ...meta.recent.filter(color => !meta.palette.includes(color))].slice(0, 9);
  container.innerHTML = colors.map((color, index) => `
    <button type="button" class="studio-swatch" data-studio-color="${color}" style="--studio-swatch:${color}" title="${color}${index < 6 ? ` · Alt+${index + 1}` : ''}"></button>
  `).join('');
}

function updateVisual(patch) {
  const sceneId = activeSceneId();
  if (!sceneId) return;
  const meta = readMeta();
  meta.sceneVisuals[sceneId] = { ...DEFAULT_VISUAL, ...(meta.sceneVisuals[sceneId] || {}), ...patch };
  writeMeta(meta);
  decorateSvgRuntime(document.querySelector('#stage'));
  broadcastDecoratedOutput();
  syncStudioControls();
}

function currentVisual() {
  const meta = readMeta();
  return { ...DEFAULT_VISUAL, ...(meta.sceneVisuals[activeSceneId()] || {}) };
}

function openDialog(id) {
  const dialog = document.querySelector(id);
  if (!dialog) return;
  syncStudioControls();
  dialog.showModal();
}

function sceneProjectSnapshot() {
  const project = readProject();
  if (!project?.scenes?.length) return null;
  if (activeSceneHint && project.scenes.some(entry => entry.id === activeSceneHint)) project.activeSceneId = activeSceneHint;
  const currentOutput = readOutputScene();
  const active = project.scenes.find(entry => entry.id === project.activeSceneId);
  if (active && currentOutput) active.scene = currentOutput;
  return project;
}

function createSceneFromCarrySettings() {
  const project = sceneProjectSnapshot();
  if (!project) return showToast('Progetto non disponibile');
  const meta = readMeta();
  const source = project.scenes.find(entry => entry.id === project.activeSceneId) || project.scenes[0];
  const keep = new Set(meta.carryLayers || []);
  const includeHidden = Boolean(meta.includeHidden);
  const nameInput = document.querySelector('#studio-new-scene-name');
  const id = `scene-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const objects = (source.scene.objects || []).filter(obj => {
    const objectMeta = meta.objectMeta[obj.id] || {};
    if (objectMeta.pinned) return includeHidden || obj.visible !== false;
    const layer = objectMeta.layer || obj.studioLayer || inferLayer(obj);
    return keep.has(layer) && (includeHidden || obj.visible !== false);
  }).map(obj => clone(obj));

  const entry = {
    id,
    name: nameInput?.value.trim() || `Scena ${project.scenes.length + 1}`,
    scene: {
      ...clone(source.scene),
      objects,
      visual: { ...currentVisual() }
    }
  };
  const index = project.scenes.findIndex(scene => scene.id === source.id);
  project.scenes.splice(index + 1, 0, entry);
  project.activeSceneId = id;
  meta.sceneVisuals[id] = { ...currentVisual() };
  if (meta.sceneBackgrounds[source.id]) meta.sceneBackgrounds[id] = meta.sceneBackgrounds[source.id];
  writeMeta(meta);
  rawSet(PROJECT_KEY, JSON.stringify(decorateProjectValue(project, meta)));
  rawSet(OUTPUT_KEY, JSON.stringify(decorateScene(entry.scene, id, meta)));
  window.location.reload();
}

function renderSceneSelect() {
  const select = document.querySelector('#studio-scene-select');
  if (!select) return;
  const project = readProject();
  if (!project?.scenes?.length) return;
  const signature = project.scenes.map(scene => `${scene.id}:${scene.name}`).join('|');
  if (select.dataset.signature !== signature) {
    select.dataset.signature = signature;
    select.innerHTML = project.scenes.map((scene, index) => `<option value="${scene.id}">${String(index + 1).padStart(2, '0')} · ${escapeHtml(scene.name)}</option>`).join('');
  }
  select.value = activeSceneHint || project.activeSceneId;
}

function loadSceneThroughUi(sceneId) {
  activeSceneHint = sceneId;
  const scenesTab = document.querySelector('[data-right-tab="scenes"]');
  if (!scenesTab) return;
  scenesTab.click();
  requestAnimationFrame(() => {
    document.querySelector(`[data-scene-id="${CSS.escape(sceneId)}"]`)?.click();
    setTimeout(scheduleStageRefresh, 40);
  });
}

function stepScene(delta) {
  const project = readProject();
  if (!project?.scenes?.length) return;
  const currentId = activeSceneHint || project.activeSceneId;
  const index = project.scenes.findIndex(scene => scene.id === currentId);
  const next = project.scenes[(index + delta + project.scenes.length) % project.scenes.length];
  loadSceneThroughUi(next.id);
}

function normalizeShortcutEvent(event) {
  const modifiers = [];
  if (event.ctrlKey) modifiers.push('ctrl');
  if (event.altKey) modifiers.push('alt');
  if (event.shiftKey) modifiers.push('shift');
  if (event.metaKey) modifiers.push('meta');
  const key = event.code === 'Space' ? 'space' : String(event.key || '').toLowerCase();
  if (['control', 'alt', 'shift', 'meta'].includes(key)) return modifiers.join('+');
  return [...modifiers, key].filter(Boolean).join('+');
}

function runShortcut(action) {
  if (action === 'select') document.querySelector('[data-tool="select"]')?.click();
  else if (action === 'draw') document.querySelector('[data-tool="draw"]')?.click();
  else if (action === 'next') stepScene(1);
  else if (action === 'previous') stepScene(-1);
  else if (action === 'presentation') document.querySelector('#present')?.click();
  else if (action === 'layers') document.querySelector('[data-right-tab="layers"]')?.click();
  else if (action === 'scenes') document.querySelector('[data-right-tab="scenes"]')?.click();
  else if (action === 'studio') openDialog('#studio-look-dialog');
  else if (action === 'newScene') openDialog('#studio-carry-dialog');
}

function bindShortcutCapture() {
  document.addEventListener('keydown', event => {
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable;
    if (typing || event.repeat) return;
    const combo = normalizeShortcutEvent(event);
    const shortcuts = readMeta().shortcuts;
    const action = Object.entries(shortcuts).find(([, value]) => value === combo)?.[0];
    if (!action) {
      if (event.altKey && !event.ctrlKey && !event.metaKey && /^Digit[1-6]$/.test(event.code)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const index = Number(event.code.slice(-1)) - 1;
        const color = readMeta().palette[index];
        if (color) applyColor(color);
      }
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    runShortcut(action);
  }, true);
}

function renderShortcutRows() {
  const container = document.querySelector('#studio-shortcut-rows');
  if (!container) return;
  const labels = {
    select: 'Selezione', draw: 'Disegno', next: 'Scena successiva', previous: 'Scena precedente',
    presentation: 'Presentazione', layers: 'Pannello livelli', scenes: 'Pannello scene', studio: 'Look / FX', newScene: 'Nuova scena guidata'
  };
  const shortcuts = readMeta().shortcuts;
  container.innerHTML = Object.entries(labels).map(([action, label]) => `
    <label class="studio-shortcut-row"><span>${label}</span><input readonly data-shortcut-input="${action}" value="${escapeAttr(shortcuts[action] || '')}" aria-label="Shortcut ${label}"></label>
  `).join('');
}

function syncStudioControls() {
  const meta = readMeta();
  document.body.dataset.studioLayerFilter = meta.layerFilter || 'all';
  document.querySelectorAll('[data-studio-layer-filter]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.studioLayerFilter === (meta.layerFilter || 'all'));
  });
  document.querySelectorAll('[data-color-target]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.colorTarget === (meta.colorTarget || 'color'));
  });

  const visual = currentVisual();
  const lighting = document.querySelector('#studio-lighting');
  const texture = document.querySelector('#studio-texture');
  const light = document.querySelector('#studio-light-intensity');
  const grain = document.querySelector('#studio-grain');
  const vignette = document.querySelector('#studio-vignette');
  if (lighting) lighting.value = visual.lighting;
  if (texture) texture.value = visual.texture;
  if (light) light.value = String(visual.lightIntensity);
  if (grain) grain.value = String(visual.grain);
  if (vignette) vignette.value = String(visual.vignette);
  document.querySelector('#studio-light-value')?.replaceChildren(document.createTextNode(`${Math.round(visual.lightIntensity * 100)}%`));
  document.querySelector('#studio-grain-value')?.replaceChildren(document.createTextNode(`${Math.round(visual.grain * 100)}%`));
  document.querySelector('#studio-vignette-value')?.replaceChildren(document.createTextNode(`${Math.round(visual.vignette * 100)}%`));

  document.querySelectorAll('[data-carry-layer]').forEach(input => { input.checked = meta.carryLayers.includes(input.dataset.carryLayer); });
  const hidden = document.querySelector('#studio-include-hidden');
  if (hidden) hidden.checked = Boolean(meta.includeHidden);

  const ids = selectedIds();
  const pin = document.querySelector('#studio-pin-selection');
  if (pin) {
    pin.disabled = !ids.length;
    pin.classList.toggle('is-active', ids.length > 0 && ids.every(id => meta.objectMeta[id]?.pinned));
  }
  renderSceneSelect();
  renderPalette();
}
