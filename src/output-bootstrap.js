import { installStudioStorageBridge } from './studio.js';
import { startStudioOutput } from './studio-output.js';

installStudioStorageBridge();
await import('./output.js');
startStudioOutput();
