/* Practice controls, existing chord algorithms and favoriteChords compatibility. */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseChords(text) {
  return text
    .split(/[\s,，]+/)
    .map(chord => chord.trim())
    .filter(chord => chord !== "");
}

function pickPracticeChord(chords, previous) {
  const choices = chords.length > 1 ? chords.filter(chord => chord !== previous) : chords;
  return choices[Math.floor(Math.random() * choices.length)];
}

const byId = id => document.getElementById(id);
const modeNames = { seconds: "秒數反應", practice: "BPM 無限練習", progression: "隨機進行" };
let lastSnapshot = null;
let hasPracticed = false;
let lastValidBpm = 80;
let lastValidSeconds = 30;
const lockedSettingIds = ["beatsPerChord", "enableAcceleration", "accelerationSeconds", "maxPracticeBpm", "practiceDuration", "count", "enableTimer"];
const clock = new PracticeClock({
  audioFactory: () => new (window.AudioContext || window.webkitAudioContext)(),
  onUpdate: renderPractice,
  onStop: message => {
    lastSnapshot = null;
    updateControls();
    setText("practiceStatus", message);
    setText("practiceBeat", message === "練習完成" ? "已完成" : "已停止");
    updateBeatTrack(0);
    setText("speedHint", "");
    saveSettings();
  }
});
clock.onPause = message => setText("practiceStatus", message);

function setText(id, text) {
  const field = byId(id);
  if (field.textContent !== String(text)) field.textContent = String(text);
}

function formatPracticeTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function updateControls() {
  const active = clock.status !== "idle";
  const progression = byId("practiceMode").value === "progression";
  const startLabel = clock.status === "paused" ? "已暫停"
    : clock.status === "starting" ? "準備中"
    : clock.status === "resuming" ? "恢復中"
    : active ? (lastSnapshot?.countingIn ? "預備中" : "練習中")
    : progression ? (hasPracticed ? "重新產生" : "產生隨機進行")
    : hasPracticed ? "重新開始" : "開始練習";
  setText("startPractice", startLabel);
  byId("startPractice").disabled = active;
  byId("pausePractice").disabled = !["running", "paused"].includes(clock.status);
  byId("stopPractice").disabled = !active;
  setText("pausePractice", clock.status === "paused" ? "繼續" : "暫停");
  lockedSettingIds.forEach(id => { byId(id).disabled = active; });
  const bpmCeiling = active && clock.data?.kind === "bpm"
    ? (clock.data.accelerate ? clock.data.maxBpm : 240)
    : (byId("enableAcceleration").checked ? Math.max(30, Number(byId("maxPracticeBpm").value) || 240) : 240);
  const bpm = Number(byId("practiceBpm").value);
  byId("bpmMinus").disabled = bpm <= 30;
  byId("bpmPlus").disabled = bpm >= bpmCeiling;
  const seconds = Number(byId("timerSeconds").value);
  byId("secondsMinus").disabled = seconds <= 1;
  byId("secondsPlus").disabled = seconds >= SECONDS_MAX;
}

function updatePracticeOptions() {
  const mode = byId("practiceMode").value;
  byId("progressionSettings").hidden = mode !== "progression";
  byId("basicSettings").hidden = false;
  byId("beatSettings").hidden = mode !== "practice";
  byId("advancedSettings").hidden = mode !== "practice";
  byId("practiceStage").classList.toggle("progression-mode", mode === "progression");
  byId("progressArea").hidden = mode === "progression" && !byId("enableTimer").checked;
  setText("timerSecondsLabel", mode === "progression" ? "倒數秒數" : "每個和弦秒數");
  byId("sessionSettings").hidden = mode === "progression";
  byId("bpmSettings").hidden = mode !== "practice";
  byId("bpmControls").hidden = mode !== "practice";
  byId("secondsControls").hidden = mode === "practice" || (mode === "progression" && !byId("enableTimer").checked);
  byId("accelerationBadge").hidden = mode !== "practice";
  byId("countdownProgress").hidden = mode === "practice" || (mode === "progression" && !byId("enableTimer").checked);
  byId("timerDisplay").hidden = byId("countdownProgress").hidden;
  byId("accelerationSettings").hidden = !byId("enableAcceleration").checked;
  setText("accelerationBadge", byId("enableAcceleration").checked ? "加速開啟" : "加速關閉");
  updateControls();
  saveSettings();
}

function switchPracticeMode() {
  if (clock.status !== "idle") clock.stop("已切換模式");
  if (document.body.classList.contains("focus-mode")) toggleFocusMode(false);
  lastSnapshot = null;
  hasPracticed = false;
  const mode = byId("practiceMode").value;
  setText("stageMode", modeNames[mode]);
  setText("currentChord", "—");
  setText("nextChord", "—");
  setText("result", "尚未產生");
  setText("practiceStatus", "尚未開始");
  setText("practiceBeat", "尚未開始");
  setText("practiceTime", "已練習 0:00");
  setText("timerDisplay", "尚未開始");
  setText("speedHint", "");
  byId("currentChord").hidden = mode === "progression";
  byId("nextChordPreview").hidden = mode !== "practice";
  byId("result").hidden = mode !== "progression";
  byId("progressionRules").hidden = mode !== "progression";
  byId("beatTrack").hidden = mode !== "practice";
  byId("practiceBeat").hidden = mode !== "practice";
  byId("countdownProgress").hidden = mode === "practice" || (mode === "progression" && !byId("enableTimer").checked);
  byId("countdownProgress").value = 1;
  byId("timerDisplay").hidden = mode === "practice" || (mode === "progression" && !byId("enableTimer").checked);
  byId("practiceTime").hidden = mode === "progression";
  updatePracticeOptions();
  renderBeatTrack();
}

function renderPractice(snapshot) {
  hasPracticed = true;
  const phaseChanged = lastSnapshot?.status !== snapshot.status || lastSnapshot?.countingIn !== snapshot.countingIn;
  lastSnapshot = snapshot;
  const mode = byId("practiceMode").value;
  if (snapshot.kind === "bpm") {
    setText("currentChord", snapshot.chord);
    setText("nextChord", snapshot.nextChord);
    setText("practiceBeat", snapshot.countingIn
      ? (snapshot.countInBeat ? `預備拍 ${snapshot.countInBeat} / 4` : "預備 4 拍")
      : `第 ${snapshot.beat} / ${byId("beatsPerChord").value} 拍`);
    const displayedBeats = snapshot.countingIn ? 4 : Number(byId("beatsPerChord").value);
    if (byId("beatTrack").children.length !== displayedBeats) renderBeatTrack();
    updateBeatTrack(snapshot.countingIn ? snapshot.countInBeat : snapshot.beat);
    if (document.activeElement !== byId("practiceBpm")) byId("practiceBpm").value = String(snapshot.targetBpm);
    setText("speedHint", snapshot.targetBpm !== snapshot.bpm ? "新速度從下一個未排程節拍套用" : "");
  } else {
    if (mode === "seconds") setText("currentChord", snapshot.chord);
    const remaining = snapshot.kind === "countdown" ? snapshot.remaining : snapshot.chordRemaining;
    setText("timerDisplay", `${Math.max(0, remaining).toFixed(1)} 秒`);
    byId("countdownProgress").value = snapshot.progress;
    setText("speedHint", snapshot.kind === "countdown" && Number(byId("timerSeconds").value) !== snapshot.chordSeconds
      ? "新秒數從下次產生進行套用" : snapshot.pendingSeconds !== null ? "新秒數從下一個和弦套用" : "");
  }
  setText("practiceTime", snapshot.remaining === null
    ? `已練習 ${formatPracticeTime(snapshot.elapsed)}`
    : `剩餘 ${formatPracticeTime(Math.ceil(snapshot.remaining))}`);
  if (phaseChanged) setText("practiceStatus", snapshot.status === "paused" ? "已暫停" : snapshot.countingIn ? "預備中" : "練習中");
  updateControls();
}

function reportError(message, chords = false) {
  setText("practiceStatus", message);
  if (chords) {
    byId("chordSettings").open = true;
    byId("chords").focus();
  }
}

function validSeconds() {
  const seconds = Number(byId("timerSeconds").value);
  return Number.isInteger(seconds) && seconds >= 1 && seconds <= SECONDS_MAX;
}

function changeSeconds() {
  if (!validSeconds()) {
    byId("timerSeconds").value = String(lastValidSeconds);
    reportError("秒數請輸入至少 1 秒的整數。");
    return;
  }
  lastValidSeconds = Number(byId("timerSeconds").value);
  if (clock.status !== "idle" && clock.data?.kind === "seconds") clock.setSeconds(lastValidSeconds);
  else if (clock.status !== "idle") setText("speedHint", "新秒數從下次產生進行套用");
  updateControls();
  saveSettings();
}

function adjustSeconds(amount) {
  const current = Number(byId("timerSeconds").value) || lastValidSeconds;
  byId("timerSeconds").value = String(Math.max(1, Math.min(SECONDS_MAX, current + amount)));
  changeSeconds();
}

function changeBpm() {
  const bpm = Number(byId("practiceBpm").value);
  const ceiling = clock.status !== "idle" && clock.data?.accelerate ? clock.data.maxBpm : 240;
  if (!Number.isInteger(bpm) || bpm < 30 || bpm > ceiling) {
    byId("practiceBpm").value = String(lastValidBpm);
    reportError(`BPM 請輸入 30–${ceiling} 的整數。`);
    return;
  }
  lastValidBpm = bpm;
  if (clock.status !== "idle" && clock.data?.kind === "bpm") clock.setBpm(bpm);
  updateControls();
  saveSettings();
}

function adjustBpm(amount) {
  const current = clock.status !== "idle" && clock.data?.kind === "bpm"
    ? clock.snapshot().targetBpm : Number(byId("practiceBpm").value) || lastValidBpm;
  const ceiling = byId("enableAcceleration").checked ? Number(byId("maxPracticeBpm").value) || 240 : 240;
  byId("practiceBpm").value = String(Math.max(30, Math.min(ceiling, current + amount)));
  changeBpm();
}

async function startPractice() {
  if (clock.status !== "idle") return;
  if (byId("practiceMode").value === "progression") return generateChords();
  const chords = [...new Set(parseChords(byId("chords").value))];
  if (!chords.length) return reportError("請先輸入和弦。", true);
  const bpm = Number(byId("practiceBpm").value);
  const beats = Number(byId("beatsPerChord").value);
  const seconds = Number(byId("timerSeconds").value);
  const duration = Number(byId("practiceDuration").value);
  const mode = byId("practiceMode").value;
  if (mode === "seconds" && !validSeconds()) return reportError("秒數請輸入至少 1 秒的整數。");
  if (mode === "practice" && (!Number.isInteger(bpm) || bpm < 30 || bpm > 240 || ![2, 3, 4].includes(beats))) return reportError("BPM 為 30–240；換和弦拍數為 2、3、4 拍。");
  const accelerate = byId("enableAcceleration").checked;
  const accelerationSeconds = Number(byId("accelerationSeconds").value);
  const maxBpm = Number(byId("maxPracticeBpm").value);
  if (mode === "practice" && accelerate && (![3, 5, 10].includes(accelerationSeconds) || !Number.isInteger(maxBpm) || maxBpm < bpm || maxBpm > 240)) return reportError("請確認加速間隔與最高 BPM（起始速度至 240）。");
  if (![0, 60, 180].includes(duration)) return reportError("請選擇有效的練習時間。");
  saveSettings();
  lastSnapshot = null;
  setText("speedHint", "");
  setText("practiceStatus", "準備開始");
  const promise = clock.start({ kind: mode === "practice" ? "bpm" : "seconds", bpm, beats, seconds,
    duration, accelerate, accelerationSeconds, maxBpm, sound: () => byId("practiceSound").checked,
    firstChord: mode === "seconds" ? pickPracticeChord(chords) : undefined,
    pickChord: previous => pickPracticeChord(chords, previous) });
  updateControls();
  await promise;
  updateControls();
}

async function togglePause() {
  if (clock.status === "running") clock.pause();
  else if (clock.status === "paused") {
    const promise = clock.resume();
    updateControls();
    await promise;
    updateControls();
  }
}

function stopPractice() { clock.stop(); }

async function generateChords() {
  if (clock.status !== "idle") clock.stop();
  const chords = [...new Set(parseChords(byId("chords").value))];
  const count = parseInt(byId("count").value, 10);
  if (!chords.length) return reportError("請先輸入和弦。", true);
  if (!Number.isInteger(count) || count <= 0) return reportError("請輸入正確的抽取數量。");
  if (count > chords.length) return reportError(`你要求抽 ${count} 個，但只有 ${chords.length} 個不重複和弦。`);
  if (byId("enableTimer").checked && !validSeconds()) return reportError("請輸入有效的倒數秒數。");
  // Preserve the existing unique subset and its second shuffle.
  const shuffled = shuffleArray(chords);
  const selected = shuffled.slice(0, count);
  const progression = shuffleArray(selected);
  setText("result", progression.join(" - "));
  hasPracticed = true;
  saveSettings();
  if (byId("enableTimer").checked) {
    lastSnapshot = null;
    setText("speedHint", "");
    const seconds = Number(byId("timerSeconds").value);
    await clock.start({ kind: "countdown", seconds, duration: seconds, firstChord: progression.join(" - ") });
  } else setText("practiceStatus", "已產生");
  updateControls();
}

function readFavoriteChords() {
  try {
    const saved = JSON.parse(localStorage.getItem("favoriteChords"));
    return Array.isArray(saved) && saved.every(chord => typeof chord === "string") ? saved : [];
  } catch (_) { return []; }
}

function updateSavedChordsDisplay() {
  const saved = readFavoriteChords();
  setText("savedChordsDisplay", saved.length ? saved.join("  /  ") : "尚未儲存");
}

function saveFavoriteChords() {
  const chords = [...new Set(parseChords(byId("chords").value))];
  if (!chords.length) return setText("favoriteChordsStatus", "請先輸入和弦。");
  try {
    localStorage.setItem("favoriteChords", JSON.stringify(chords));
    updateSavedChordsDisplay();
    setText("favoriteChordsStatus", "已儲存常用和弦。");
  } catch (_) { setText("favoriteChordsStatus", "此瀏覽器無法儲存常用和弦。"); }
}

function loadFavoriteChords() {
  const chords = readFavoriteChords();
  if (!chords.length) return setText("favoriteChordsStatus", "目前沒有已儲存的常用和弦。");
  byId("chords").value = chords.join(" ");
  saveSettings();
  setText("favoriteChordsStatus", "已載入常用和弦。");
}

function clearFavoriteChords() {
  try {
    localStorage.removeItem("favoriteChords");
    updateSavedChordsDisplay();
    setText("favoriteChordsStatus", "已清除常用和弦。");
  } catch (_) { setText("favoriteChordsStatus", "此瀏覽器無法清除常用和弦。"); }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && clock.status === "running") clock.pause("已切到背景，按繼續恢復。");
});
window.addEventListener("pagehide", () => { if (clock.status !== "idle") clock.stop(); });
