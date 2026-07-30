const { installStudioStorageBridge, startStudio } = window.SwadyaStudio;

installStudioStorageBridge();
await import('./main.js');

// Il progetto demo originale vive inizialmente solo nella memoria di main.js.
// Un commit innocuo lo rende subito disponibile alla barra Studio senza toccare la scena.
if (!window.localStorage.getItem('stories-in-swadya-project-v1')) {
  document.querySelector('#grid-toggle')?.dispatchEvent(new Event('change', { bubbles: true }));
}

startStudio();
setTimeout(() => window.dispatchEvent(new Event('focus')), 240);
