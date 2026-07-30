const DB_NAME = 'stories-in-swadya-audio';
const STORE_NAME = 'loops';
const DB_VERSION = 1;
const clone = value => JSON.parse(JSON.stringify(value));
const memoryStore = new Map();
let dbUnavailable = false;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbPut(key, value) {
  if (dbUnavailable) {
    memoryStore.set(key, value);
    return;
  }
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    dbUnavailable = true;
    memoryStore.set(key, value);
  }
}

async function dbGet(key) {
  if (memoryStore.has(key)) return memoryStore.get(key);
  if (dbUnavailable) return null;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    dbUnavailable = true;
    return memoryStore.get(key) || null;
  }
}

async function dbDelete(key) {
  memoryStore.delete(key);
  if (dbUnavailable) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    dbUnavailable = true;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, payload] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

export class MusicController {
  constructor({ getProject, onCommit, onSave, onToast, uid }) {
    this.getProject = getProject;
    this.onCommit = onCommit;
    this.onSave = onSave;
    this.onToast = onToast;
    this.uid = uid;
    this.context = null;
    this.masterGain = null;
    this.buffers = new Map();
    this.nodes = new Map();
    this.playing = false;
    this.startTime = 0;
    this.beatOffset = 0;
    this.raf = null;
    this.panel = null;
  }

  ensureProject() {
    const project = this.getProject();
    if (!project.music) project.music = { bpm: 118, masterVolume: 0.9, masterMuted: false, tracks: [] };
    project.music.bpm = clamp(Number(project.music.bpm) || 118, 40, 240);
    project.music.masterVolume = clamp(Number(project.music.masterVolume ?? 0.9), 0, 1);
    project.music.masterMuted = Boolean(project.music.masterMuted);
    if (!Array.isArray(project.music.tracks)) project.music.tracks = [];
    project.music.tracks.forEach(track => {
      track.sourceBpm = clamp(Number(track.sourceBpm) || project.music.bpm, 40, 240);
      track.bars = clamp(Number(track.bars) || 4, 1, 64);
      track.volume = clamp(Number(track.volume ?? 0.85), 0, 1);
      track.muted = Boolean(track.muted);
    });
    return project.music;
  }

  async ensureContext() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio non supportato');
      this.context = new AudioContextClass();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    this.updateMasterGain();
    return this.context;
  }

  updateMasterGain() {
    if (!this.masterGain || !this.context) return;
    const music = this.ensureProject();
    const value = music.masterMuted ? 0 : music.masterVolume;
    this.masterGain.gain.setTargetAtTime(value, this.context.currentTime, 0.015);
  }

  currentBeat() {
    const bpm = this.ensureProject().bpm;
    if (!this.playing || !this.context) return this.beatOffset;
    return this.beatOffset + Math.max(0, this.context.currentTime - this.startTime) * bpm / 60;
  }

  async loadBuffer(track) {
    if (this.buffers.has(track.id)) return this.buffers.get(track.id);
    const blob = await dbGet(track.storageKey);
    if (!blob) throw new Error(`File audio mancante: ${track.name}`);
    const context = await this.ensureContext();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
    this.buffers.set(track.id, buffer);
    return buffer;
  }

  stopNodes() {
    this.nodes.forEach(runtime => {
      try { runtime.source.stop(); } catch { /* già fermo */ }
      try { runtime.source.disconnect(); } catch { /* ignore */ }
      try { runtime.gain.disconnect(); } catch { /* ignore */ }
    });
    this.nodes.clear();
  }

  async createNode(track, when, beat) {
    const buffer = await this.loadBuffer(track);
    const context = await this.ensureContext();
    const music = this.ensureProject();
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = music.bpm / track.sourceBpm;
    const wantedLoopEnd = track.bars * 4 * 60 / track.sourceBpm;
    source.loopStart = 0;
    source.loopEnd = Math.max(0.05, Math.min(buffer.duration, wantedLoopEnd || buffer.duration));
    gain.gain.value = track.muted ? 0 : track.volume;
    source.connect(gain);
    gain.connect(this.masterGain);
    const offset = (beat * 60 / track.sourceBpm) % source.loopEnd;
    source.start(when, Math.max(0, offset));
    this.nodes.set(track.id, { source, gain, buffer });
  }

  async startAtBeat(beat) {
    const music = this.ensureProject();
    if (!music.tracks.length) {
      this.onToast('Aggiungi almeno un loop');
      return;
    }
    const context = await this.ensureContext();
    this.stopNodes();
    const loaded = await Promise.allSettled(music.tracks.map(track => this.loadBuffer(track)));
    const availableTracks = music.tracks.filter((track, index) => loaded[index].status === 'fulfilled');
    if (!availableTracks.length) {
      this.onToast('Non riesco a leggere i file audio');
      this.playing = false;
      return;
    }
    const when = context.currentTime + 0.12;
    await Promise.all(availableTracks.map(track => this.createNode(track, when, beat)));
    this.beatOffset = beat;
    this.startTime = when;
    this.playing = true;
    this.startUiTicker();
    this.updateTransportUi();
  }

  async playPause() {
    if (this.playing) {
      this.pause();
      return;
    }
    await this.startAtBeat(this.beatOffset);
  }

  pause() {
    if (!this.playing) return;
    this.beatOffset = this.currentBeat();
    this.playing = false;
    this.stopNodes();
    this.updateTransportUi();
  }

  stop() {
    this.playing = false;
    this.beatOffset = 0;
    this.stopNodes();
    this.updateTransportUi();
  }

  async restartPreservingBeat() {
    if (!this.playing) return;
    const beat = this.currentBeat();
    this.playing = false;
    this.stopNodes();
    await this.startAtBeat(beat);
  }

  setTrackGain(track) {
    const node = this.nodes.get(track.id);
    if (!node || !this.context) return;
    node.gain.gain.setTargetAtTime(track.muted ? 0 : track.volume, this.context.currentTime, 0.012);
  }

  toggleMasterMute() {
    const music = this.ensureProject();
    music.masterMuted = !music.masterMuted;
    this.updateMasterGain();
    this.onSave();
    this.render(this.panel);
    this.onToast(music.masterMuted ? 'Musica muta, trasporto ancora attivo' : 'Musica riattivata in sincrono');
  }

  async importFiles(files) {
    const audioFiles = [...files].filter(file => file.type.startsWith('audio/'));
    if (!audioFiles.length) return;
    const music = this.ensureProject();
    await this.ensureContext();
    for (const file of audioFiles) {
      const id = this.uid('track');
      const storageKey = `${id}-${file.name}`;
      await dbPut(storageKey, file);
      const track = {
        id,
        storageKey,
        name: file.name.replace(/\.[^.]+$/, ''),
        filename: file.name,
        sourceBpm: music.bpm,
        bars: 4,
        volume: 0.85,
        muted: false
      };
      try {
        const buffer = await this.loadBuffer(track);
        const estimatedBars = Math.max(1, Math.round(buffer.duration * track.sourceBpm / 60 / 4));
        track.bars = clamp(estimatedBars, 1, 64);
      } catch {
        // Il file resta importato: il browser potrebbe decodificarlo al play.
      }
      music.tracks.push(track);
    }
    this.onCommit({ toast: `${audioFiles.length} loop aggiunti` });
    if (this.playing) await this.restartPreservingBeat();
  }

  async deleteTrack(trackId) {
    const music = this.ensureProject();
    const track = music.tracks.find(item => item.id === trackId);
    if (!track) return;
    const runtime = this.nodes.get(trackId);
    if (runtime) {
      try { runtime.source.stop(); } catch { /* ignore */ }
      this.nodes.delete(trackId);
    }
    this.buffers.delete(trackId);
    await dbDelete(track.storageKey);
    music.tracks = music.tracks.filter(item => item.id !== trackId);
    this.onCommit({ toast: 'Loop rimosso' });
  }

  startUiTicker() {
    cancelAnimationFrame(this.raf);
    const tick = () => {
      this.updateTransportUi();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  updateTransportUi() {
    const beat = Math.max(0, this.currentBeat());
    const beatInBar = Math.floor(beat % 4) + 1;
    const bar = Math.floor(beat / 4) + 1;
    const display = this.panel?.isConnected ? this.panel.querySelector('#music-beat-display') : null;
    const play = this.panel?.isConnected ? this.panel.querySelector('#music-play') : null;
    const status = this.panel?.isConnected ? this.panel.querySelector('#music-status') : null;
    if (display) display.textContent = `Battuta ${bar} · ${beatInBar}/4`;
    if (play) play.textContent = this.playing ? '❚❚ Pausa' : '▶ Avvia';
    if (status) status.classList.toggle('is-playing', this.playing);
    const globalStatus = document.querySelector('#status-music');
    if (globalStatus) globalStatus.textContent = this.playing
      ? `♫ ${this.ensureProject().bpm} BPM · battuta ${bar}`
      : `♫ ${this.ensureProject().bpm} BPM · fermo`;
    if (this.panel?.isConnected) this.panel.querySelectorAll('[data-beat-dot]').forEach((dot, index) => dot.classList.toggle('is-active', index + 1 === beatInBar && this.playing));
  }

  render(container) {
    if (!container) return;
    this.panel = container;
    const music = this.ensureProject();
    container.innerHTML = `
      <section class="music-transport">
        <div class="music-transport-top">
          <span id="music-status" class="music-status ${this.playing ? 'is-playing' : ''}"></span>
          <strong id="music-beat-display">Battuta 1 · 1/4</strong>
          <button id="music-master-mute" class="plain-button">${music.masterMuted ? '🔇 Riattiva' : '🔊 Master'}</button>
        </div>
        <div class="music-beat-dots">${[1, 2, 3, 4].map(value => `<span data-beat-dot="${value}"></span>`).join('')}</div>
        <div class="music-transport-buttons">
          <button id="music-play" class="primary-button">${this.playing ? '❚❚ Pausa' : '▶ Avvia'}</button>
          <button id="music-stop" class="secondary-button">■ Stop</button>
        </div>
        <div class="music-global-controls">
          <label class="field-label">BPM progetto<input id="music-bpm" type="number" min="40" max="240" value="${music.bpm}"></label>
          <label class="field-label">Volume master<input id="music-master-volume" type="range" min="0" max="100" value="${Math.round(music.masterVolume * 100)}"></label>
        </div>
        <label class="primary-button music-add-loop">＋ Aggiungi loop<input id="music-file-input" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac" multiple hidden></label>
        <p class="muted-copy">I loop partono sullo stesso trasporto. Mutare un loop abbassa solo il volume: il file continua a scorrere e rientra in battuta.</p>
      </section>
      <section class="music-track-list">
        ${music.tracks.length ? music.tracks.map(track => `
          <article class="music-track" data-track-id="${track.id}">
            <div class="music-track-head">
              <div><strong>${escapeHtml(track.name)}</strong><small>${escapeHtml(track.filename || 'loop audio')}</small></div>
              <div class="music-track-actions">
                <button class="track-mute ${track.muted ? 'is-muted' : ''}" data-track-action="mute" title="Muta senza fermare">${track.muted ? '🔇' : '🔊'}</button>
                <button class="track-delete" data-track-action="delete" title="Elimina">×</button>
              </div>
            </div>
            <div class="music-track-grid">
              <label>BPM sorgente<input data-track-field="sourceBpm" type="number" min="40" max="240" value="${track.sourceBpm}"></label>
              <label>Battute<input data-track-field="bars" type="number" min="1" max="64" value="${track.bars}"></label>
            </div>
            <label class="music-volume">Volume <input data-track-field="volume" type="range" min="0" max="100" value="${Math.round(track.volume * 100)}"></label>
          </article>`).join('') : '<div class="music-empty"><strong>Nessun loop</strong><span>Importa basi, batteria, basso o atmosfera. Imposta per ogni file il BPM originale e il numero di battute.</span></div>'}
      </section>`;

    container.querySelector('#music-play').addEventListener('click', () => this.playPause());
    container.querySelector('#music-stop').addEventListener('click', () => this.stop());
    container.querySelector('#music-master-mute').addEventListener('click', () => this.toggleMasterMute());
    container.querySelector('#music-file-input').addEventListener('change', event => this.importFiles(event.target.files));
    container.querySelector('#music-bpm').addEventListener('change', async event => {
      const beat = this.currentBeat();
      const wasPlaying = this.playing;
      music.bpm = clamp(Number(event.target.value) || 118, 40, 240);
      event.target.value = music.bpm;
      this.onSave();
      if (wasPlaying) {
        this.playing = false;
        this.stopNodes();
        await this.startAtBeat(beat);
      }
      this.updateTransportUi();
    });
    container.querySelector('#music-master-volume').addEventListener('input', event => {
      music.masterVolume = clamp(Number(event.target.value) / 100, 0, 1);
      this.updateMasterGain();
      this.onSave();
    });

    container.querySelectorAll('[data-track-id]').forEach(row => {
      const track = music.tracks.find(item => item.id === row.dataset.trackId);
      row.querySelector('[data-track-action="mute"]').addEventListener('click', () => {
        track.muted = !track.muted;
        this.setTrackGain(track);
        this.onSave();
        this.render(container);
      });
      row.querySelector('[data-track-action="delete"]').addEventListener('click', () => this.deleteTrack(track.id));
      row.querySelector('[data-track-field="volume"]').addEventListener('input', event => {
        track.volume = clamp(Number(event.target.value) / 100, 0, 1);
        this.setTrackGain(track);
        this.onSave();
      });
      ['sourceBpm', 'bars'].forEach(field => {
        row.querySelector(`[data-track-field="${field}"]`).addEventListener('change', async event => {
          track[field] = field === 'sourceBpm'
            ? clamp(Number(event.target.value) || music.bpm, 40, 240)
            : clamp(Number(event.target.value) || 4, 1, 64);
          event.target.value = track[field];
          this.onSave();
          await this.restartPreservingBeat();
        });
      });
    });
    this.updateTransportUi();
  }

  async embedAudio(projectCopy) {
    const copy = clone(projectCopy);
    const tracks = copy.music?.tracks || [];
    for (const track of tracks) {
      const blob = await dbGet(track.storageKey);
      if (blob) track.embeddedAudio = await fileToDataUrl(blob);
    }
    return copy;
  }

  async hydrateAudio(projectData) {
    const project = clone(projectData);
    for (const track of project.music?.tracks || []) {
      if (track.embeddedAudio) {
        const blob = dataUrlToBlob(track.embeddedAudio);
        track.storageKey = track.storageKey || `${track.id}-${track.filename || 'loop'}`;
        await dbPut(track.storageKey, blob);
        delete track.embeddedAudio;
      }
    }
    return project;
  }

  async resetForProjectChange() {
    this.stop();
    this.buffers.clear();
  }
}
