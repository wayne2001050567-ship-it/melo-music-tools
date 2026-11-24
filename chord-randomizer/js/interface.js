/* View changes reuse the same stage and clock. No timers are owned by the UI. */
let focusReturnScroll = 0;

function toggleFocusMode(force) {
  const active = typeof force === "boolean" ? force : !document.body.classList.contains("focus-mode");
  if (active) focusReturnScroll = window.scrollY;
  document.body.classList.toggle("focus-mode", active);
  // Move the existing controls, preserving their values and handlers.
  // Neither view owns another input or another clock.
  const speedTarget = byId(active ? "focusSpeedControls" : "quickSettings");
  ["secondsControls", "bpmControls", "speedHint"].forEach(id => speedTarget.append(byId(id)));
  const button = byId("focusPractice");
  setText("focusPractice", active ? "退出專注" : "專注練習");
  button.setAttribute("aria-pressed", String(active));
  button.focus({ preventScroll: true });
  window.scrollTo({ top: active ? 0 : focusReturnScroll, behavior: "instant" });
}

function renderBeatTrack() {
  const track = byId("beatTrack");
  const count = lastSnapshot?.countingIn ? 4 : Number(byId("beatsPerChord").value);
  track.replaceChildren();
  for (let index = 1; index <= count; index++) {
    const dot = document.createElement("span");
    dot.className = "beat-dot";
    track.append(dot);
  }
  updateBeatTrack(lastSnapshot?.countingIn ? lastSnapshot.countInBeat : lastSnapshot?.beat || 0);
}

function updateBeatTrack(beat) {
  document.querySelectorAll(".beat-dot").forEach((dot, index) => {
    dot.classList.toggle("active", index + 1 === beat);
  });
}

const chordElement = byId("currentChord");
let previousChord = chordElement.textContent;
new MutationObserver(() => {
  if (chordElement.textContent === previousChord) return;
  previousChord = chordElement.textContent;
  chordElement.classList.toggle("long-chord", previousChord.length > 6);
  chordElement.classList.remove("chord-enter");
  void chordElement.offsetWidth;
  chordElement.classList.add("chord-enter");
}).observe(chordElement, { childList: true });

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && document.body.classList.contains("focus-mode")) toggleFocusMode(false);
});

restoreSettings();
lastValidBpm = Number(byId("practiceBpm").value);
lastValidSeconds = Number(byId("timerSeconds").value);
if (window.matchMedia("(min-width: 1024px)").matches) {
  byId("chordSettings").open = true;
  byId("basicSettings").open = true;
}
updateSavedChordsDisplay();
switchPracticeMode();
