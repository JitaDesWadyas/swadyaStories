import { installStudioStorageBridge, startStudio } from './studio.js';

installStudioStorageBridge();
await import('./main.js');
startStudio();
