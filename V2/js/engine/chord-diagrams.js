// 自訂和弦指型的資料驗證與 SVG 繪製；不更動歌詞、和弦位置或個人指型庫。
const MeloChordDiagrams = (() => {
  const builtinFrets = {
    C: [-1, 3, 2, 0, 1, 0], D: [-1, -1, 0, 2, 3, 2],
    E: [0, 2, 2, 1, 0, 0], F: [1, 3, 3, 2, 1, 1],
    G: [3, 2, 0, 0, 0, 3], A: [-1, 0, 2, 2, 2, 0],
    Am: [-1, 0, 2, 2, 1, 0], Bm: [-1, 2, 4, 4, 3, 2],
    Dm: [-1, -1, 0, 2, 3, 1], Em: [0, 2, 2, 0, 0, 0],
    B7: [-1, 2, 1, 2, 0, 2], C7: [-1, 3, 2, 3, 1, 0],
    D7: [-1, -1, 0, 2, 1, 2], E7: [0, 2, 0, 1, 0, 0],
    G7: [3, 2, 0, 0, 0, 1], A7: [-1, 0, 2, 0, 2, 0],
    Am7: [-1, 0, 2, 0, 1, 0], Dm7: [-1, -1, 0, 2, 1, 1],
    Em7: [0, 2, 0, 0, 0, 0], Cmaj7: [-1, 3, 2, 0, 0, 0]
  };
  const builtinBarres = {
    F: [{ fret: 1, from: 6, to: 1 }],
    Bm: [{ fret: 2, from: 5, to: 1 }]
  };
  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

  function normalize(definition) {
    if (!isObject(definition)) throw new Error("和弦圖必須是有效資料。");
    if (typeof definition.name !== "string" || !definition.name.trim() || definition.name.trim().length > 80) {
      throw new Error("請輸入 1～80 字的和弦名稱。");
    }
    const name = definition.name.trim();
    const startFret = definition.startFret === undefined ? 1 : definition.startFret;
    if (!integer(startFret, 1, 21)) throw new Error(`${name}：起始品位需為 1～21 的整數。`);
    if (!Array.isArray(definition.frets) || definition.frets.length !== 6 ||
        definition.frets.some(fret => !integer(fret, -1, 24))) {
      throw new Error(`${name}：請指定六條弦，-1 為不彈、0 為空弦，1～24 為品位。`);
    }
    const frets = [...definition.frets];
    if (frets.some(fret => fret > 0 && (fret < startFret || fret > startFret + 3))) {
      throw new Error(`${name}：按弦需落在第 ${startFret}～${startFret + 3} 品；請調整起始品位。`);
    }
    const rawBarres = definition.barres === undefined ? [] : definition.barres;
    if (!Array.isArray(rawBarres) || rawBarres.length > 6) throw new Error(`${name}：橫按最多六條。`);
    const seen = new Set();
    const barres = rawBarres.map(barre => {
      if (!isObject(barre) || !integer(barre.fret, startFret, startFret + 3) ||
          !integer(barre.from, 2, 6) || !integer(barre.to, 1, 5) || barre.from <= barre.to) {
        throw new Error(`${name}：橫按需在可見品位內，並由較粗弦橫按到較細弦。`);
      }
      for (let string = barre.from; string >= barre.to; string--) {
        const fret = frets[6 - string];
        // 橫按線表示手指位置；不發聲的弦仍可標示 ×，不畫按弦圓點。
        if (fret !== -1 && fret < barre.fret) {
          throw new Error(`${name}：橫按範圍內，第 ${string} 弦可設為「× 不彈」；若要發聲，需設為第 ${barre.fret} 品或更高品，不能為空弦。`);
        }
      }
      const key = `${barre.fret}:${barre.from}:${barre.to}`;
      if (seen.has(key)) throw new Error(`${name}：同一條橫按不可重複。`);
      seen.add(key);
      return { fret: barre.fret, from: barre.from, to: barre.to };
    });
    return { name, startFret, frets, barres };
  }

  function normalizeList(list = []) {
    if (!Array.isArray(list) || list.length > 256) throw new Error("自訂和弦圖需為陣列，最多 256 個。");
    const seen = new Set();
    return list.map(definition => {
      const normalized = normalize(definition);
      if (seen.has(normalized.name)) throw new Error(`和弦圖名稱重複：${normalized.name}`);
      seen.add(normalized.name);
      return normalized;
    });
  }

  function getBuiltins() {
    return Object.entries(builtinFrets).map(([name, frets]) => normalize({
      name, frets, startFret: 1, barres: builtinBarres[name] || []
    }));
  }

  function resolve(name, projectDefinitions) {
    return projectDefinitions.find(definition => definition.name === name) ||
      getBuiltins().find(definition => definition.name === name) || null;
  }

  function render(rawDefinition) {
    const definition = normalize(rawDefinition);
    const { name, startFret, frets, barres } = definition;
    const item = document.createElement("div");
    item.className = "chord-diagram-item";
    const heading = document.createElement("div");
    heading.className = "chord-diagram-name";
    heading.textContent = name;
    heading.title = name;
    item.appendChild(heading);
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 108 124");
    svg.setAttribute("width", "108");
    svg.setAttribute("height", "124");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${name}，起始第 ${startFret} 品，由第六弦到第一弦：${frets.map(fret => fret === -1 ? "不彈" : fret === 0 ? "空弦" : fret + "品").join("、")}`);
    const draw = (tag, attrs, text) => {
      const node = document.createElementNS(svgNS, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
      if (text !== undefined) node.textContent = text;
      svg.appendChild(node);
    };
    for (let i = 0; i < 6; i++) {
      const x = 24 + i * 13;
      draw("line", { x1: x, y1: 24, x2: x, y2: 104, stroke: "#333", "stroke-width": 1 });
    }
    for (let i = 0; i < 5; i++) {
      const y = 24 + i * 20;
      draw("line", { x1: 24, y1: y, x2: 89, y2: y, stroke: "#333", "stroke-width": i === 0 && startFret === 1 ? 3 : 1 });
    }
    if (startFret > 1) draw("text", { x: 19, y: 39, "text-anchor": "end", "font-size": 9, fill: "#222" }, startFret + "fr");
    barres.forEach(barre => {
      const y = 24 + (barre.fret - startFret + 0.5) * 20;
      draw("line", { x1: 24 + (6 - barre.from) * 13, y1: y, x2: 24 + (6 - barre.to) * 13, y2: y,
        stroke: "#222", "stroke-width": 9, "stroke-linecap": "round" });
    });
    frets.forEach((fret, index) => {
      const x = 24 + index * 13;
      if (fret > 0) {
        draw("circle", { cx: x, cy: 24 + (fret - startFret + 0.5) * 20, r: 5, fill: "#222" });
      } else {
        draw("text", { x, y: 16, "text-anchor": "middle", "font-size": 12, fill: "#222" }, fret === 0 ? "○" : "×");
      }
    });
    item.appendChild(svg);
    return item;
  }

  return { normalize, normalizeList, getBuiltins, resolve, render };
})();
