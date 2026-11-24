/* Settings only. Never persist audio clocks, running sessions or favoriteChords here. */
const SETTINGS_KEY = "meloChordPracticeSettings";
const SECONDS_MAX = Math.floor(Number.MAX_SAFE_INTEGER / 1000);
const DEFAULT_SETTINGS = Object.freeze({
  practiceMode: "practice", chords: "C Am F G", timerSeconds: 30, practiceBpm: 80,
  beatsPerChord: 4, enableAcceleration: false, accelerationSeconds: 3,
  maxPracticeBpm: 120, practiceDuration: 0, practiceSound: true, count: 4, enableTimer: false
});

function sanitizeSettings(raw) {
  const clean = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return clean;
  if (["progression", "seconds", "practice"].includes(raw.practiceMode)) clean.practiceMode = raw.practiceMode;
  if (typeof raw.chords === "string") clean.chords = raw.chords;
  for (const key of ["enableAcceleration", "practiceSound", "enableTimer"]) {
    if (typeof raw[key] === "boolean") clean[key] = raw[key];
  }
  const ranges = { timerSeconds: [1, SECONDS_MAX], practiceBpm: [30, 240],
    maxPracticeBpm: [30, 240], count: [1, Number.MAX_SAFE_INTEGER] };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (Number.isInteger(raw[key]) && raw[key] >= min && raw[key] <= max) clean[key] = raw[key];
  }
  for (const [key, values] of Object.entries({ beatsPerChord: [2, 3, 4], accelerationSeconds: [3, 5, 10], practiceDuration: [0, 60, 180] })) {
    if (values.includes(raw[key])) clean[key] = raw[key];
  }
  if (clean.enableAcceleration && clean.maxPracticeBpm < clean.practiceBpm) clean.maxPracticeBpm = Math.max(120, clean.practiceBpm);
  return clean;
}

function restoreSettings() {
  let settings = { ...DEFAULT_SETTINGS };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (saved?.version === 1) settings = sanitizeSettings(saved.values);
  } catch (_) { /* Storage can be unavailable or contain invalid JSON. */ }
  for (const [key, value] of Object.entries(settings)) {
    const field = document.getElementById(key);
    if (!field) continue;
    if (typeof value === "boolean") field.checked = value;
    else field.value = String(value);
  }
}

function saveSettings() {
  const raw = {};
  for (const [key, fallback] of Object.entries(DEFAULT_SETTINGS)) {
    const field = document.getElementById(key);
    if (!field) continue;
    raw[key] = typeof fallback === "boolean" ? field.checked
      : typeof fallback === "number" ? Number(field.value) : field.value;
  }
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, values: sanitizeSettings(raw) })); }
  catch (_) { /* A blocked/full store must not prevent practice. */ }
}

document.addEventListener("input", event => {
  if (Object.hasOwn(DEFAULT_SETTINGS, event.target.id)) saveSettings();
});
document.addEventListener("change", event => {
  if (Object.hasOwn(DEFAULT_SETTINGS, event.target.id)) saveSettings();
});
