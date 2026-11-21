/* Presentation only: keep the existing audio clock, state and storage in index.html. */
let focusReturnScroll = 0;

function toggleFocusMode(force) {
  const active = typeof force === "boolean" ? force : !document.body.classList.contains("focus-mode");
  if (active && document.getElementById("practiceMode").value !== "practice") return;
  if (active) focusReturnScroll = window.scrollY;
  document.body.classList.toggle("focus-mode", active);
  const button = document.getElementById("focusPractice");
  button.textContent = active ? "返回一般介面" : "專注練習";
  button.setAttribute("aria-pressed", String(active));
  button.focus({ preventScroll: true });
  window.scrollTo({ top: active ? 0 : focusReturnScroll, behavior: "instant" });
}

function renderBeatTrack() {
  const track = document.getElementById("beatTrack");
  const count = Number(document.getElementById("beatsPerChord").value);
  track.replaceChildren();
  for (let index = 1; index <= count; index++) {
    const dot = document.createElement("span");
    dot.className = "beat-dot";
    track.append(dot);
  }
  updateBeatTrack();
}

function updateBeatTrack() {
  const text = document.getElementById("practiceBeat").textContent;
  const beat = Number(text.match(/第 (\d+) /)?.[1] || 0);
  document.querySelectorAll(".beat-dot").forEach((dot, index) => {
    dot.classList.toggle("active", index + 1 === beat);
  });
}

const chordElement = document.getElementById("currentChord");
let previousChord = chordElement.textContent;
new MutationObserver(() => {
  if (chordElement.textContent === previousChord) return;
  previousChord = chordElement.textContent;
  chordElement.classList.remove("chord-enter");
  // One style read only at an actual chord change; never on every beat/frame.
  void chordElement.offsetWidth;
  chordElement.classList.add("chord-enter");
}).observe(chordElement, { childList: true });
new MutationObserver(updateBeatTrack).observe(document.getElementById("practiceBeat"), { childList: true });

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && document.body.classList.contains("focus-mode")) toggleFocusMode(false);
});
renderBeatTrack();
