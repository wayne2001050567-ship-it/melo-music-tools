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
const saveProjectBtn = document.getElementById("saveProjectBtn");
const loadProjectBtn = document.getElementById("loadProjectBtn");
const loadProjectInput = document.getElementById("loadProjectInput");
const lyricsPasteBox = document.getElementById("lyricsPasteBox");
const generateLyricsBtn = document.getElementById("generateLyricsBtn");
const customChordInput = document.getElementById("customChordInput");
const addCustomChordBtn = document.getElementById("addCustomChordBtn");
const chordGrid = document.querySelector(".chord-grid");
const lyricMinusBtn = document.getElementById("lyricMinusBtn");
const lyricPlusBtn = document.getElementById("lyricPlusBtn");
const lyricSizeLabel = document.getElementById("lyricSizeLabel");
let lyricFontSize = 24;
const lineHeightMinusBtn = document.getElementById("lineHeightMinusBtn");
const lineHeightPlusBtn = document.getElementById("lineHeightPlusBtn");
const lineHeightLabel = document.getElementById("lineHeightLabel");
const compactModeBtn = document.getElementById("compactModeBtn");
let lyricLineHeight = 1.4;
const chordMinusBtn = document.getElementById("chordMinusBtn");
const chordPlusBtn = document.getElementById("chordPlusBtn");
const chordSizeLabel = document.getElementById("chordSizeLabel");
let chordFontSize = 15;
const deleteBlockBtn = document.getElementById("deleteBlockBtn");
const playModeBtn =
    document.getElementById("playModeBtn");

const playModeSelect =
    document.getElementById("playModeSelect");


deleteBlockBtn.addEventListener("click", () => {
  if (!activeLine) {
    alert("請先點選要刪除的譜行或段落。");
    return;
  }

  const ok = confirm("確定要刪除目前這一行嗎？");
  if (!ok) return;

  const nextTarget =
    activeLine.nextElementSibling ||
    activeLine.previousElementSibling;

  activeLine.remove();
  activeLine = null;
  activeLyricRow = null;

  if (nextTarget && nextTarget.classList.contains("score-line")) {
    setActiveLine(nextTarget);
  }
});

function updateChordFontSize() {
  chordSizeLabel.textContent = chordFontSize;

  document.querySelectorAll(".chord-chip").forEach(chip => {
    chip.style.fontSize = chordFontSize + "px";
  });
}

chordPlusBtn.addEventListener("click", () => {
  chordFontSize++;
  updateChordFontSize();
});

chordMinusBtn.addEventListener("click", () => {
  if (chordFontSize <= 10) return;
  chordFontSize--;
  updateChordFontSize();
});

function updateLineHeight() {
  lineHeightLabel.textContent = lyricLineHeight.toFixed(1);

  document.querySelectorAll(".lyric-row").forEach(row => {
    row.style.lineHeight = lyricLineHeight;
  });

  document.querySelectorAll(".score-line").forEach(line => {
    line.style.marginBottom = lyricLineHeight <= 1.2 ? "2px" : "4px";
  });
}

lineHeightPlusBtn.addEventListener("click", () => {
  lyricLineHeight = Math.min(2.2, lyricLineHeight + 0.1);
  updateLineHeight();
});

lineHeightMinusBtn.addEventListener("click", () => {
  lyricLineHeight = Math.max(1.0, lyricLineHeight - 0.1);
  updateLineHeight();
});

compactModeBtn.addEventListener("click", () => {
  lyricFontSize = 18;
  lyricLineHeight = 1.15;

  document.querySelector(".page").style.padding = "30px 52px";
  document.querySelector(".score-header").style.marginBottom = "16px";

  updateLyricFontSize();
  updateLineHeight();
});

function updateLyricFontSize(){

    lyricSizeLabel.textContent = lyricFontSize;

    document.querySelectorAll(".lyric-row").forEach(row=>{

        row.style.fontSize = lyricFontSize+"px";

    });

}
lyricPlusBtn.addEventListener("click",()=>{

    lyricFontSize++;

    updateLyricFontSize();

});

lyricMinusBtn.addEventListener("click",()=>{

    if(lyricFontSize<=12)return;

    lyricFontSize--;

    updateLyricFontSize();

});
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
  const lyricRow = event.target.closest(".lyric-row, .section-title");

  if (!lyricRow) return;

  activeLyricRow = lyricRow;
  const line = lyricRow.closest(".score-line");
  setActiveLine(line);

  lastCaretOffset = getCaretOffset(lyricRow);
}

function createChordChip(chord, leftPx = 0) {
  const chip = document.createElement("span");

  const safeLeft = Number(leftPx) || 0;

  chip.className = "chord-chip";
  chip.textContent = chord;
  chip.style.left = `${safeLeft}px`;
  chip.dataset.left = safeLeft;
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

if (activeLine.classList.contains("section-line")) {
  chip.style.left = "";
  chip.dataset.left = 0;
}

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
  const sectionLine = document.createElement("div");
  sectionLine.className = "section-line score-line";

  const section = document.createElement("div");
  section.className = "section-title";
  section.contentEditable = "true";
  section.textContent = text;

  const chordRow = document.createElement("div");
  chordRow.className = "chord-row section-chord-row";
  chordRow.contentEditable = "false";

  sectionLine.appendChild(section);
  sectionLine.appendChild(chordRow);

  sectionLine.addEventListener("click", () => {
    setActiveLine(sectionLine);
  });

  section.addEventListener("click", updateCaretInfo);
  section.addEventListener("keyup", updateCaretInfo);
  section.addEventListener("input", updateCaretInfo);

  return sectionLine;
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
  const hasChips = chordRow.querySelectorAll(".chord-chip").length > 0;

  if (!hasChips) {
    convertExistingChordText(chordRow);
  }

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
function exportProjectData() {
  return {
    version: "melo-guitar-v2-beta",
    title: document.querySelector(".song-title")?.textContent || "",
    leftInfo: document.querySelector(".song-info-left")?.textContent || "",
    rightInfo: document.querySelector(".song-info-right")?.textContent || "",
    blocks: Array.from(scoreBody.children).map(block => {
      if (block.classList.contains("section-line")) {
  return {
    type: "section",
    text: block.querySelector(".section-title")?.textContent || "[段落]",
    chords: Array.from(block.querySelectorAll(".chord-chip")).map(chip => ({
      text: chip.textContent,
      left: Number(chip.dataset.left || 0)
    }))
  };
}

      if (block.classList.contains("score-line")) {
        return {
          type: "line",
          lyrics: block.querySelector(".lyric-row")?.textContent || "",
          chords: Array.from(block.querySelectorAll(".chord-chip")).map(chip => ({
            text: chip.textContent,
            left: Number(chip.dataset.left || 0)
          }))
        };
      }

      return null;
    }).filter(Boolean)
  };
}

function downloadProjectFile() {
  const data = exportProjectData();
  const fileText = JSON.stringify(data, null, 2);
  const blob = new Blob([fileText], { type: "application/json" });

  const title = data.title.trim() || "melo-guitar-score";
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeTitle}.melo`;
  link.click();

  URL.revokeObjectURL(link.href);
}

function importProjectData(data) {
  document.querySelector(".song-title").textContent = data.title || "歌曲名稱";
  document.querySelector(".song-info-left").textContent = data.leftInfo || "演唱：\n詞：\n曲：";
  document.querySelector(".song-info-right").textContent = data.rightInfo || "原調：C　Capo：0\n男調：C　女調：C\n刷法：\n指法：";
  scoreBody.innerHTML = "";

  data.blocks.forEach(block => {
    if (block.type === "section") {
  const sectionLine = createSectionTitle(block.text || "[段落]");
  const chordRow = sectionLine.querySelector(".chord-row");

  if (block.chords) {
    block.chords.forEach(chord => {
      chordRow.appendChild(createChordChip(chord.text, chord.left || 0));
    });
  }

  scoreBody.appendChild(sectionLine);
}

    if (block.type === "line") {
      const line = createScoreLine("", block.lyrics || "");
      const chordRow = line.querySelector(".chord-row");

      block.chords.forEach(chord => {
  const left = Number(chord.left) || 0;
  chordRow.appendChild(createChordChip(chord.text, left));
});

      scoreBody.appendChild(line);
    }
  });

  bindExistingLines();

  const firstLine = document.querySelector(".score-line");
  if (firstLine) setActiveLine(firstLine);
}

saveProjectBtn.addEventListener("click", downloadProjectFile);

loadProjectBtn.addEventListener("click", () => {
  loadProjectInput.click();
});

loadProjectInput.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      importProjectData(data);
    } catch (error) {
      alert("專案檔讀取失敗，請確認檔案格式是否正確。");
    }
  };

  reader.readAsText(file);
});

function generateLinesFromLyrics() {
  const text = lyricsPasteBox.value.trim();

  if (!text) {
    alert("請先貼上歌詞。");
    return;
  }

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) return;

  const confirmReplace = confirm("要清空目前譜行，改用貼上的歌詞重新產生嗎？");

  if (!confirmReplace) return;

  scoreBody.innerHTML = "";

  scoreBody.appendChild(createSectionTitle("[前奏]"));

  lines.forEach(lyric => {
    const line = createScoreLine("", lyric);
    scoreBody.appendChild(line);
  });

  bindExistingLines();

  const firstLine = document.querySelector(".score-line");
  if (firstLine) setActiveLine(firstLine);
}

generateLyricsBtn.addEventListener("click", generateLinesFromLyrics);
const sharpNotes = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
];

const flatToSharp = {
    "Db": "C#",
    "Eb": "D#",
    "Gb": "F#",
    "Ab": "G#",
    "Bb": "A#"
};

const sharpToFlat = {
    "C#": "Db",
    "D#": "Eb",
    "F#": "Gb",
    "G#": "Ab",
    "A#": "Bb"
};

playModeBtn.addEventListener("click", () => {

    const currentMode = playModeSelect.value;

    if (currentMode === "C") {

        // Play C 轉成 Play G
        transposeAllChords(7);

        playModeSelect.value = "G";
        playModeBtn.textContent = "切換成 Play C";

    } else {

        // Play G 轉成 Play C
        transposeAllChords(-7);

        playModeSelect.value = "C";
        playModeBtn.textContent = "切換成 Play G";
    }
});
function updatePlayModeButton() {
  if (playModeSelect.value === "C") {
    playModeBtn.textContent = "切換成 Play G";
  } else {
    playModeBtn.textContent = "切換成 Play C";
  }
}

playModeSelect.addEventListener("change", updatePlayModeButton);

// 網頁一開啟時立刻同步一次
updatePlayModeButton();


function transposeAllChords(semitones) {

    const chordElements =
        document.querySelectorAll(".chord-chip");

    console.log("找到和弦數量：", chordElements.length);

    chordElements.forEach(chordElement => {

        const oldChord =
            chordElement.textContent.trim();

        if (!oldChord || oldChord === "|" || oldChord === "-") {
            return;
        }

        const newChord =
            transposeChordName(oldChord, semitones);

        chordElement.textContent = newChord;
    });
}

function transposeChordName(chordName, semitones){

    if(!chordName){
        return chordName;
    }

    const chordParts = chordName.split("/");

    const mainChord =
    transposeSingleChordPart(
        chordParts[0],
        semitones
    );

    if(chordParts.length === 1){
        return mainChord;
    }

    const bassNote =
    transposeSingleChordPart(
        chordParts[1],
        semitones
    );

    return mainChord + "/" + bassNote;
}


function transposeSingleChordPart(chordPart, semitones){

    const match =
    chordPart.match(/^([A-G])([#b]?)(.*)$/);

    if(!match){
        return chordPart;
    }

    const rootLetter = match[1];
    const accidental = match[2];
    const chordSuffix = match[3];

    let originalRoot =
    rootLetter + accidental;

    if(flatToSharp[originalRoot]){
        originalRoot =
        flatToSharp[originalRoot];
    }

    const originalIndex =
    sharpNotes.indexOf(originalRoot);

    if(originalIndex === -1){
        return chordPart;
    }

    const newIndex =
    (
        originalIndex +
        semitones +
        sharpNotes.length
    ) % sharpNotes.length;

    const newRoot =
    sharpNotes[newIndex];

    return newRoot + chordSuffix;
}