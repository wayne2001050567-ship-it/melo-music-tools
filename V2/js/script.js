let activeLine = null;
let activeLyricRow = null;
let lastCaretOffset = 0;
let zoom = 1;
let compactMode = false;
let projectChordDiagrams = [];

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
const customChordGrid = document.getElementById("customChordGrid");
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
  compactMode = true;
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
  renderChordText(chip, chord);
  chip.style.fontSize = chordFontSize + "px";
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
    const next = prompt("修改和弦", getChordText(chip));
    if (next && next.trim()) {
      renderChordText(chip, next.trim());
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

const chordKeySelect = document.getElementById("chordKeySelect");
const chordScaleModeSelect = document.getElementById("chordScaleModeSelect");
const chordNameModeBtn = document.getElementById("chordNameModeBtn");
const chordDegreeModeBtn = document.getElementById("chordDegreeModeBtn");
let chordInputMode = "name";
let customChords = [];

// 資料只保存純文字；子節點專門負責可讀的升降記號與上標。
function getChordText(element) {
  return element.dataset.chordText ?? element.textContent;
}

function renderChordText(element, text) {
  element.dataset.chordText = text;
  element.setAttribute("aria-label", text);
  element.replaceChildren();
  MeloHarmony.displayTokens(text).forEach(token => {
    const span = document.createElement("span");
    span.className = "chord-token chord-token-" + token.kind;
    span.textContent = token.text;
    element.appendChild(span);
  });
}

function createChordButton(chordName, target = customChordGrid, entry = null) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chord-btn";
  renderChordText(button, chordName);
  if (entry) {
    const otherLabel = chordInputMode === "name" ? entry.numericLabel : entry.chordName;
    button.title = `${otherLabel}｜${entry.description}`;
    button.setAttribute("aria-label", `${chordName}，${otherLabel}，${entry.description}`);
    if (entry.target) {
      const hint = document.createElement("small");
      hint.className = "chord-target-hint";
      hint.setAttribute("aria-hidden", "true");
      hint.textContent = "往 " + (chordInputMode === "name" ? entry.target.chordName :
        (entry.target.alteration < 0 ? "b".repeat(-entry.target.alteration) : "#".repeat(entry.target.alteration)) +
        entry.target.degree + entry.target.suffix);
      button.appendChild(hint);
    }
  }
  // 保留歌詞游標，沿用現有的和弦插入與定位流程。
  button.addEventListener("mousedown", event => event.preventDefault());
  button.addEventListener("click", () => insertChord(chordName));
  target.appendChild(button);
}

function renderChordPalette() {
  const entries = MeloHarmony.buildPalette(chordKeySelect.value, chordScaleModeSelect.value);
  MeloHarmony.categories.forEach(category => {
    const grid = document.getElementById(category.grid);
    grid.replaceChildren();
    entries.filter(entry => entry.category === category.id).forEach(entry => {
      const label = chordInputMode === "degree" ? entry.numericLabel : entry.chordName;
      createChordButton(label, grid, entry);
    });
  });
  chordNameModeBtn.setAttribute("aria-pressed", String(chordInputMode === "name"));
  chordDegreeModeBtn.setAttribute("aria-pressed", String(chordInputMode === "degree"));
  document.getElementById("chordModeHint").textContent = chordInputMode === "degree"
    ? "點選後直接寫入數字級數；切換調性不改寫譜面。"
    : "點選按鈕，在譜面插入和弦名稱。";
}

chordKeySelect.addEventListener("change", renderChordPalette);
chordScaleModeSelect.addEventListener("change", renderChordPalette);
chordNameModeBtn.addEventListener("click", () => {
  chordInputMode = "name";
  renderChordPalette();
});
chordDegreeModeBtn.addEventListener("click", () => {
  chordInputMode = "degree";
  renderChordPalette();
});
document.querySelectorAll(".chord-btn[data-chord]").forEach(button => {
  button.addEventListener("mousedown", event => event.preventDefault());
  button.addEventListener("click", () => insertChord(button.dataset.chord));
});

function saveCustomChords() {
  try {
    // 新鍵只存自訂項目；保留舊鍵，不將各調的預設按鈕混入。
    localStorage.setItem("meloCustomChordsV2", JSON.stringify(customChords));
  } catch (error) {
    console.warn("自訂和弦無法儲存：", error);
    alert("自訂項目已加入，但瀏覽器無法保存；關閉頁面後可能遺失。");
  }
}

function loadCustomChords() {
  try {
    const current = localStorage.getItem("meloCustomChordsV2");
    const saved = current === null ? localStorage.getItem("meloCustomChords") : current;
    if (saved === null) return;
    const chords = JSON.parse(saved);
    if (!Array.isArray(chords) || chords.some(chord => typeof chord !== "string")) {
      throw new Error("自訂和弦格式無效");
    }
    const legacyDefaults = new Set([
      "C", "Dm", "Em", "F", "G", "Am", "Bdim", "C7", "G7", "Fmaj7", "Csus4", "Gsus4", "|", "-"
    ]);
    customChords = [...new Set(chords.map(chord => chord.trim()).filter(chord =>
      chord && (current !== null || !legacyDefaults.has(chord))
    ))];
    customChords.forEach(chord => createChordButton(chord));
  } catch (error) {
    console.warn("自訂和弦讀取失敗：", error);
  }
}

addCustomChordBtn.addEventListener("click", () => {
  const chordName = customChordInput.value.trim();
  if (!chordName) return;
  if (!customChords.includes(chordName)) {
    customChords.push(chordName);
    createChordButton(chordName);
    saveCustomChords();
  }
  customChordInput.value = "";
});

customChordInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.isComposing) {
    event.preventDefault();
    addCustomChordBtn.click();
  }
});

renderChordPalette();
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
    version: "melo-guitar-v2-2",
    chordDiagrams: MeloChordDiagrams.normalizeList(projectChordDiagrams),
    settings: {
      lyricFontSize,
      chordFontSize,
      lyricLineHeight,
      compactMode,
      zoom,
      playMode: document.getElementById("playModeSelect").value
    },
    title: document.querySelector(".song-title")?.textContent || "",
    leftInfo: document.querySelector(".song-info-left")?.textContent || "",
    rightInfo: document.querySelector(".song-info-right")?.textContent || "",
    blocks: Array.from(scoreBody.children).map(block => {
      if (block.classList.contains("section-line")) {
  return {
    type: "section",
    text: block.querySelector(".section-title")?.textContent || "[段落]",
    chords: Array.from(block.querySelectorAll(".chord-chip")).map(chip => ({
      text: getChordText(chip),
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
      text: getChordText(chip),
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

// 先驗證並正規化，任何失敗都不更動目前譜面。
function normalizeProjectData(data) {
  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const fail = message => { throw new Error(message); };
  if (!isObject(data)) fail("專案內容必須是物件。");
  if (data.version !== undefined &&
      !["melo-guitar-v2-beta", "melo-guitar-v2-1", "melo-guitar-v2-2"].includes(data.version)) {
    fail("不支援此專案版本，請使用相容的 V2 專案檔。");
  }
  if (!Array.isArray(data.blocks)) fail("專案缺少有效的譜行資料（blocks）。");

  const text = (value, fallback, label) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string") fail(`${label}必須是文字。`);
    return value;
  };
  const rawSettings = data.settings === undefined ? {} : data.settings;
  if (!isObject(rawSettings)) fail("排版設定必須是物件。");
  const number = (key, fallback, min, max = Infinity) => {
    const value = rawSettings[key] === undefined ? fallback : rawSettings[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
      fail(`排版設定 ${key} 的數值無效。`);
    }
    return value;
  };
  const settings = {
    lyricFontSize: number("lyricFontSize", 24, 12),
    chordFontSize: number("chordFontSize", 15, 10),
    lyricLineHeight: number("lyricLineHeight", 1.4, 1, 2.2),
    zoom: number("zoom", 1, 0.5, 1.5),
    compactMode: rawSettings.compactMode === undefined ? false : rawSettings.compactMode,
    playMode: rawSettings.playMode === undefined ? "C" : rawSettings.playMode
  };
  if (typeof settings.compactMode !== "boolean") fail("緊湊模式設定無效。");
  if (!["C", "G"].includes(settings.playMode)) fail("Play 模式設定無效。");

  const blocks = data.blocks.map((block, index) => {
    const label = `第 ${index + 1} 個譜行`;
    if (!isObject(block) || !["section", "line"].includes(block.type)) {
      fail(`${label}的類型無效。`);
    }
    const rawChords = block.chords === undefined ? [] : block.chords;
    if (!Array.isArray(rawChords)) fail(`${label}的和弦必須是陣列。`);
    const chords = rawChords.map(chord => {
      if (!isObject(chord) || typeof chord.text !== "string") fail(`${label}的和弦格式無效。`);
      // 相容舊檔可能使用字串記錄的座標，但拒絕空字串與非有限值。
      const rawLeft = chord.left === undefined ? 0 : chord.left;
      if (!(typeof rawLeft === "number" ||
          (typeof rawLeft === "string" && rawLeft.trim() !== ""))) {
        fail(`${label}的和弦位置無效。`);
      }
      const left = Number(rawLeft);
      if (!Number.isFinite(left) || left < 0) fail(`${label}的和弦位置無效。`);
      return { text: chord.text, left };
    });
    if (block.type === "section") {
      return { type: "section", text: text(block.text, "[段落]", label), chords };
    }
    const rawLyrics = block.lyrics === undefined ? "" : block.lyrics;
    const lyrics = Array.isArray(rawLyrics) ? rawLyrics : [rawLyrics];
    if (lyrics.some(lyric => typeof lyric !== "string")) fail(`${label}的歌詞必須是文字。`);
    return { type: "line", lyrics: lyrics.length ? lyrics : [""], chords };
  });
  return {
    title: text(data.title, "歌曲名稱", "歌名"),
    leftInfo: text(data.leftInfo, "演唱：\n詞：\n曲：", "左側資訊"),
    rightInfo: text(data.rightInfo, "原調：C　Capo：0\n男調：C　女調：C\n刷法：\n指法：", "右側資訊"),
    settings,
    blocks,
    chordDiagrams: MeloChordDiagrams.normalizeList(data.chordDiagrams)
  };
}

function importProjectData(data) {
  const project = normalizeProjectData(data);
  const fragment = document.createDocumentFragment();

  // 建立過程只操作尚未掛載的節點，不清空原譜或改動編輯狀態。
  project.blocks.forEach(block => {
    const line = block.type === "section"
      ? createSectionTitle(block.text)
      : createScoreLine("", block.lyrics[0]);
    const chordRow = line.querySelector(".chord-row");
    block.chords.forEach(chord => {
      const chip = createChordChip(chord.text, chord.left);
      if (block.type === "section") chip.style.left = "";
      chordRow.appendChild(chip);
    });
    if (block.type === "line") {
      block.lyrics.slice(1).forEach(lyric => {
        const row = document.createElement("div");
        row.className = "lyric-row";
        row.contentEditable = "true";
        row.textContent = lyric;
        row.addEventListener("click", updateCaretInfo);
        row.addEventListener("keyup", updateCaretInfo);
        row.addEventListener("input", updateCaretInfo);
        line.appendChild(row);
      });
    }
    fragment.appendChild(line);
  });

  projectChordDiagrams = project.chordDiagrams;
  scoreBody.replaceChildren(fragment);
  document.querySelector(".song-title").textContent = project.title;
  document.querySelector(".song-info-left").textContent = project.leftInfo;
  document.querySelector(".song-info-right").textContent = project.rightInfo;
  ({ lyricFontSize, chordFontSize, lyricLineHeight, compactMode, zoom } = project.settings);
  document.querySelector(".page").style.padding = compactMode ? "30px 52px" : "";
  document.querySelector(".score-header").style.marginBottom = compactMode ? "16px" : "";
  document.getElementById("playModeSelect").value = project.settings.playMode;
  updatePlayModeButton();
  updateLyricFontSize();
  updateChordFontSize();
  updateLineHeight();
  updateZoom();
  activeLine = null;
  activeLyricRow = null;
  lastCaretOffset = 0;
  if (scoreBody.firstElementChild) setActiveLine(scoreBody.firstElementChild);
  updateChordDiagrams();
}

saveProjectBtn.addEventListener("click", downloadProjectFile);

loadProjectBtn.addEventListener("click", () => {
  loadProjectInput.click();
});

loadProjectInput.addEventListener("change", event => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      importProjectData(data);
    } catch (error) {
      const reason = error instanceof SyntaxError
        ? "檔案不是有效的 JSON。"
        : error.message || "請確認檔案格式是否正確。";
      alert(`專案檔讀取失敗：${reason}`);
    }
  };

  reader.onerror = () => {
    alert("無法讀取專案檔，原譜面已保留。請重新選擇檔案。");
  };
  reader.onabort = () => {
    alert("專案檔讀取已取消，原譜面已保留。");
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
    "Bb": "A#",
    "E#": "F",
    "B#": "C",
    "Cb": "B",
    "Fb": "E"
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
            getChordText(chordElement).trim();

        if (!oldChord || oldChord === "|" || oldChord === "-") {
            return;
        }

        const newChord =
            transposeChordName(oldChord, semitones);

        renderChordText(chordElement, newChord);
    });
}

function transposeChordName(chordName, semitones) {
  return MeloHarmony.transposeName(chordName, semitones);
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

const chordDiagramList = document.getElementById("chordDiagramList");

function updateChordDiagrams() {
  if (!chordDiagramList) return;
  const fragment = document.createDocumentFragment();
  const names = new Set();
  scoreBody.querySelectorAll(".chord-chip").forEach(chip => names.add(getChordText(chip).trim()));
  names.forEach(name => {
    const definition = MeloChordDiagrams.resolve(name, projectChordDiagrams);
    if (definition) fragment.appendChild(MeloChordDiagrams.render(definition));
  });
  chordDiagramList.replaceChildren(fragment);
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
// ===== 自訂和弦圖編輯器 =====
function setupChordDiagramEditor() {
  const dialog = document.getElementById("chordDiagramDialog");
  const form = document.getElementById("chordDiagramForm");
  const templateSelect = document.getElementById("diagramTemplateSelect");
  const nameInput = document.getElementById("diagramNameInput");
  const startInput = document.getElementById("diagramStartFretInput");
  const stringFields = document.getElementById("diagramStringFields");
  const barreFields = document.getElementById("diagramBarreFields");
  const rememberInput = document.getElementById("rememberChordDiagramInput");
  const preview = document.getElementById("chordDiagramPreview");
  const status = document.getElementById("chordDiagramStatus");
  const applyBtn = document.getElementById("applyChordDiagramBtn");
  const addBarreBtn = document.getElementById("addDiagramBarreBtn");
  const deleteProjectBtn = document.getElementById("deleteProjectDiagramBtn");
  const deleteLibraryBtn = document.getElementById("deleteLibraryDiagramBtn");
  const libraryKey = "meloChordDiagramLibraryV1";
  let library = [];
  let libraryReadError = "";
  let choices = [];
  const stringInputs = [];

  try {
    const saved = localStorage.getItem(libraryKey);
    if (saved !== null) library = MeloChordDiagrams.normalizeList(JSON.parse(saved));
  } catch (error) {
    console.warn("個人和弦指型庫讀取失敗：", error);
    libraryReadError = "個人指型庫讀取失敗；原儲存資料未變更，仍可編輯專案指型。";
  }

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.dataset.error = String(isError);
  }

  function numberSelect(values, label) {
    const select = document.createElement("select");
    select.setAttribute("aria-label", label);
    values.forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = text;
      select.appendChild(option);
    });
    return select;
  }

  const fretOptions = [[-1, "× 不彈"], [0, "○ 空弦"],
    ...Array.from({ length: 24 }, (_, index) => [index + 1, `第 ${index + 1} 品`])];
  for (let string = 6; string >= 1; string--) {
    const label = document.createElement("label");
    label.textContent = `第 ${string} 弦`;
    const select = numberSelect(fretOptions, `第 ${string} 弦品位`);
    label.appendChild(select);
    stringFields.appendChild(label);
    stringInputs.push(select);
  }

  function addBarreRow(barre) {
    const row = document.createElement("div");
    row.className = "diagram-barre-row";
    const fields = [
      ["fret", "品位", Array.from({ length: 24 }, (_, i) => [i + 1, String(i + 1)])],
      ["from", "起始弦", [6, 5, 4, 3, 2].map(n => [n, `第 ${n} 弦`])],
      ["to", "結束弦", [5, 4, 3, 2, 1].map(n => [n, `第 ${n} 弦`])]
    ];
    fields.forEach(([key, text, options]) => {
      const label = document.createElement("label");
      label.textContent = text;
      const select = numberSelect(options, `橫按${text}`);
      select.dataset.field = key;
      select.value = String(barre[key]);
      label.appendChild(select);
      row.appendChild(label);
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "移除";
    remove.setAttribute("aria-label", "移除此條橫按");
    remove.addEventListener("click", () => {
      row.remove();
      updatePreview();
    });
    row.appendChild(remove);
    barreFields.appendChild(row);
  }

  function readDraft() {
    return {
      name: nameInput.value,
      startFret: startInput.value === "" ? NaN : Number(startInput.value),
      frets: stringInputs.map(input => input.value === "" ? NaN : Number(input.value)),
      barres: Array.from(barreFields.children).map(row => {
        const value = field => Number(row.querySelector(`[data-field="${field}"]`).value);
        return { fret: value("fret"), from: value("from"), to: value("to") };
      })
    };
  }

  function updatePreview() {
    const name = nameInput.value.trim();
    deleteProjectBtn.disabled = !projectChordDiagrams.some(item => item.name === name);
    deleteLibraryBtn.disabled = !library.some(item => item.name === name);
    addBarreBtn.disabled = barreFields.children.length >= 1;
    try {
      const draft = readDraft();
      const definition = MeloChordDiagrams.normalize({ ...draft, name: name || "未命名" });
      preview.replaceChildren(MeloChordDiagrams.render(definition));
      applyBtn.disabled = !name;
      showStatus(name ? "預覽尚未套用；按「套用到專案」後生效。" : "請輸入和弦名稱後套用。");
    } catch (error) {
      preview.replaceChildren();
      applyBtn.disabled = true;
      showStatus(error.message, true);
    }
  }

  function refreshChoices(selectedName = "", selectedSource = "project") {
    templateSelect.replaceChildren();
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "新增空白指型…";
    templateSelect.appendChild(blank);
    choices = [];
    [
      ["project", "目前專案的自訂指型", projectChordDiagrams],
      ["library", "我的指型庫（此瀏覽器）", library],
      ["builtin", "內建指型（套用為自訂副本）", MeloChordDiagrams.getBuiltins()]
    ].forEach(([source, label, definitions]) => {
      if (!definitions.length) return;
      const group = document.createElement("optgroup");
      group.label = label;
      definitions.forEach(definition => {
        const index = choices.length;
        choices.push({ source, definition });
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = definition.name;
        group.appendChild(option);
      });
      templateSelect.appendChild(group);
    });
    const selected = choices.findIndex(choice => choice.source === selectedSource && choice.definition.name === selectedName);
    templateSelect.value = selected === -1 ? "" : String(selected);
  }

  function fillDraft(definition) {
    nameInput.value = definition.name;
    startInput.value = String(definition.startFret);
    stringInputs.forEach((input, index) => { input.value = String(definition.frets[index]); });
    barreFields.replaceChildren();
    definition.barres.forEach(addBarreRow);
    rememberInput.checked = false;
    updatePreview();
  }

  function newDraft() {
    templateSelect.value = "";
    fillDraft({ name: "", startFret: 1, frets: [-1, -1, -1, -1, -1, -1], barres: [] });
  }

  function writeLibrary(next) {
    try {
      const normalized = MeloChordDiagrams.normalizeList(next);
      localStorage.setItem(libraryKey, JSON.stringify(normalized));
      library = normalized;
      libraryReadError = "";
      return true;
    } catch (error) {
      console.warn("個人指型庫保存失敗：", error);
      return false;
    }
  }

  document.getElementById("openChordDiagramEditorBtn").addEventListener("click", () => {
    refreshChoices();
    newDraft();
    dialog.showModal();
    if (libraryReadError) showStatus(libraryReadError, true);
    nameInput.focus();
  });
  document.getElementById("closeChordDiagramEditorBtn").addEventListener("click", () => dialog.close());
  document.getElementById("newChordDiagramBtn").addEventListener("click", newDraft);
  templateSelect.addEventListener("change", () => {
    if (templateSelect.value === "") return newDraft();
    const choice = choices[Number(templateSelect.value)];
    if (choice) fillDraft(choice.definition);
  });
  form.addEventListener("input", updatePreview);
  form.addEventListener("change", event => {
    if (event.target !== templateSelect) updatePreview();
  });
  addBarreBtn.addEventListener("click", () => {
    if (barreFields.children.length >= 1) return;
    addBarreRow({ fret: Number(startInput.value) || 1, from: 6, to: 1 });
    updatePreview();
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    try {
      const definition = MeloChordDiagrams.normalize(readDraft());
      const exists = projectChordDiagrams.some(item => item.name === definition.name);
      const builtin = MeloChordDiagrams.getBuiltins().some(item => item.name === definition.name);
      if ((exists || builtin) && !confirm(`套用自訂「${definition.name}」取代此專案目前的同名指型？內建資料不會被刪除。`)) return;
      if (rememberInput.checked && library.some(item => item.name === definition.name) &&
          !confirm(`覆寫個人指型庫中的「${definition.name}」？`)) return;
      const next = projectChordDiagrams.filter(item => item.name !== definition.name).concat(definition);
      // 先驗證完整清單，避免容量或資料問題造成局部套用。
      projectChordDiagrams = MeloChordDiagrams.normalizeList(next);
      let librarySaved = true;
      if (rememberInput.checked) {
        librarySaved = writeLibrary(library.filter(item => item.name !== definition.name).concat(definition));
      }
      updateChordDiagrams();
      refreshChoices(definition.name);
      updatePreview();
      showStatus(librarySaved ? "已套用到專案；請儲存 .melo 以保留本次變更。" :
        "專案已套用，但個人指型庫保存失敗；請儲存 .melo 保留指型。", !librarySaved);
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  deleteProjectBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!projectChordDiagrams.some(item => item.name === name) || !confirm(`刪除此專案的自訂「${name}」？若有同名內建指型，會恢復內建版本。個人指型庫不受影響。`)) return;
    projectChordDiagrams = projectChordDiagrams.filter(item => item.name !== name);
    updateChordDiagrams();
    refreshChoices();
    newDraft();
    showStatus("已刪除專案自訂圖；請儲存 .melo 保留變更。");
  });
  deleteLibraryBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!library.some(item => item.name === name) || !confirm(`刪除個人指型庫中的「${name}」？目前專案的指型不受影響。`)) return;
    if (!writeLibrary(library.filter(item => item.name !== name))) {
      showStatus("個人指型庫刪除失敗，原資料已保留。", true);
      return;
    }
    refreshChoices(name);
    updatePreview();
    showStatus("已刪除個人庫指型，目前專案不受影響。");
  });
}

setupChordDiagramEditor();
