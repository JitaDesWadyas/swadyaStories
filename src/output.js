import { renderScene } from './render.js';

const stage = document.querySelector('#output-stage');
const empty = document.querySelector('#output-empty');
const channel = new BroadcastChannel('stories-in-swadya-output');

function showScene(scene) {
  if (!scene) return;
  renderScene(stage, scene, { interactive: false, showGrid: false });
  empty.hidden = true;
  stage.hidden = false;
}

channel.addEventListener('message', event => {
  if (event.data?.type === 'scene') showScene(event.data.scene);
});

channel.postMessage({ type: 'request-scene' });

try {
  const cached = JSON.parse(localStorage.getItem('stories-in-swadya-output') || 'null');
  if (cached) showScene(cached);
} catch {
  // L'editor invierà la scena al prossimo aggiornamento.
}
