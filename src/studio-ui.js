function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
const escapeAttr = escapeHtml;

function injectStudioUi() {
  const stageColumn = document.querySelector('.stage-column');
  const stageViewport = document.querySelector('#stage-viewport');
  if (!stageColumn || !stageViewport || document.querySelector('#studio-strip')) return;

  const strip = document.createElement('section');
  strip.id = 'studio-strip';
  strip.className = 'studio-strip';
  strip.innerHTML = `
    <div class="studio-scene-jump" aria-label="Scena rapida">
      <button type="button" data-studio-scene-step="-1" title="Scena precedente">‹</button>
      <select id="studio-scene-select" aria-label="Scegli scena"></select>
      <button type="button" data-studio-scene-step="1" title="Scena successiva">›</button>
    </div>
    <div class="studio-layer-switch" aria-label="Livello di lavoro">
      ${LAYERS.map(layer => `<button type="button" data-studio-layer-filter="${layer.id}" title="Clic: filtra · Shift+clic: assegna selezione a ${layer.label}">${layer.label}</button>`).join('')}
    </div>
    <div class="studio-color-tools">
      <div class="studio-target-switch">
        <button type="button" data-color-target="background">Sfondo</button>
        <button type="button" data-color-target="color">Tratto</button>
        <button type="button" data-color-target="accent">Accento</button>
      </div>
      <div id="studio-palette" class="studio-palette"></div>
      <label class="studio-color-picker" title="Colore personalizzato">＋<input id="studio-custom-color" type="color" value="#fbbf24"></label>
    </div>
    <div class="studio-strip-actions">
      <button type="button" id="studio-look-open">Look / FX</button>
      <button type="button" id="studio-new-scene-open" class="is-primary">＋ Scena</button>
      <button type="button" id="studio-shortcuts-open" title="Imposta shortcut">⌨</button>
    </div>`;
  stageColumn.insertBefore(strip, stageViewport);

  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="studio-look-dialog" class="studio-dialog">
      <header><div><strong>Look e profondità</strong><span>Atmosfera scena e resa degli elementi selezionati</span></div><button type="button" data-studio-close>×</button></header>
      <section>
        <div class="studio-section-title">Preset scena</div>
        <div class="studio-look-presets">
          <button type="button" data-look="clean">Pulito</button>
          <button type="button" data-look="paper">Carta</button>
          <button type="button" data-look="cinematic">Cinema</button>
          <button type="button" data-look="night">Notte</button>
          <button type="button" data-look="fire">Fuoco</button>
        </div>
        <div class="studio-field-grid">
          <label>Luce<select id="studio-lighting"><option value="none">Nessuna</option><option value="warm">Calda</option><option value="cool">Fredda</option><option value="fire">Fuoco</option></select></label>
          <label>Texture<select id="studio-texture"><option value="none">Nessuna</option><option value="paper">Carta</option><option value="film">Pellicola</option></select></label>
        </div>
        <label class="studio-range">Intensità luce <output id="studio-light-value"></output><input id="studio-light-intensity" type="range" min="0" max="0.7" step="0.01"></label>
        <label class="studio-range">Grana <output id="studio-grain-value"></output><input id="studio-grain" type="range" min="0" max="0.25" step="0.01"></label>
        <label class="studio-range">Vignetta <output id="studio-vignette-value"></output><input id="studio-vignette" type="range" min="0" max="0.6" step="0.01"></label>
      </section>
      <section>
        <div class="studio-section-title">FX selezione</div>
        <div class="studio-fx-buttons">
          <button type="button" data-studio-fx="none">Nessuno</button>
          <button type="button" data-studio-fx="shadow">Ombra</button>
          <button type="button" data-studio-fx="depth">Profondità</button>
          <button type="button" data-studio-fx="glow">Glow</button>
          <button type="button" data-studio-fx="ink">Inchiostro</button>
        </div>
        <button type="button" id="studio-pin-selection" class="studio-wide-button">Mantieni sempre tra le scene</button>
      </section>
      <footer><span>Il look viene mostrato anche nell’Output OBS.</span><button type="button" data-studio-close class="is-primary">Fatto</button></footer>
    </dialog>

    <dialog id="studio-carry-dialog" class="studio-dialog studio-carry-dialog">
      <header><div><strong>Nuova scena</strong><span>Scegli in due secondi cosa rimane</span></div><button type="button" data-studio-close>×</button></header>
      <section>
        <label class="studio-full-field">Nome<input id="studio-new-scene-name" value="" placeholder="Scena successiva"></label>
        <div class="studio-section-title">Mantieni dalla scena attuale</div>
        <div class="studio-carry-grid">
          ${LAYERS.filter(layer => layer.id !== 'all').map(layer => `<label><input type="checkbox" data-carry-layer="${layer.id}"><span>${layer.label}</span></label>`).join('')}
        </div>
        <label class="studio-check-line"><input id="studio-include-hidden" type="checkbox"> Mantieni anche gli elementi nascosti</label>
        <p>Gli elementi segnati come “Mantieni sempre” vengono copiati comunque.</p>
      </section>
      <footer><button type="button" data-studio-close>Annulla</button><button type="button" id="studio-create-scene" class="is-primary">Crea e apri scena</button></footer>
    </dialog>

    <dialog id="studio-shortcuts-dialog" class="studio-dialog studio-shortcuts-dialog">
      <header><div><strong>Shortcut personali</strong><span>Clicca un campo e premi la combinazione</span></div><button type="button" data-studio-close>×</button></header>
      <section><div id="studio-shortcut-rows"></div><p>Le scorciatoie originali restano disponibili come fallback. I primi sei colori si applicano con Alt+1…Alt+6.</p></section>
      <footer><button type="button" id="studio-reset-shortcuts">Ripristina</button><button type="button" data-studio-close class="is-primary">Fatto</button></footer>
    </dialog>`);
}

function bindStudioUi() {
  document.addEventListener('click', event => {
    const nativeScene = event.target.closest?.('[data-scene-id]');
    if (nativeScene?.dataset.sceneId) activeSceneHint = nativeScene.dataset.sceneId;
  }, true);

  document.querySelector('#studio-strip')?.addEventListener('click', event => {
    const step = event.target.closest('[data-studio-scene-step]');
    if (step) return stepScene(Number(step.dataset.studioSceneStep));

    const layer = event.target.closest('[data-studio-layer-filter]');
    if (layer) {
      if (event.shiftKey && layer.dataset.studioLayerFilter !== 'all') assignSelectionToLayer(layer.dataset.studioLayerFilter);
      else applyLayerFilter(layer.dataset.studioLayerFilter);
      return;
    }

    const target = event.target.closest('[data-color-target]');
    if (target) return setColorTarget(target.dataset.colorTarget);

    const swatch = event.target.closest('[data-studio-color]');
    if (swatch) return applyColor(swatch.dataset.studioColor);
  });

  document.querySelector('#studio-scene-select')?.addEventListener('change', event => loadSceneThroughUi(event.target.value));
  document.querySelector('#studio-custom-color')?.addEventListener('input', event => applyColor(event.target.value));
  document.querySelector('#studio-look-open')?.addEventListener('click', () => openDialog('#studio-look-dialog'));
  document.querySelector('#studio-new-scene-open')?.addEventListener('click', () => {
    const project = readProject();
    const input = document.querySelector('#studio-new-scene-name');
    if (input) input.value = `Scena ${(project?.scenes?.length || 0) + 1}`;
    openDialog('#studio-carry-dialog');
  });
  document.querySelector('#studio-shortcuts-open')?.addEventListener('click', () => {
    renderShortcutRows();
    openDialog('#studio-shortcuts-dialog');
  });

  document.querySelectorAll('[data-studio-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close()));
  document.querySelectorAll('.studio-dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));

  document.querySelectorAll('[data-look]').forEach(button => button.addEventListener('click', () => updateVisual(LOOKS[button.dataset.look] || LOOKS.paper)));
  document.querySelector('#studio-lighting')?.addEventListener('change', event => updateVisual({ lighting: event.target.value }));
  document.querySelector('#studio-texture')?.addEventListener('change', event => updateVisual({ texture: event.target.value }));
  document.querySelector('#studio-light-intensity')?.addEventListener('input', event => updateVisual({ lightIntensity: Number(event.target.value) }));
  document.querySelector('#studio-grain')?.addEventListener('input', event => updateVisual({ grain: Number(event.target.value) }));
  document.querySelector('#studio-vignette')?.addEventListener('input', event => updateVisual({ vignette: Number(event.target.value) }));
  document.querySelectorAll('[data-studio-fx]').forEach(button => button.addEventListener('click', () => applyFxToSelection(button.dataset.studioFx)));
  document.querySelector('#studio-pin-selection')?.addEventListener('click', togglePinSelection);

  document.querySelectorAll('[data-carry-layer]').forEach(input => input.addEventListener('change', () => {
    const meta = readMeta();
    meta.carryLayers = [...document.querySelectorAll('[data-carry-layer]:checked')].map(node => node.dataset.carryLayer);
    writeMeta(meta);
  }));
  document.querySelector('#studio-include-hidden')?.addEventListener('change', event => {
    const meta = readMeta();
    meta.includeHidden = event.target.checked;
    writeMeta(meta);
  });
  document.querySelector('#studio-create-scene')?.addEventListener('click', createSceneFromCarrySettings);

  document.querySelector('#studio-shortcut-rows')?.addEventListener('keydown', event => {
    const input = event.target.closest('[data-shortcut-input]');
    if (!input) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') return input.blur();
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const meta = readMeta();
      meta.shortcuts[input.dataset.shortcutInput] = '';
      writeMeta(meta);
      input.value = '';
      return;
    }
    const combo = normalizeShortcutEvent(event);
    if (!combo || combo.endsWith('+')) return;
    const meta = readMeta();
    meta.shortcuts[input.dataset.shortcutInput] = combo;
    writeMeta(meta);
    input.value = combo;
    input.blur();
  });
  document.querySelector('#studio-reset-shortcuts')?.addEventListener('click', () => {
    const meta = readMeta();
    meta.shortcuts = { ...DEFAULT_META.shortcuts };
    writeMeta(meta);
    renderShortcutRows();
  });
}

function observeStage() {
  const stage = document.querySelector('#stage');
  if (!stage) return;
  stageObserver?.disconnect();
  stageObserver = new MutationObserver(mutations => {
    const meaningful = mutations.some(mutation => [...mutation.addedNodes, ...mutation.removedNodes].some(node => node.nodeType !== 1 || !node.hasAttribute?.('data-studio-runtime')));
    if (meaningful) scheduleStageRefresh();
  });
  stageObserver.observe(stage, { childList: true });
  scheduleStageRefresh();
}

function startStudio() {
  if (studioStarted) return;
  studioStarted = true;
  injectStudioUi();
  bindStudioUi();
  bindShortcutCapture();
  observeStage();
  syncStudioControls();

  document.addEventListener('pointerup', () => setTimeout(syncStudioControls, 0), true);
  document.addEventListener('click', () => {
    setTimeout(syncStudioControls, 0);
    setTimeout(scheduleStageRefresh, 220);
  }, true);
  window.addEventListener('focus', () => { renderSceneSelect(); scheduleStageRefresh(); });
}

window.SwadyaStudio = {
  inferLayer,
  installStudioStorageBridge,
  decorateSvgRuntime,
  startStudio
};
