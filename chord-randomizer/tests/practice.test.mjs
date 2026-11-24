// Run with node chord-randomizer/tests/practice.test.mjs (Node built-ins only).
import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const html = await fs.readFile(new URL('index.html', root), 'utf8');
const scripts = await Promise.all(['settings.js', 'practice-clock.js', 'practice.js', 'interface.js'].map(name => fs.readFile(new URL(`js/${name}`, root), 'utf8')));
for (const source of scripts) new vm.Script(source);
assert.ok(html.includes('id="nextChord"'));

const results = [];

function setup({ storage = new Map(), blocked = false, deferAudio = false, failAudio = false } = {}) {
  let wall = 0, seq = 0, maxFrames = 0, draws = 0;
  const frames = new Map(), el = {}, events = {}, voices = [], resumes = [], gains = [];
  class Element {
    constructor() {
      this.value = ''; this.checked = false; this.hidden = false; this.disabled = false; this.open = false;
      this.children = []; this.observers = []; this.attributes = {}; this.text = ''; this.classes = new Set();
      this.classList = { contains: x => this.classes.has(x), remove: x => this.classes.delete(x), add: x => this.classes.add(x),
        toggle: (x, force) => { const value = force ?? !this.classes.has(x); value ? this.classes.add(x) : this.classes.delete(x); return value; } };
    }
    get textContent() { return this.text; }
    set textContent(value) { this.text = String(value); this.observers.forEach(fn => fn()); }
    set className(value) { this.classes = new Set(value.split(' ')); }
    get offsetWidth() { return 0; }
    focus() { document.activeElement = this; }
    setAttribute(key, value) { this.attributes[key] = value; }
    replaceChildren() { this.children = []; }
    append(child) { this.children.push(child); }
  }
  for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    const e = el[match[1]] = new Element();
    e.value = match[0].match(/\bvalue="([^"]*)"/)?.[1] || '';
    for (const key of ['checked', 'hidden', 'disabled', 'open']) e[key] = new RegExp(`\\b${key}\\b`).test(match[0]);
  }
  for (const match of html.matchAll(/<select id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const options = [...match[2].matchAll(/<option value="([^"]+)"([^>]*)>/g)];
    el[match[1]].value = (options.find(o => o[2].includes('selected')) || options[0])[1];
  }
  const document = { body: new Element(), activeElement: null, hidden: false,
    getElementById: id => { assert.ok(el[id], `missing DOM element ${id}`); return el[id]; },
    querySelectorAll: selector => selector === '.beat-dot' ? el.beatTrack.children : [], createElement: () => new Element(),
    addEventListener: (name, fn) => { (events[name] ||= []).push(fn); } };
  class Audio {
    constructor() { this.state = 'running'; this.destination = {}; }
    get currentTime() { return wall; }
    async resume() {
      if (failAudio) throw new Error('blocked audio');
      if (deferAudio) await new Promise(resolve => resumes.push(resolve));
    }
    createOscillator() {
      const voice = { frequency: {}, connect() {}, disconnect() {}, start(time) { this.startTime = time; },
        stop(time) { if (time === undefined) this.cancelledAt = wall; else this.stopTime = time; } };
      voices.push(voice); return voice;
    }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime(value, time) { gains.push({ value, time }); } }, connect() {}, disconnect() {} }; }
  }
  const math = Object.create(Math);
  math.random = () => { draws++; return ((draws * 1103515245 + 12345) >>> 0) / 4294967296; };
  const ctx = vm.createContext({ document, window: { AudioContext: Audio, scrollY: 100, scrollTo({ top }) { this.scrollY = top; }, matchMedia: () => ({ matches: false }),
      addEventListener: (name, fn) => { (events[name] ||= []).push(fn); } },
    performance: { now: () => wall * 1000 }, Math: math,
    localStorage: { getItem: k => { if (blocked) throw Error('storage blocked'); return storage.get(k) ?? null; },
      setItem: (k, v) => { if (blocked) throw Error('storage blocked'); storage.set(k, v); },
      removeItem: k => { if (blocked) throw Error('storage blocked'); storage.delete(k); } },
    MutationObserver: class { constructor(fn) { this.fn = fn; } observe(target) { target.observers.push(this.fn); } },
    requestAnimationFrame: fn => { frames.set(++seq, fn); maxFrames = Math.max(maxFrames, frames.size); return seq; }, cancelAnimationFrame: id => frames.delete(id)
  });
  const run = source => vm.runInContext(source, ctx);
  scripts.forEach(run);
  const advance = (seconds, step = .007) => {
    const end = wall + seconds;
    while (wall < end) {
      wall = Math.min(end, wall + step);
      const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn());
      voices.forEach(voice => { if (!voice.ended && voice.stopTime <= wall) { voice.ended = true; voice.onended?.(); } });
    }
  };
  const fire = (name, event = {}) => events[name]?.forEach(fn => fn(event));
  const choose = mode => { el.practiceMode.value = mode; run('switchPracticeMode()'); };
  return { el, run, advance, fire, choose, storage, frames, voices, resumes, gains, document,
    get maxFrames() { return maxFrames; }, get wall() { return wall; }, jump(seconds) { wall += seconds; }, get draws() { return draws; } };
}

async function check(name, test) { await test(); results.push(name); }
await check('settings defaults; practice-first; empty preview before start; no auto-start', async () => {
  const t = setup(); assert.equal(t.el.practiceMode.value, 'practice'); assert.equal(t.el.chords.value, 'C Am F G');
  assert.equal(t.frames.size, 0); assert.equal(t.run('clock.status'), 'idle'); assert.equal(t.el.result.hidden, true); assert.equal(t.el.nextChord.textContent, '—');
});
await check('seconds ±1; independent BPM; next-chord application; no deadline drift', async () => {
  const t = setup(); t.choose('seconds'); assert.equal(t.el.nextChordPreview.hidden, true); t.el.timerSeconds.value = '3'; t.run('changeSeconds()');
  await t.run('startPractice()'); const chord = t.el.currentChord.textContent;
  t.advance(1); t.run('adjustSeconds(-1)'); assert.equal(t.el.timerSeconds.value, '2'); assert.equal(t.el.practiceBpm.value, '80');
  assert.equal(t.run('clock.nextChord'), 3); t.advance(1.99); assert.equal(t.el.currentChord.textContent, chord);
  t.advance(.02); assert.notEqual(t.el.currentChord.textContent, chord); assert.equal(t.run('clock.nextChord'), 5);
  t.advance(1.99); assert.equal(t.run('clock.nextChord'), 7);
  t.run('stopPractice()'); t.el.timerSeconds.value = '1'; t.run('adjustSeconds(-1)'); assert.equal(t.el.timerSeconds.value, '1');
});
await check('BPM ±5 at beat boundaries; no duplicate frames or clicks', async () => {
  const t = setup(); t.el.practiceBpm.value = '80'; await t.run('startPractice()');
  t.advance(.2); assert.equal(t.voices[0].startTime, .08); t.run('adjustBpm(5); adjustBpm(5)');
  assert.equal(t.el.practiceBpm.value, '90'); assert.equal(t.el.timerSeconds.value, '30');
  assert.equal(t.run('clock.currentBpm'), 80); t.advance(.64); assert.equal(t.run('clock.currentBpm'), 90);
  assert.ok(Math.abs(t.voices[1].startTime - .83) < 1e-8); t.advance(.7);
  assert.ok(Math.abs(t.voices[2].startTime - t.voices[1].startTime - 60 / 90) < 1e-8);
  assert.equal(t.maxFrames, 1); t.run('stopPractice()'); assert.equal(t.frames.size, 0);
  t.el.practiceBpm.value = '240'; t.run('adjustBpm(5)'); assert.equal(t.el.practiceBpm.value, '240');
  t.el.practiceBpm.value = '30'; t.run('adjustBpm(-5)'); assert.equal(t.el.practiceBpm.value, '30');
});
await check('2/3/4-beat switching; no adjacent duplicates', async () => {
  for (const beats of [2, 3, 4]) {
    const t = setup(); t.el.practiceBpm.value = '60'; t.el.beatsPerChord.value = String(beats); t.run('renderBeatTrack()');
    await t.run('startPractice()'); t.advance(4.09); const first = t.el.currentChord.textContent;
    t.advance(beats - .02); assert.equal(t.el.currentChord.textContent, first); t.advance(.02);
    assert.notEqual(t.el.currentChord.textContent, first); assert.equal(t.el.beatTrack.children.length, beats);
  }
});
await check('3/5/10-second acceleration; manual adjustment retains global cadence; cap', async () => {
  for (const seconds of [3, 5, 10]) {
    const t = setup(); t.el.practiceBpm.value = '60'; t.el.enableAcceleration.checked = true;
    t.el.accelerationSeconds.value = String(seconds); t.el.maxPracticeBpm.value = '66'; await t.run('startPractice()');
    t.advance(5.29); t.run('adjustBpm(5)'); t.advance(seconds + 1.2); assert.equal(t.run('clock.currentBpm'), 66);
    t.advance(seconds * 2); assert.equal(t.run('clock.currentBpm'), 66); t.run('adjustBpm(5)'); assert.equal(t.el.practiceBpm.value, '66');
  }
});
await check('pause/resume freezes seconds, BPM, acceleration and session duration', async () => {
  for (const mode of ['seconds', 'practice']) {
    const t = setup(); t.choose(mode); t.el.timerSeconds.value = '3'; t.el.practiceDuration.value = '60';
    t.el.enableAcceleration.checked = true; await t.run('startPractice()'); t.advance(.04);
    await t.run('togglePause()'); const before = JSON.stringify(t.run('clock.snapshot()')); t.advance(20);
    assert.equal(JSON.stringify(t.run('clock.snapshot()')), before); assert.equal(t.frames.size, 0);
    t.run('adjustSeconds(-1)'); if (mode === 'practice') t.run('adjustBpm(5)');
    await t.run('togglePause()'); t.advance(1); assert.equal(t.run('clock.status'), 'running');
    t.advance(mode === 'practice' ? 65 : 58.97); assert.equal(t.run('clock.status'), 'idle'); assert.equal(t.el.practiceStatus.textContent, '練習完成');
    assert.equal(t.maxFrames, 1);
  }
});
await check('focus switches / Escape preserve clock and progress', async () => {
  for (const mode of ['seconds', 'practice']) {
    const t = setup(); t.choose(mode); await t.run('startPractice()'); t.advance(.2);
    const before = t.run('clock.elapsed()'); const chord = t.el.currentChord.textContent;
    for (let i = 0; i < 20; i++) t.run('toggleFocusMode(true); toggleFocusMode(false)');
    assert.equal(t.run('clock.elapsed()'), before); assert.equal(t.el.currentChord.textContent, chord); assert.equal(t.frames.size, 1);
    t.run('toggleFocusMode(true)'); t.fire('keydown', { key: 'Escape' }); assert.equal(t.document.body.classList.contains('focus-mode'), false);
    assert.equal(t.run('clock.status'), 'running'); assert.equal(t.maxFrames, 1);
  }
});
await check('single countdown and original random progression; changes apply next generation', async () => {
  const t = setup(); t.choose('progression'); t.el.enableTimer.checked = true; t.run('updatePracticeOptions()');
  t.el.timerSeconds.value = '3'; await t.run('startPractice()'); assert.equal(new Set(t.el.result.textContent.split(' - ')).size, 4);
  assert.equal(t.el.timerDisplay.hidden, false); t.advance(1); t.run('adjustSeconds(-1)');
  assert.equal(t.run('clock.data.duration'), 3); await t.run('togglePause()'); t.advance(5); await t.run('togglePause()');
  t.advance(2.01); assert.equal(t.run('clock.status'), 'idle'); assert.equal(t.frames.size, 0);
  await t.run('startPractice()'); assert.equal(t.run('clock.data.duration'), 2);
});
await check('1/3-minute termination, unlimited sessions, stop/restart', async () => {
  for (const mode of ['seconds', 'practice']) for (const duration of [0, 60, 180]) {
    const t = setup(); t.choose(mode); t.el.practiceDuration.value = String(duration); await t.run('startPractice()');
    t.advance((duration || 185) + (mode === 'practice' ? 3.08 : 0) + .01, .016);
    assert.equal(t.run('clock.status'), duration ? 'idle' : 'running');
    t.run('stopPractice()'); assert.equal(t.frames.size, 0); await t.run('startPractice()'); assert.equal(t.frames.size, 1);
  }
});
await check('settings survive reload; invalid settings fallback; favorite data unchanged', async () => {
  const storage = new Map([['favoriteChords', '["Dm","G7","Cmaj7"]']]);
  const t = setup({storage}); t.choose('seconds'); t.el.chords.value = 'F，G\nAm'; t.el.timerSeconds.value = '7'; t.el.practiceBpm.value = '95';
  t.el.practiceDuration.value = '180'; t.run('saveSettings()'); const second = setup({storage});
  assert.equal(second.el.practiceMode.value, 'seconds'); assert.equal(second.el.timerSeconds.value, '7'); assert.equal(second.el.practiceBpm.value, '95');
  assert.equal(second.el.chords.value, 'F，G\nAm'); assert.equal(second.frames.size, 0); assert.equal(second.run('clock.status'), 'idle');
  assert.equal(storage.get('favoriteChords'), '["Dm","G7","Cmaj7"]');
  second.run('loadFavoriteChords()'); assert.equal(second.el.chords.value, 'Dm G7 Cmaj7');
  for (const invalid of ['{', 'null', '{"version":9}', '{"version":1,"values":{"practiceBpm":999,"timerSeconds":0,"beatsPerChord":11,"practiceMode":"oops"}}']) {
    const bad = setup({storage: new Map([['meloChordPracticeSettings', invalid]])});
    assert.equal(bad.el.practiceBpm.value, '80'); assert.equal(bad.el.timerSeconds.value, '30'); assert.equal(bad.el.practiceMode.value, 'practice');
  }
  const blocked = setup({blocked:true}); blocked.choose('seconds'); await blocked.run('startPractice()'); assert.equal(blocked.frames.size, 1);
});
await check('parse and favorite save/load/clear compatibility', async () => {
  const t = setup(); t.el.chords.value = 'C，Am\nF,G C'; t.run('saveFavoriteChords()');
  assert.equal(t.storage.get('favoriteChords'), '["C","Am","F","G"]');
  t.el.chords.value = ''; t.run('loadFavoriteChords()'); assert.equal(t.el.chords.value, 'C Am F G');
  t.run('clearFavoriteChords()'); assert.equal(t.storage.has('favoriteChords'), false);
});
await check('background and long-frame interruption pause safely; resume is recoverable', async () => {
  for (const mode of ['seconds', 'practice']) {
    const t = setup(); t.choose(mode); await t.run('startPractice()'); t.advance(.2);
    t.document.hidden = true; t.fire('visibilitychange'); assert.equal(t.run('clock.status'), 'paused');
    t.advance(20); await t.run('togglePause()'); assert.equal(t.run('clock.status'), 'running');
    t.jump(40); t.advance(.01); assert.equal(t.run('clock.status'), 'paused');
    await t.run('togglePause()'); t.advance(.1); assert.equal(t.run('clock.status'), 'running'); assert.equal(t.maxFrames, 1);
  }
});
await check('async audio start/stop race, repeated start and failed audio', async () => {
  const t = setup({deferAudio:true}); const first = t.run('startPractice()'); const ignored = t.run('startPractice()');
  assert.equal(t.resumes.length, 1); t.run('stopPractice()'); const second = t.run('startPractice()');
  t.resumes[0](); await first; await ignored; assert.equal(t.frames.size, 0); t.resumes[1](); await second;
  assert.equal(t.frames.size, 1); assert.equal(t.maxFrames, 1);
  const failed = setup({failAudio:true}); await failed.run('startPractice()');
  assert.equal(failed.run('clock.status'), 'idle'); assert.equal(failed.frames.size, 0); assert.equal(failed.el.startPractice.disabled, false);
});
await check('long-run audio and seconds deadlines do not accumulate frame drift', async () => {
  const t = setup(); await t.run('startPractice()'); t.advance(120, .016);
  const played = t.voices.filter(voice => voice.startTime !== undefined);
  for (let i = 0; i < played.length; i++) assert.ok(Math.abs(played[i].startTime - (.08 + i * .75)) < 1e-7);
  const seconds = setup(); seconds.choose('seconds'); seconds.el.timerSeconds.value = '1'; await seconds.run('startPractice()');
  seconds.advance(120.01, .016); assert.equal(seconds.run('clock.nextChord'), 121); assert.equal(seconds.maxFrames, 1);
});
await check('four count-in beats; preview promotes correctly; duration and acceleration start on beat five', async () => {
  const t = setup(); t.el.practiceBpm.value = '60'; t.el.practiceDuration.value = '60';
  t.el.enableAcceleration.checked = true; t.el.accelerationSeconds.value = '3';
  await t.run('startPractice()'); const first = t.el.currentChord.textContent; const preview = t.el.nextChord.textContent;
  assert.notEqual(first, preview); assert.equal(t.run('clock.snapshot().elapsed'), 0);
  for (let beat = 1; beat <= 4; beat++) {
    t.advance(beat === 1 ? .09 : 1);
    assert.equal(t.el.practiceBeat.textContent, `預備拍 ${beat} / 4`);
    assert.equal(t.el.currentChord.textContent, first); assert.equal(t.el.nextChord.textContent, preview);
    assert.equal(t.run('clock.snapshot().elapsed'), 0); assert.equal(t.run('clock.snapshot().remaining'), 60);
    assert.equal(t.run('clock.currentBpm'), 60);
  }
  t.advance(1); assert.equal(t.el.practiceBeat.textContent, '第 1 / 4 拍');
  assert.equal(t.run('clock.snapshot().countingIn'), false); assert.ok(t.run('clock.snapshot().elapsed') < .02);
  t.advance(3.05); assert.equal(t.run('clock.currentBpm'), 61);
  t.advance(1); assert.equal(t.el.currentChord.textContent, preview); assert.notEqual(t.el.nextChord.textContent, preview);
  assert.ok(t.gains.some(event => event.value === .6)); assert.ok(t.gains.some(event => event.value === .36));
  assert.equal(t.maxFrames, 1);
});
await check('pause/resume during count-in and regular practice does not repeat count-in', async () => {
  const t = setup(); t.el.practiceBpm.value = '60'; await t.run('startPractice()'); t.advance(1.2);
  const first = t.el.currentChord.textContent; const next = t.el.nextChord.textContent;
  await t.run('togglePause()'); t.advance(10); await t.run('togglePause()');
  assert.equal(t.el.practiceBeat.textContent, '預備拍 2 / 4'); assert.equal(t.el.nextChord.textContent, next);
  t.advance(2.89); assert.equal(t.run('clock.snapshot().countingIn'), false); assert.equal(t.el.currentChord.textContent, first);
  await t.run('togglePause()'); const frozen = t.run('clock.snapshot().elapsed');
  t.advance(10); await t.run('togglePause()'); assert.equal(t.run('clock.snapshot().countingIn'), false);
  assert.ok(Math.abs(t.run('clock.snapshot().elapsed') - frozen) < 1e-8);
  assert.equal(t.el.practiceBeat.textContent, '第 1 / 4 拍'); assert.equal(t.maxFrames, 1);
  t.run('stopPractice()'); await t.run('startPractice()'); assert.equal(t.run('clock.snapshot().countingIn'), true);
});
console.log(`PASS ${results.length} regression groups:\n${results.join('\n')}`);
