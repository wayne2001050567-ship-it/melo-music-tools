let activeLine = null;
let activeLyricRow = null;
let lastCaretOffset = 0;
let zoom = 1;

const scoreBody = document.getElementById("scoreBody");
const pageScale = document.getElementById("pageScale");
const zoomLabel = document.getElementById("zoomLabel");
const addLineBtn = document.getElementById("addLineBtn");
const addSharedLyricBtn = document.getElementById("addSharedLyricBtn");
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
    if (!activeLine.contains(activeLyricRow)) {
      activeLyricRow = lyricRow;
    }
  } else {
    activeLyricRow = null;
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

// 統一歌詞字體大小與行距
lyricRow.style.fontSize = lyricFontSize + "px";
lyricRow.style.lineHeight = lyricLineHeight;
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
// ===== 新增同組歌詞 =====

function addSharedLyric() {
  if (!activeLine || activeLine.classList.contains("section-line")) {
    alert("請先選取一個有歌詞的譜行。");
    return;
  }

  const lyricRows = activeLine.querySelectorAll(".lyric-row");

  if (lyricRows.length === 0) return;

  const newLyricRow = document.createElement("div");

  newLyricRow.className = "lyric-row";
  newLyricRow.contentEditable = "true";
  newLyricRow.textContent = "輸入第二段歌詞";

  // 沿用目前的歌詞大小與行距
  newLyricRow.style.fontSize = lyricFontSize + "px";
  newLyricRow.style.lineHeight = lyricLineHeight;

  newLyricRow.addEventListener("click", updateCaretInfo);
  newLyricRow.addEventListener("keyup", updateCaretInfo);
  newLyricRow.addEventListener("input", updateCaretInfo);

  // 放在同一個譜行的最後
  activeLine.appendChild(newLyricRow);

  activeLyricRow = newLyricRow;
  newLyricRow.focus();
}

// ===== 刪除目前選取的同組歌詞 =====

function deleteSharedLyric() {
  if (!activeLine || !activeLyricRow) {
    alert("請先點擊想刪除的歌詞行。");
    return;
  }

  const lyricRows = activeLine.querySelectorAll(".lyric-row");

  if (lyricRows.length <= 1) {
    alert("每組和弦至少需要保留一行歌詞。");
    return;
  }

  if (!activeLine.contains(activeLyricRow)) {
    alert("請先選取想刪除的歌詞行。");
    return;
  }

  const rowToDelete = activeLyricRow;

  const remainingRow = Array.from(lyricRows).find(
    row => row !== rowToDelete
  );

  rowToDelete.remove();

  activeLyricRow = remainingRow;
  remainingRow.focus();
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
addSharedLyricBtn.addEventListener("click", addSharedLyric);
const deleteSharedLyricBtn = document.getElementById("deleteSharedLyricBtn");

deleteSharedLyricBtn.addEventListener("click", deleteSharedLyric);
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
// ===== 匯出 A4 PNG 圖片 =====

const exportPngBtn = document.getElementById("exportPngBtn");

exportPngBtn.addEventListener("click", async () => {

  const page = document.getElementById("page");

  if (typeof html2canvas === "undefined") {
    alert("圖片匯出工具尚未載入，請確認網路連線。");
    return;
  }

  // 避免重複點擊
  exportPngBtn.disabled = true;
  exportPngBtn.textContent = "圖片產生中...";

  try {

    // 等待字體載入
    if (document.fonts) {
      await document.fonts.ready;
    }

const canvas = await html2canvas(page, {
  scale: 3,
  useCORS: true,
  backgroundColor: "#ffffff",
  logging: false,

  onclone: clonedDocument => {

    // 移除編輯中的選取效果
    clonedDocument.querySelectorAll(".score-line.active")
      .forEach(line => line.classList.remove("active"));

    // 匯出圖片時，讓歌詞以一般文字模式渲染
    clonedDocument.querySelectorAll(".lyric-row")
      .forEach(row => {
        row.removeAttribute("contenteditable");
      });

  }
});

    const imageUrl = canvas.toDataURL("image/png");

    const songTitle =
      document.querySelector(".song-title")?.textContent.trim()
      || "迷錄吉他譜";

    const safeTitle = songTitle.replace(/[\\/:*?"<>|]/g, "_");

    const link = document.createElement("a");

    link.download = `${safeTitle}.png`;
    link.href = imageUrl;

    document.body.appendChild(link);
    link.click();
    link.remove();

  } catch (error) {

    console.error("PNG 匯出失敗：", error);
    alert("圖片匯出失敗，請開啟開發者工具查看錯誤。");

  } finally {

    exportPngBtn.disabled = false;
    exportPngBtn.textContent = "匯出 PNG";

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

    // 儲存同一組和弦下的所有歌詞
    lyrics: Array.from(block.querySelectorAll(".lyric-row"))
      .map(row => row.textContent),

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

  // 相容舊版單行歌詞與新版多行歌詞
  const lyricsArray = Array.isArray(block.lyrics)
    ? block.lyrics
    : [block.lyrics || ""];

  // 建立第一行歌詞
  const line = createScoreLine("", lyricsArray[0] || "");

  const chordRow = line.querySelector(".chord-row");

  // 還原和弦
  (block.chords || []).forEach(chord => {
    const left = Number(chord.left) || 0;
    chordRow.appendChild(createChordChip(chord.text, left));
  });

  // 還原第二行以後的共用歌詞
  lyricsArray.slice(1).forEach(lyric => {

    const newLyricRow = document.createElement("div");

    newLyricRow.className = "lyric-row";
    newLyricRow.contentEditable = "true";
    newLyricRow.textContent = lyric;

    newLyricRow.style.fontSize = lyricFontSize + "px";
    newLyricRow.style.lineHeight = lyricLineHeight;

    newLyricRow.addEventListener("click", updateCaretInfo);
    newLyricRow.addEventListener("keyup", updateCaretInfo);
    newLyricRow.addEventListener("input", updateCaretInfo);

    line.appendChild(newLyricRow);
  });

    scoreBody.appendChild(line);
}

  // 結束 data.blocks.forEach()
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

function updatePlayModeButton() {
  const playModeSelect =
    document.getElementById("playModeSelect");

  const playModeBtn =
    document.getElementById("playModeBtn");

  if (!playModeSelect || !playModeBtn) {
    console.error("找不到 Play 模式選單或按鈕");
    return;
  }

  if (playModeSelect.value === "C") {
    playModeBtn.textContent = "切換成 Play G";
  } else {
    playModeBtn.textContent = "切換成 Play C";
  }
}


function setupPlayModeControls() {
  const playModeSelect =
    document.getElementById("playModeSelect");

  const playModeBtn =
    document.getElementById("playModeBtn");

  if (!playModeSelect || !playModeBtn) {
    console.error("Play 模式控制元件初始化失敗");
    return;
  }

  playModeSelect.addEventListener("change", () => {
    updatePlayModeButton();
  });

  playModeBtn.addEventListener("click", () => {

    if (playModeSelect.value === "C") {

      // Play C 轉成 Play G
      transposeAllChords(7);

      playModeSelect.value = "G";

    } else {

      // Play G 轉成 Play C
      transposeAllChords(-7);

      playModeSelect.value = "C";
    }

    updatePlayModeButton();
  });

  updatePlayModeButton();
}


document.addEventListener("DOMContentLoaded", () => {
  setupPlayModeControls();
});


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
// 點擊歌詞時，記住目前選取的歌詞行
scoreBody.addEventListener("click", event => {
  const lyricRow = event.target.closest(".lyric-row");

  if (!lyricRow) return;

  const line = lyricRow.closest(".score-line");

  if (!line) return;

  setActiveLine(line);
  activeLyricRow = lyricRow;
});
// ===== 迷錄吉他譜：吉他和弦指型圖 =====

// 建立六弦吉他和弦圖
function createChordDiagram(name, frets) {
  const item = document.createElement("div");
  item.className = "chord-diagram-item";

  const title = document.createElement("div");
  title.textContent = name;
  item.appendChild(title);

  // SVG 畫布
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");

  svg.setAttribute("width", "85");
  svg.setAttribute("height", "115");
  svg.setAttribute("viewBox", "0 0 85 115");

  // 六條琴弦（左邊是第六弦，右邊是第一弦）
  for (let i = 0; i < 6; i++) {
    const x = 10 + i * 13;

    const string = document.createElementNS(svgNS, "line");
    string.setAttribute("x1", x);
    string.setAttribute("y1", 20);
    string.setAttribute("x2", x);
    string.setAttribute("y2", 100);
    string.setAttribute("stroke", "#333");
    string.setAttribute("stroke-width", "1");

    svg.appendChild(string);
  }

  // 五條橫線，形成四個琴格
  for (let i = 0; i < 5; i++) {
    const y = 20 + i * 20;

    const fret = document.createElementNS(svgNS, "line");
    fret.setAttribute("x1", 10);
    fret.setAttribute("y1", y);
    fret.setAttribute("x2", 75);
    fret.setAttribute("y2", y);
    fret.setAttribute("stroke", "#333");
    fret.setAttribute("stroke-width", i === 0 ? "3" : "1");

    svg.appendChild(fret);
  }
// ===== 繪製橫按線條 =====

const barre = chordBarres[name];

if (barre) {
  const x1 = 10 + (6 - barre.from) * 13;
  const x2 = 10 + (6 - barre.to) * 13;

  const y = 20 + (barre.fret - 0.5) * 20;

  const barreLine = document.createElementNS(svgNS, "line");

  barreLine.setAttribute("x1", x1);
  barreLine.setAttribute("y1", y);
  barreLine.setAttribute("x2", x2);
  barreLine.setAttribute("y2", y);

  barreLine.setAttribute("stroke", "#222");
  barreLine.setAttribute("stroke-width", "9");
  barreLine.setAttribute("stroke-linecap", "round");

  svg.appendChild(barreLine);
}
  // 畫出按弦位置與空弦／不彈弦
  frets.forEach((fretNumber, stringIndex) => {
    const x = 10 + stringIndex * 13;

    if (fretNumber > 0) {
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", x);
      dot.setAttribute("cy", 20 + (fretNumber - 0.5) * 20);
      dot.setAttribute("r", 5);
      dot.setAttribute("fill", "#222");

      svg.appendChild(dot);
    } else {
      const mark = document.createElementNS(svgNS, "text");
      mark.setAttribute("x", x);
      mark.setAttribute("y", 13);
      mark.setAttribute("text-anchor", "middle");
      mark.setAttribute("font-size", "12");
      mark.textContent = fretNumber === 0 ? "○" : "×";

      svg.appendChild(mark);
    }
  });

  item.appendChild(svg);

  return item;
}

// ===== 自動產生右側吉他和弦表 =====

// 常用和弦指型：由第六弦到第一弦
// -1 = 不彈，0 = 空弦，正數 = 琴格
// ===== 吉他和弦指型資料庫 =====
// 由第六弦到第一弦
// -1 = 不彈、0 = 空弦、正數 = 琴格

const chordFingerings = {
  // 大三和弦
  C:  [-1, 3, 2, 0, 1, 0],
  D:  [-1, -1, 0, 2, 3, 2],
  E:  [0, 2, 2, 1, 0, 0],
  F:  [1, 3, 3, 2, 1, 1],
  G:  [3, 2, 0, 0, 0, 3],
  A:  [-1, 0, 2, 2, 2, 0],

  // 小三和弦
  Am: [-1, 0, 2, 2, 1, 0],
  Bm: [-1, 2, 4, 4, 3, 2],
  Dm: [-1, -1, 0, 2, 3, 1],
  Em: [0, 2, 2, 0, 0, 0],

  // 屬七和弦
  B7: [-1, 2, 1, 2, 0, 2],
  C7: [-1, 3, 2, 3, 1, 0],
  D7: [-1, -1, 0, 2, 1, 2],
  E7: [0, 2, 0, 1, 0, 0],
  G7: [3, 2, 0, 0, 0, 1],
  A7: [-1, 0, 2, 0, 2, 0],

  // 小七和弦
  Am7: [-1, 0, 2, 0, 1, 0],
  Dm7: [-1, -1, 0, 2, 1, 1],
  Em7: [0, 2, 0, 0, 0, 0],

  // 大七和弦
  Cmaj7: [-1, 3, 2, 0, 0, 0]
};
// ===== 橫按和弦資料 =====
// fret：橫按琴格
// from：起始弦（6 = 第六弦）
// to：結束弦（1 = 第一弦）

const chordBarres = {
  F: {
    fret: 1,
    from: 6,
    to: 1
  },

  Bm: {
    fret: 2,
    from: 5,
    to: 1
  }
};

const chordDiagramList = document.getElementById("chordDiagramList");

function updateChordDiagrams() {
  if (!chordDiagramList) return;

  chordDiagramList.innerHTML = "";

  const chordNames = new Set();

  // 從譜面收集所有和弦
  scoreBody.querySelectorAll(".chord-chip").forEach(chip => {
    const name = chip.textContent.trim();

    if (name && chordFingerings[name]) {
      chordNames.add(name);
    }
  });

  // 依照和弦出現順序產生指型圖
  chordNames.forEach(name => {
    const diagram = createChordDiagram(
      name,
      chordFingerings[name]
    );

    chordDiagramList.appendChild(diagram);
  });
}

// 監聽樂譜變化，自動更新和弦表
const chordDiagramObserver = new MutationObserver(() => {
  updateChordDiagrams();
});

chordDiagramObserver.observe(scoreBody, {
  childList: true,
  subtree: true,
  characterData: true
});

// 初次載入時產生和弦表
updateChordDiagrams();
// ===== 歌詞貼上時，自動移除來源格式 =====

document.addEventListener("paste", function (event) {
  const lyricRow = event.target.closest(".lyric-row");

  // 只有貼在歌詞區域時才處理
  if (!lyricRow) return;

  event.preventDefault();

  // 只取得純文字，不保留來源網站的字體或樣式
  const text = event.clipboardData.getData("text/plain");

  // 在目前游標位置插入純文字
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  range.deleteContents();
  range.insertNode(document.createTextNode(text));

  // 將游標移到貼上文字的後方
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);

  // 通知編輯器內容已改變
  lyricRow.dispatchEvent(new Event("input", { bubbles: true }));
});