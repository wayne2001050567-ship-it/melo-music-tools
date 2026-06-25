let activeLine = null;
let activeLyricRow = null;
let lastCaretOffset = 0;
let zoom = 1;

const scoreBody = document.getElementById("scoreBody");
const pageScale = document.getElementById("pageScale");
const zoomLabel = document.getElementById("zoomLabel");

const addLineBtn = document.getElementById("addLineBtn");
const addSectionBtn = document.getElementById("addSectionBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const printBtn = document.getElementById("printBtn");
const customChordInput = document.getElementById("customChordInput");
const addCustomChordBtn = document.getElementById("addCustomChordBtn");
const chordGrid = document.querySelector(".chord-grid");
function setActiveLine(line) {
  document.querySelectorAll(".score-line").forEach(item => {
    item.classList.remove("active");
  });

  activeLine = line;
  activeLine.classList.add("active");

  const lyricRow = activeLine.querySelector(".lyric-row");
  if (lyricRow) {
    activeLyricRow = lyricRow;
  }
}

function getCaretOffset(element) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  const preRange = range.cloneRange();

  preRange.selectNodeContents(element);
  preRange.setEnd(range.endContainer, range.endOffset);

  return preRange.toString().length;
}
function getCaretLeftPx(element) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return 0;
  }

  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(true);

  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  range.insertNode(marker);

  const markerRect = marker.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  const left = markerRect.left - elementRect.left;

  marker.remove();

  selection.removeAllRanges();
  selection.addRange(range);

  return Math.max(0, left);
}

function updateCaretInfo(event) {
  const lyricRow = event.target.closest(".lyric-row");

  if (!lyricRow) return;

  activeLyricRow = lyricRow;
  const line = lyricRow.closest(".score-line");
  setActiveLine(line);

  lastCaretOffset = getCaretOffset(lyricRow);
}

function createChordChip(chord, leftPx) {
  const chip = document.createElement("span");

  chip.className = "chord-chip";
  chip.textContent = chord;
  chip.style.left = `${leftPx}px`;
  chip.dataset.left = leftPx;
  chip.draggable = false;

chip.addEventListener("mousedown", event => {
  startDragChord(event, chip);
});
function startDragChord(event, chip) {
  event.preventDefault();

  const chordRow = chip.parentElement;
  const chordRowRect = chordRow.getBoundingClientRect();

  chip.classList.add("dragging");

  function moveChord(moveEvent) {
    let newLeft = moveEvent.clientX - chordRowRect.left;

    newLeft = Math.max(0, newLeft);
    newLeft = Math.min(newLeft, chordRow.clientWidth - chip.offsetWidth);

    chip.style.left = `${newLeft}px`;
    chip.dataset.left = newLeft;
  }

  function stopDragChord() {
    chip.classList.remove("dragging");
    document.removeEventListener("mousemove", moveChord);
    document.removeEventListener("mouseup", stopDragChord);
  }

  document.addEventListener("mousemove", moveChord);
  document.addEventListener("mouseup", stopDragChord);
}

  chip.addEventListener("dblclick", () => {
    const next = prompt("修改和弦", chip.textContent);
    if (next && next.trim()) {
      chip.textContent = next.trim();
    }
  });

  chip.addEventListener("contextmenu", event => {
    event.preventDefault();
    chip.remove();
  });

  return chip;
}

function insertChord(chord) {
  if (!activeLine) {
    const firstLine = document.querySelector(".score-line");
    if (firstLine) setActiveLine(firstLine);
  }

  if (!activeLine) return;

  const chordRow = activeLine.querySelector(".chord-row");

  let leftPx = 0;

if (activeLyricRow && activeLine.contains(activeLyricRow)) {
  leftPx = getCaretLeftPx(activeLyricRow);
  lastCaretOffset = getCaretOffset(activeLyricRow);
}

const chip = createChordChip(chord, leftPx);
chordRow.appendChild(chip);
}

function convertExistingChordText(chordRow) {
  const text = chordRow.textContent.trim();

  if (!text) return;

  chordRow.textContent = "";

  const chords = text.split(/\s+/);

  chords.forEach((chord, index) => {
    const chip = createChordChip(chord, index * 70);
    chordRow.appendChild(chip);
  });
}

function createScoreLine(chords = "", lyrics = "輸入歌詞") {
  const line = document.createElement("div");
  line.className = "score-line";

  const chordRow = document.createElement("div");
  chordRow.className = "chord-row";
  chordRow.contentEditable = "false";

  const lyricRow = document.createElement("div");
  lyricRow.className = "lyric-row";
  lyricRow.contentEditable = "true";
  lyricRow.textContent = lyrics;

  line.appendChild(chordRow);
  line.appendChild(lyricRow);

  line.addEventListener("click", () => {
    setActiveLine(line);
  });

  lyricRow.addEventListener("click", updateCaretInfo);
  lyricRow.addEventListener("keyup", updateCaretInfo);
  lyricRow.addEventListener("input", updateCaretInfo);

  if (chords) {
    chords.split(/\s+/).forEach((chord, index) => {
      chordRow.appendChild(createChordChip(chord, index * 6));
    });
  }

  return line;
}

function createSectionTitle(text = "[段落]") {
  const section = document.createElement("div");
  section.className = "section-title";
  section.contentEditable = "true";
  section.textContent = text;
  return section;
}

function insertSection(text) {
  const section = createSectionTitle(text);

  if (activeLine) {
    activeLine.insertAdjacentElement("afterend", section);
  } else {
    scoreBody.appendChild(section);
  }
}

function addNewLine() {
  const newLine = createScoreLine("", "輸入歌詞");

  if (activeLine) {
    activeLine.insertAdjacentElement("afterend", newLine);
  } else {
    scoreBody.appendChild(newLine);
  }

  setActiveLine(newLine);
  const lyricRow = newLine.querySelector(".lyric-row");
  lyricRow.focus();
}

function addNewSection() {
  const section = createSectionTitle("[段落]");
  scoreBody.appendChild(section);
  section.focus();
}

function updateZoom() {
  pageScale.style.transform = `scale(${zoom})`;
  zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
}

function bindExistingLines() {
  document.querySelectorAll(".score-line").forEach(line => {
    line.addEventListener("click", () => {
      setActiveLine(line);
    });

    const lyricRow = line.querySelector(".lyric-row");
    if (lyricRow) {
      lyricRow.addEventListener("click", updateCaretInfo);
      lyricRow.addEventListener("keyup", updateCaretInfo);
      lyricRow.addEventListener("input", updateCaretInfo);
    }

    const chordRow = line.querySelector(".chord-row");
    if (chordRow) {
      convertExistingChordText(chordRow);
      chordRow.contentEditable = "false";
    }
  });
}

document.querySelectorAll(".chord-btn").forEach(button => {
  button.addEventListener("click", () => {
    insertChord(button.textContent);
  });
});
function createChordButton(chordName) {
  const button = document.createElement("button");
  button.className = "chord-btn";
  button.textContent = chordName;

  button.addEventListener("click", () => {
    insertChord(chordName);
  });

  chordGrid.appendChild(button);
}

function saveCustomChords() {
  const chords = Array.from(document.querySelectorAll(".chord-btn"))
    .map(button => button.textContent);

  localStorage.setItem("meloCustomChords", JSON.stringify(chords));
}

function loadCustomChords() {
  const saved = localStorage.getItem("meloCustomChords");
  if (!saved) return;

  const chords = JSON.parse(saved);
  const existing = Array.from(document.querySelectorAll(".chord-btn"))
    .map(button => button.textContent);

  chords.forEach(chord => {
    if (!existing.includes(chord)) {
      createChordButton(chord);
    }
  });
}

addCustomChordBtn.addEventListener("click", () => {
  const chordName = customChordInput.value.trim();

  if (!chordName) return;

  createChordButton(chordName);
  saveCustomChords();

  customChordInput.value = "";
});

customChordInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    addCustomChordBtn.click();
  }
});

loadCustomChords();

document.querySelectorAll(".section-btn").forEach(button => {
  button.addEventListener("click", () => {
    insertSection(button.textContent);
  });
});

addLineBtn.addEventListener("click", addNewLine);
addSectionBtn.addEventListener("click", addNewSection);

zoomInBtn.addEventListener("click", () => {
  zoom = Math.min(1.5, zoom + 0.1);
  updateZoom();
});

zoomOutBtn.addEventListener("click", () => {
  zoom = Math.max(0.5, zoom - 0.1);
  updateZoom();
});

printBtn.addEventListener("click", () => {
  window.print();
});

document.addEventListener("keydown", event => {
  if (event.key === "Enter" && event.target.classList.contains("lyric-row")) {
    event.preventDefault();
    addNewLine();
  }
});

bindExistingLines();

const firstLine = document.querySelector(".score-line");
if (firstLine) {
  setActiveLine(firstLine);
}

updateZoom();