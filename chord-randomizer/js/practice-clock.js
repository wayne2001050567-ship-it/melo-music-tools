/* One owned animation loop. AudioContext remains the clock for metronome sessions.
   BPM sessions share one clock for count-in, preview, tempo and practice duration. */
class PracticeClock {
  constructor({ onUpdate, onStop, audioFactory, now = () => performance.now() / 1000 }) {
    this.onUpdate = onUpdate;
    this.onStop = onStop;
    this.audioFactory = audioFactory;
    this.now = now;
    this.status = "idle";
    this.generation = 0;
    this.frame = null;
    this.audio = null;
    this.voices = new Set();
    this.pending = [];
    this.data = null;
  }

  clockNow() { return this.data?.kind === "bpm" ? (this.audio?.currentTime ?? this.now()) : this.now(); }
  elapsed() {
    if (!this.data) return 0;
    const now = ["paused", "resuming"].includes(this.status) ? this.pausedAt : this.clockNow();
    return Math.max(0, now - this.origin - this.pausedTotal);
  }

  async start(config) {
    if (["starting", "running", "resuming"].includes(this.status)) return false;
    this.cancelFrame();
    this.cancelVoices();
    const generation = ++this.generation;
    this.status = "starting";
    this.data = { ...config };
    this.origin = undefined;
    this.lastElapsed = 0;
    this.pending = [];
    this.pendingBpm = null;
    this.pendingSeconds = null;
    this.currentChord = "—";
    this.beat = 0;
    this.scheduledChord = undefined;
    this.scheduledNextChord = undefined;
    this.previewChord = "—";
    this.countInBeat = 0;
    this.scheduledCountIn = 0;
    this.practiceStartedAt = config.kind === "bpm" ? null : 0;
    this.scheduledBeat = 0;
    this.currentBpm = config.bpm;
    this.baseBpm = config.bpm;
    this.accelerationAnchor = 0;
    this.chordSeconds = config.seconds;
    this.chordStarted = 0;
    this.frozenElapsed = 0;
    this.pausedTotal = 0;
    if (config.kind === "bpm") {
      try {
        if (!this.audio) this.audio = this.audioFactory();
        await this.audio.resume();
        if (generation !== this.generation) return false;
        if (this.audio.state !== "running") throw new Error("Audio unavailable");
      } catch (_) {
        if (generation === this.generation) this.stop("無法啟動音訊，請再試一次。");
        return false;
      }
    }
    if (generation !== this.generation) return false;
    this.origin = this.clockNow();
    this.beatOrigin = config.kind === "bpm" ? .08 : 0;
    this.nextBeat = this.beatOrigin;
    this.nextChord = config.seconds;
    this.status = "running";
    if (config.kind !== "bpm") this.currentChord = config.firstChord;
    else {
      this.currentChord = this.scheduledChord = config.pickChord();
      this.previewChord = this.scheduledNextChord = config.pickChord(this.currentChord);
    }
    this.tick();
    return true;
  }

  cancelFrame() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  cancelVoices() {
    this.voices.forEach(voice => { try { voice.stop(); } catch (_) {} });
    this.voices.clear();
    this.pending.forEach(event => { event.sounded = false; });
  }

  scheduleClick(event, elapsed) {
    if (event.sounded) return;
    event.sounded = true;
    if (!this.data.sound()) return;
    const time = this.audio.currentTime + Math.max(0, event.time - elapsed);
    const voice = this.audio.createOscillator();
    const gain = this.audio.createGain();
    voice.frequency.value = event.beat === 1 ? 1200 : 800;
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(event.beat === 1 ? .6 : .36, time + .003);
    gain.gain.exponentialRampToValueAtTime(.0001, time + .05);
    voice.connect(gain);
    gain.connect(this.audio.destination);
    this.voices.add(voice);
    voice.onended = () => {
      this.voices.delete(voice);
      voice.disconnect();
      gain.disconnect();
    };
    voice.start(time);
    voice.stop(time + .06);
  }

  practiceElapsed(elapsed) {
    return this.practiceStartedAt === null ? 0 : Math.max(0, elapsed - this.practiceStartedAt);
  }

  commitEvent(event) {
    this.currentChord = event.chord;
    this.previewChord = event.nextChord;
    this.countInBeat = event.countInBeat;
    this.beat = event.countInBeat ? 0 : event.beat;
    this.currentBpm = event.bpm;
  }

  snapshot(elapsed = this.elapsed()) {
    const practiceElapsed = this.practiceElapsed(elapsed);
    const countingIn = this.data?.kind === "bpm" && (this.practiceStartedAt === null || elapsed < this.practiceStartedAt);
    const duration = this.data?.duration || 0;
    return {
      status: this.status, kind: this.data?.kind, chord: this.currentChord,
      beat: this.beat, bpm: this.currentBpm, elapsed: practiceElapsed,
      nextChord: this.data?.kind === "bpm" ? this.previewChord : null,
      countingIn, countInBeat: this.countInBeat,
      remaining: duration ? Math.max(0, duration - practiceElapsed) : null,
      chordRemaining: Math.max(0, this.nextChord - elapsed), chordSeconds: this.chordSeconds,
      pendingBpm: this.pendingBpm, pendingSeconds: this.pendingSeconds,
      targetBpm: this.pendingBpm ?? this.pending[this.pending.length - 1]?.bpm ?? this.currentBpm,
      progress: this.data?.kind === "bpm" ? 0 : Math.max(0, Math.min(1, (this.nextChord - elapsed) / this.chordSeconds))
    };
  }

  render() { this.onUpdate(this.snapshot()); }

  tick() {
    this.frame = null;
    if (this.status !== "running") return;
    const elapsed = this.elapsed();
    if (this.data.duration && this.practiceElapsed(elapsed) >= this.data.duration) {
      this.onUpdate(this.snapshot(this.practiceStartedAt + this.data.duration));
      this.stop("練習完成");
      return;
    }
    if (this.data.kind === "bpm") {
      if (this.audio.state !== "running" || elapsed - this.nextBeat > .25) {
        this.pause("節拍中斷，請按繼續。", this.lastElapsed);
        return;
      }
      if (this.nextBeat < elapsed + .1 && (!this.data.duration || this.practiceStartedAt === null || this.nextBeat < this.practiceStartedAt + this.data.duration)) {
        const countingIn = this.scheduledCountIn < 4;
        if (!countingIn && this.practiceStartedAt === null) this.practiceStartedAt = this.nextBeat;
        const accelerationStep = countingIn ? 0
          : Math.floor((this.nextBeat - this.practiceStartedAt + 1e-9) / this.data.accelerationSeconds);
        if (this.pendingBpm !== null) {
          this.baseBpm = this.pendingBpm;
          this.accelerationAnchor = accelerationStep;
          this.pendingBpm = null;
        }
        const steps = this.data.accelerate ? accelerationStep - this.accelerationAnchor : 0;
        const bpm = Math.min(this.data.accelerate ? this.data.maxBpm : 240, Math.max(30, this.baseBpm + steps));
        let beat;
        if (countingIn) beat = ++this.scheduledCountIn;
        else {
          if (this.scheduledBeat === this.data.beats) {
            this.scheduledBeat = 0;
            this.scheduledChord = this.scheduledNextChord;
            this.scheduledNextChord = this.data.pickChord(this.scheduledChord);
          }
          beat = ++this.scheduledBeat;
        }
        this.pending.push({ time: this.nextBeat, chord: this.scheduledChord, nextChord: this.scheduledNextChord,
          countInBeat: countingIn ? beat : 0, beat, bpm, sounded: false });
        this.nextBeat += 60 / bpm;
      }
      this.pending.forEach(event => this.scheduleClick(event, elapsed));
      while (this.pending.length && this.pending[0].time <= elapsed) {
        const event = this.pending.shift();
        this.commitEvent(event);
      }
    } else if (elapsed >= this.nextChord) {
      // Anchor to the actual deadline; never add frame latency to the interval.
      // Long interruptions are paused by visibilitychange (and guarded below).
      if (elapsed - this.nextChord > .25) {
        this.pause("計時中斷，請按繼續。", this.lastElapsed);
        return;
      }
      this.chordStarted = this.nextChord;
      if (this.pendingSeconds !== null) {
        this.chordSeconds = this.pendingSeconds;
        this.pendingSeconds = null;
      }
      this.currentChord = this.data.pickChord(this.currentChord);
      this.nextChord += this.chordSeconds;
    }
    this.lastElapsed = elapsed;
    this.render();
    if (this.status === "running") this.frame = requestAnimationFrame(() => this.tick());
  }

  setBpm(value) {
    if (this.status === "idle" || this.data.kind !== "bpm") return;
    const ceiling = this.data.accelerate ? this.data.maxBpm : 240;
    this.pendingBpm = Math.min(ceiling, Math.max(30, value));
    this.render();
  }

  setSeconds(value) {
    if (this.status === "idle" || this.data.kind === "bpm") return;
    this.pendingSeconds = value;
    this.render();
  }

  pause(message = "已暫停", freezeElapsed) {
    if (this.status !== "running") return;
    const elapsed = freezeElapsed ?? this.elapsed();
    this.pausedAt = this.origin + this.pausedTotal + elapsed;
    while (this.pending.length && this.pending[0].time <= elapsed) {
      const event = this.pending.shift();
      this.commitEvent(event);
    }
    this.status = "paused";
    this.cancelFrame();
    this.cancelVoices();
    this.render();
    if (this.onPause) this.onPause(message);
  }

  async resume() {
    if (this.status !== "paused") return false;
    const generation = this.generation;
    this.status = "resuming";
    if (this.data.kind === "bpm") {
      try {
        await this.audio.resume();
        if (generation !== this.generation) return false;
        if (this.audio.state !== "running") throw new Error("Audio unavailable");
      } catch (_) {
        if (generation === this.generation) {
          this.status = "paused";
          if (this.onPause) this.onPause("無法恢復音訊，請再試一次。");
          this.render();
        }
        return false;
      }
    }
    if (generation !== this.generation) return false;
    this.pausedTotal += this.clockNow() - this.pausedAt;
    this.status = "running";
    this.tick();
    return true;
  }

  stop(message = "已停止") {
    this.generation++;
    this.cancelFrame();
    this.cancelVoices();
    this.frozenElapsed = this.data && this.origin !== undefined ? this.elapsed() : 0;
    this.status = "idle";
    this.pending = [];
    if (this.onStop) this.onStop(message);
  }
}
