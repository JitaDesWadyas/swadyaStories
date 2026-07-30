import { startStudioOutput } from './studio-output.js';

window.SwadyaStudio.installStudioStorageBridge();
await import('./output.js');
startStudioOutput();
