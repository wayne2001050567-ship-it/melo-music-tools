/* Audio time owns the rhythm; the animation loop only schedules and displays it. */
const bpmInput = document.getElementById('bpm');
const meterInput = document.getElementById('meter');
const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const statusText = document.getElementById('status');
const lights = document.getElementById('beatLights');
let bpm = 80;
let audio;
let running = false;
let starting = false;
let generation = 0;
let frame = null;
let nextTime = 0;
let nextBeat = 1;
let pending = [];
const voices = new Set();

function renderBeat(beat = 0) {
  [...lights.children].forEach((light, index) => light.classList.toggle('active', index + 1 === beat));
  document.getElementById('beatText').textContent = `第 ${beat} / ${meterInput.value} 拍`;
}
function renderMeter() {
  lights.replaceChildren();
  for (let i = 0; i < Number(meterInput.value); i++) {
    const light = document.createElement('span');
    light.className = 'beat';
    lights.append(light);
  }
  renderBeat();
}
function updateControls() {
  startButton.disabled = running || starting;
  startButton.textContent = starting ? '準備中' : running ? '播放中' : '開始';
  stopButton.disabled = !running && !starting;
  meterInput.disabled = running || starting;
  document.getElementById('slower').disabled = bpm <= 30;
  document.getElementById('faster').disabled = bpm >= 240;
}
function setBpm(value) {
  const number = Number(value);
  if (String(value).trim() !== '' && Number.isFinite(number)) bpm = Math.min(240, Math.max(30, Math.round(number)));
  bpmInput.value = bpm;
  updateControls();
  // Already scheduled clicks remain intact. The next unscheduled interval uses bpm.
}
function scheduleClick(time, beat) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = beat === 1 ? 1200 : 800;
  gain.gain.setValueAtTime(.0001, time);
  gain.gain.exponentialRampToValueAtTime(beat === 1 ? .6 : .36, time + .003);
  gain.gain.exponentialRampToValueAtTime(.0001, time + .05);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  voices.add(oscillator);
  oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(time);
  oscillator.stop(time + .06);
}
function tick() {
  frame = null;
  if (!running) return;
  const now = audio.currentTime;
  // Do not replay missed beats after an interruption or a backgrounded tab.
  if (audio.state !== 'running' || now - nextTime > .25) {
    stop('節拍中斷，請重新開始。');
    return;
  }
  if (nextTime < now + .1) {
    scheduleClick(nextTime, nextBeat);
    pending.push({ time: nextTime, beat: nextBeat });
    nextTime += 60 / bpm;
    nextBeat = nextBeat % Number(meterInput.value) + 1;
  }
  while (pending.length && pending[0].time <= now) renderBeat(pending.shift().beat);
  frame = requestAnimationFrame(tick);
}
async function start() {
  if (running || starting) return;
  setBpm(bpmInput.value);
  const attempt = ++generation;
  starting = true;
  updateControls();
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    await audio.resume();
    if (attempt !== generation) return;
    if (audio.state !== 'running') throw new Error('Audio unavailable');
    starting = false;
    running = true;
    nextTime = audio.currentTime + .08;
    nextBeat = 1;
    pending = [];
    statusText.textContent = '播放中';
    updateControls();
    tick();
  } catch (_) {
    if (attempt === generation) stop('無法啟動音訊，請再按一次開始。');
  }
}
function stop(message = '已停止') {
  generation++;
  running = starting = false;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  voices.forEach(voice => { try { voice.stop(); } catch (_) {} });
  voices.clear();
  pending = [];
  renderBeat();
  statusText.textContent = message;
  updateControls();
}
bpmInput.addEventListener('change', () => setBpm(bpmInput.value));
bpmInput.addEventListener('keydown', event => { if (event.key === 'Enter') { setBpm(bpmInput.value); bpmInput.blur(); } });
document.getElementById('slower').addEventListener('click', () => setBpm(bpm - 5));
document.getElementById('faster').addEventListener('click', () => setBpm(bpm + 5));
meterInput.addEventListener('change', renderMeter);
startButton.addEventListener('click', start);
stopButton.addEventListener('click', () => stop());
document.addEventListener('visibilitychange', () => { if (document.hidden && (running || starting)) stop('已停止，按開始即可繼續練習。'); });
window.addEventListener('pagehide', () => stop());
renderMeter();
updateControls();
