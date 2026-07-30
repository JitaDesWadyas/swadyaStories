const { installStudioStorageBridge, startStudio } = window.SwadyaStudio;

installStudioStorageBridge();
await import('./main.js');
startStudio();
