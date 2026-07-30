function objectLookup() {
  const scene = readOutputScene();
  return new Map((scene?.objects || []).map(obj => [obj.id, obj]));
}

function layerLabel(layer) {
  return LAYERS.find(entry => entry.id === layer)?.label || 'Props';
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2100);
}

function broadcastDecoratedOutput() {
  const scene = readOutputScene();
  if (!scene) return;
  try {
    rawSet(OUTPUT_KEY, JSON.stringify(decorateOutputValue(scene)));
  } catch {
    // Le immagini grandi possono superare localStorage, ma il canale continua a funzionare.
  }
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({ type: 'scene', scene: decorateOutputValue(scene) });
  channel.close();
}

function runtimeSvgElement(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function sceneVisualForActive() {
  const meta = readMeta();
  const sceneId = activeSceneId();
  return { ...DEFAULT_VISUAL, ...(meta.sceneVisuals[sceneId] || {}) };
}

function syncRuntimeVisual(svg, visual) {
  if (!svg) return;
  svg.querySelectorAll('.stage-visual-layer:not([data-studio-runtime])').forEach(node => { node.style.display = 'none'; });

  let under = svg.querySelector('[data-studio-runtime="under"]');
  if (!under) {
    under = runtimeSvgElement('g', { 'data-studio-runtime': 'under', class: 'studio-runtime-visual' });
    const defs = svg.querySelector('defs');
    defs?.after(under);
  }
  under.replaceChildren();

  let over = svg.querySelector('[data-studio-runtime="over"]');
  if (!over) {
    over = runtimeSvgElement('g', { 'data-studio-runtime': 'over', class: 'studio-runtime-visual' });
    const selection = svg.querySelector('.selection-overlay');
    if (selection) svg.insertBefore(over, selection);
    else svg.appendChild(over);
  }
  over.replaceChildren();

  const lighting = ['warm', 'cool', 'fire'].includes(visual.lighting) ? visual.lighting : 'none';
  const lightIntensity = clamp(visual.lightIntensity ?? DEFAULT_VISUAL.lightIntensity, 0, 1);
  if (lighting !== 'none' && lightIntensity > 0) {
    under.appendChild(runtimeSvgElement('rect', {
      x: 0, y: 0, width: 1600, height: 900,
      fill: `url(#studio-light-${lighting})`,
      opacity: lightIntensity,
      'pointer-events': 'none'
    }));
  }

  const grain = clamp(visual.grain ?? DEFAULT_VISUAL.grain, 0, 0.35);
  if (visual.texture !== 'none' && grain > 0) {
    const grainRect = runtimeSvgElement('rect', {
      x: 0, y: 0, width: 1600, height: 900,
      fill: '#ffffff', filter: 'url(#studio-paper)', opacity: grain,
      'pointer-events': 'none'
    });
    grainRect.style.mixBlendMode = visual.texture === 'film' ? 'overlay' : 'multiply';
    over.appendChild(grainRect);
  }

  const vignette = clamp(visual.vignette ?? DEFAULT_VISUAL.vignette, 0, 0.7);
  if (vignette > 0) {
    over.appendChild(runtimeSvgElement('rect', {
      x: 0, y: 0, width: 1600, height: 900,
      fill: 'url(#studio-vignette)', opacity: vignette,
      'pointer-events': 'none'
    }));
  }
}

function decorateSvgRuntime(svg, explicitSceneId = null) {
  if (!svg) return;
  const meta = readMeta();
  const sceneId = explicitSceneId || activeSceneId();
  const background = meta.sceneBackgrounds[sceneId];
  if (background) svg.style.background = background;
  const lookup = objectLookup();

  svg.querySelectorAll('.stage-object[data-object-id]').forEach(node => {
    const id = node.dataset.objectId;
    const obj = lookup.get(id) || {};
    const extra = meta.objectMeta[id] || {};
    const layer = extra.layer || obj.studioLayer || inferLayer(obj);
    const fx = extra.fx ?? obj.fx ?? 'none';
    const color = extra.color || obj.color;
    const accent = extra.accent || obj.accent;

    node.dataset.studioLayer = layer;
    node.dataset.studioFx = fx;
    if (color) {
      node.style.color = color;
      if (obj.type === 'path') node.querySelectorAll('path').forEach(path => path.setAttribute('stroke', color));
      if (obj.type === 'text') node.querySelectorAll('text').forEach(text => text.setAttribute('fill', color));
    }
    if (accent) node.style.setProperty('--asset-accent', accent);
    if (['shadow', 'depth', 'glow', 'ink'].includes(fx)) node.setAttribute('filter', `url(#studio-${fx})`);
    else node.removeAttribute('filter');
    node.classList.toggle('studio-pinned', Boolean(extra.pinned));
  });

  const visual = { ...DEFAULT_VISUAL, ...(meta.sceneVisuals[sceneId] || {}) };
  syncRuntimeVisual(svg, visual);
}

function scheduleStageRefresh() {
  cancelAnimationFrame(refreshFrame);
  refreshFrame = requestAnimationFrame(() => {
    decorateSvgRuntime(document.querySelector('#stage'));
    syncStudioControls();
  });
}

function applyLayerFilter(layer) {
  const meta = readMeta();
  meta.layerFilter = LAYERS.some(entry => entry.id === layer) ? layer : 'all';
  writeMeta(meta);
  document.body.dataset.studioLayerFilter = meta.layerFilter;
  document.querySelectorAll('[data-studio-layer-filter]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.studioLayerFilter === meta.layerFilter);
  });
}

function assignSelectionToLayer(layer) {
  const ids = selectedIds();
  if (!ids.length) return showToast('Seleziona prima uno o più elementi');
  const meta = readMeta();
  ids.forEach(id => {
    meta.objectMeta[id] = { ...(meta.objectMeta[id] || {}), layer };
  });
  writeMeta(meta);
  decorateSvgRuntime(document.querySelector('#stage'));
  broadcastDecoratedOutput();
  showToast(`${ids.length} elementi → ${layerLabel(layer)}`);
}

function applyFxToSelection(fx) {
  const ids = selectedIds();
  if (!ids.length) return showToast('Seleziona gli elementi a cui applicare l’effetto');
  const meta = readMeta();
  ids.forEach(id => {
    meta.objectMeta[id] = { ...(meta.objectMeta[id] || {}), fx };
  });
  writeMeta(meta);
  decorateSvgRuntime(document.querySelector('#stage'));
  broadcastDecoratedOutput();
  syncStudioControls();
  showToast(fx === 'none' ? 'Effetto rimosso' : `Effetto ${fx} applicato`);
}

function togglePinSelection() {
  const ids = selectedIds();
  if (!ids.length) return showToast('Seleziona gli elementi da mantenere sempre');
  const meta = readMeta();
  const allPinned = ids.every(id => meta.objectMeta[id]?.pinned);
  ids.forEach(id => {
    meta.objectMeta[id] = { ...(meta.objectMeta[id] || {}), pinned: !allPinned };
  });
  writeMeta(meta);
  decorateSvgRuntime(document.querySelector('#stage'));
  syncStudioControls();
  showToast(allPinned ? 'Elementi non più fissi' : 'Elementi fissati tra le scene');
}

function updateRecentColor(meta, color) {
  meta.recent = [color, ...meta.recent.filter(item => item !== color)].slice(0, 6);
}

function applyColor(color) {
  const value = normalizeHex(color);
  const meta = readMeta();
  updateRecentColor(meta, value);
  const target = meta.colorTarget || 'color';
  const sceneId = activeSceneId();

  if (target === 'background') {
    meta.sceneBackgrounds[sceneId] = value;
    writeMeta(meta);
    const stage = document.querySelector('#stage');
    if (stage) stage.style.background = value;
    const output = readOutputScene();
    if (output) {
      output.background = value;
      rawSet(OUTPUT_KEY, JSON.stringify(output));
    }
    broadcastDecoratedOutput();
    showToast(`Sfondo ${value}`);
  } else {
    const ids = selectedIds();
    if (!ids.length) return showToast('Seleziona un elemento oppure usa “Sfondo”');
    ids.forEach(id => {
      meta.objectMeta[id] = { ...(meta.objectMeta[id] || {}), [target]: value };
    });
    writeMeta(meta);
    decorateSvgRuntime(document.querySelector('#stage'));
    broadcastDecoratedOutput();
    showToast(`${target === 'accent' ? 'Accento' : 'Tratto'} ${value}`);
  }

  renderPalette();
}
