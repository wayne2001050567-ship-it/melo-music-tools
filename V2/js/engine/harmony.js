// 純音樂資料與計算；不操作譜面。級數的升降一律相對同主音大調。
const MeloHarmony = (() => {
  const letters = ["C", "D", "E", "F", "G", "A", "B"];
  const naturalPitches = [0, 2, 4, 5, 7, 9, 11];
  const scales = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    melodicMinor: [0, 2, 3, 5, 7, 9, 11]
  };
  const categories = [
    { id: "basic", label: "基本順階三和弦", grid: "basicChordGrid" },
    { id: "seventh", label: "順階七和弦", grid: "seventhChordGrid" },
    { id: "extended", label: "常用延伸和弦", grid: "extendedChordGrid" },
    { id: "variation", label: "Sus / Add / 其他變化和弦", grid: "suspendedChordGrid" },
    { id: "borrowed", label: "借用和弦", grid: "borrowedChordGrid" },
    { id: "secondary", label: "次屬和弦", grid: "secondaryChordGrid" }
  ];
  const qualities = {
    "0,4,7": "", "0,3,7": "m", "0,3,6": "dim", "0,4,8": "aug",
    "0,4,7,11": "maj7", "0,4,7,10": "7", "0,3,7,10": "m7",
    "0,3,6,10": "m7(b5)", "0,3,6,9": "dim7", "0,3,7,11": "mmaj7",
    "0,4,8,11": "augmaj7"
  };
  const mod = value => ((value % 12) + 12) % 12;

  function accidentalValue(text) {
    return [...text].reduce((sum, c) => sum + (c === "#" || c === "♯" ? 1 : -1), 0);
  }

  function notePitch(note) {
    const match = note.match(/^([A-G])([#b♯♭]*)$/);
    if (!match) throw new Error("無效音名：" + note);
    return mod(naturalPitches[letters.indexOf(match[1])] + accidentalValue(match[2]));
  }

  // 同時指定字母距離及半音距離，避免把調內 E# 簡化成 F。
  function spellFrom(tonic, letterSteps, semitones) {
    const letterIndex = (letters.indexOf(tonic[0]) + letterSteps) % 7;
    const pitch = mod(notePitch(tonic) + semitones);
    let alteration = mod(pitch - naturalPitches[letterIndex]);
    if (alteration > 6) alteration -= 12;
    return letters[letterIndex] + (alteration >= 0 ? "#".repeat(alteration) : "b".repeat(-alteration));
  }

  function degreeRoot(degree, alteration = 0) {
    return (alteration < 0 ? "b".repeat(-alteration) : "#".repeat(alteration)) + degree;
  }

  function buildPalette(tonic, mode) {
    if (!scales[mode] || !["major", "minor"].includes(mode)) throw new Error("不支援的調式");
    notePitch(tonic);
    const scale = scales[mode];
    const entries = [];
    const make = (category, degree, alteration, suffix, origin, extra = {}) => {
      const offset = scales.major[degree - 1] + alteration;
      const root = { degree, alteration };
      const chordName = spellFrom(tonic, degree - 1, offset) + suffix;
      const numericLabel = degreeRoot(degree, alteration) + suffix;
      return {
        id: `${category}:${degree}:${alteration}:${suffix}`,
        category, root, suffix, origin, chordName, numericLabel,
        description: origin, ...extra
      };
    };
    const add = entry => {
      if (!entries.some(other => other.category === entry.category && other.id === entry.id)) entries.push(entry);
    };
    const diatonic = (sourceScale, category, count, origin) => sourceScale.map((offset, index) => {
      const intervals = Array.from({ length: count }, (_, n) => mod(sourceScale[(index + n * 2) % 7] - offset));
      const suffix = qualities[intervals.join(",")];
      if (suffix === undefined) throw new Error("未定義的和弦結構");
      return make(category, index + 1, offset - scales.major[index], suffix, origin);
    });
    const source = mode === "major" ? "大調順階" : "自然小調順階";
    const basic = diatonic(scale, "basic", 3, source);
    const seventh = diatonic(scale, "seventh", 4, source);
    basic.forEach(add);
    seventh.forEach(add);

    // 先檢查完整組成音都在音階內，再提供延伸按鈕；例如 C 大調不提供 Em9。
    const extensions = {
      "": { "6": [0, 4, 7, 9], "6/9": [0, 4, 7, 9, 14], maj9: [0, 4, 7, 11, 14], maj13: [0, 4, 7, 11, 14, 21] },
      m: { m6: [0, 3, 7, 9], m9: [0, 3, 7, 10, 14], m11: [0, 3, 7, 10, 14, 17], m13: [0, 3, 7, 10, 14, 17, 21] }
    };
    basic.forEach((entry, index) => {
      const candidates = { ...(extensions[entry.suffix] || {}) };
      if (seventh[index].suffix === "7") {
        Object.assign(candidates, { "9": [0, 4, 7, 10, 14], "13": [0, 4, 7, 10, 14, 21] });
      }
      Object.entries(candidates).forEach(([suffix, intervals]) => {
        if (intervals.every(interval => scale.includes(mod(scale[index] + interval)))) {
          add(make("extended", index + 1, entry.root.alteration, suffix, "調內常用延伸"));
        }
      });
      if (["", "m"].includes(entry.suffix)) {
        add(make("variation", index + 1, entry.root.alteration, entry.suffix + "add9", "Add 色彩；保留三音，不含七音"));
      }
    });
    [1, 4, 5].forEach(degree => {
      const alteration = scale[degree - 1] - scales.major[degree - 1];
      ["sus2", "sus4"].forEach(suffix => add(make("variation", degree, alteration, suffix, "Sus 色彩；以二音或四音取代三音")));
    });
    const dominantAlterations = ["7sus4", "7(b9)", "7(#9)", "7(#5)"];
    dominantAlterations.forEach(suffix => add(make("variation", 5, 0, suffix, "本調屬和弦色彩變化；不作為借用分類")));

    const minorVariants = [];
    if (mode === "minor") {
      const variantSpecs = [
        [5, 0, "", "和聲小調：本調屬和弦"],
        [5, 0, "7", "和聲小調：本調屬七和弦"],
        [7, 0, "dim", "和聲小調：導音減三和弦"],
        [7, 0, "dim7", "和聲小調：導音減七和弦"],
        [1, 0, "mmaj7", "和聲小調：小大七和弦"],
        [4, 0, "", "旋律小調色彩：升六級音"],
        [4, 0, "7", "旋律小調色彩：升六級音"],
        [6, 0, "m7(b5)", "旋律小調色彩：升六級音"]
      ];
      variantSpecs.forEach(args => {
        const entry = make("variation", ...args);
        minorVariants.push(entry);
        add(entry);
      });
    }

    // 僅從同主音的另一調式借用；小調本身常用的和聲／旋律小調變化不再標成借用。
    const parallel = mode === "major" ? scales.minor : scales.major;
    const borrowedOrigin = mode === "major" ? "借自同主音自然小調" : "借自同主音大調";
    [3, 4].forEach(count => {
      diatonic(parallel, "borrowed", count, borrowedOrigin).forEach(entry => {
        if (![...basic, ...seventh, ...minorVariants].some(other => other.chordName === entry.chordName)) add(entry);
      });
    });

    // 次屬以目標為資料來源；不把減三和弦當成暫時主和弦，也排除本調主和弦。
    basic.slice(1).filter(target => ["", "m"].includes(target.suffix)).forEach(target => {
      const { degree, alteration } = target.root;
      const targetOffset = scales.major[degree - 1] + alteration;
      const dominantRoot = spellFrom(tonic, degree - 1 + 4, targetOffset + 7);
      const dominantDegree = (degree - 1 + 4) % 7 + 1;
      let dominantAlteration = mod(targetOffset + 7) - scales.major[dominantDegree - 1];
      if (dominantAlteration > 6) dominantAlteration -= 12;
      if (dominantAlteration < -6) dominantAlteration += 12;
      const entry = make("secondary", dominantDegree, dominantAlteration, "7", "次屬七和弦");
      entry.id = `secondary:to:${degree}:${alteration}`;
      entry.target = { ...target.root, suffix: target.suffix, chordName: target.chordName };
      entry.chordName = dominantRoot + "7";
      entry.numericLabel = "57/" + target.numericLabel;
      entry.description = `次屬七和弦，往 ${target.numericLabel}（${target.chordName}）；功能需依實際進行判斷`;
      add(entry);
    });
    // 保留舊有 IV7 快捷和弦，明確指向借用的 b7，不混入順階或借用分類。
    if (mode === "major") {
      const targetName = spellFrom(tonic, 6, 10);
      add({
        id: "secondary:to:flat7", category: "secondary",
        root: { degree: 4, alteration: 0 }, suffix: "7", origin: "次屬七和弦，目標為借用和弦",
        target: { degree: 7, alteration: -1, suffix: "", chordName: targetName },
        chordName: spellFrom(tonic, 3, 5) + "7", numericLabel: "57/b7",
        description: `往借用 b7（${targetName}）；不是順階四級七和弦`
      });
    }
    return entries;
  }

  // 僅解析已知格式；無法辨識的自訂字串保持純文字，不猜測或改寫。
  const suffixPattern = /^(?:mmaj|maj|m|dim|aug)?(?:6\/9|13|11|[245679])?(?:sus[24]|add(?:13|11|[249]))?(?:[#b](?:13|11|[59]))?(?:\([#b]?(?:13|11|[59])(?:,[#b]?(?:13|11|[59]))*\))?$/;
  function splitChord(text) {
    // 6/9 是延伸記號，不是轉位或次屬分母。
    const full = text.match(/^([A-G])([#b♯♭]*)(.*)$/);
    if (full && suffixPattern.test(full[3])) return [{ root: full[1], accidental: full[2], suffix: full[3] }];
    const degreeFull = text.match(/^([#b♯♭]*)([1-7])(.*)$/);
    if (degreeFull && suffixPattern.test(degreeFull[3])) {
      return [{ root: degreeFull[2], accidental: degreeFull[1], suffix: degreeFull[3], degree: true }];
    }
    const parts = text.split("/");
    if (parts.length > 2) {
      const bass = parts.pop();
      const main = parts.join("/");
      if (/^[A-G][#b♯♭]*$/.test(bass)) {
        const parsed = splitChord(main);
        if (parsed && parsed.length === 1 && /^[A-G]$/.test(parsed[0].root)) return [...parsed, { root: bass[0], accidental: bass.slice(1), suffix: "" }];
      }
      return null;
    }
    const parsed = parts.map(part => {
      let match = part.match(/^([A-G])([#b♯♭]*)(.*)$/);
      if (match && suffixPattern.test(match[3])) return { root: match[1], accidental: match[2], suffix: match[3] };
      match = part.match(/^([#b♯♭]*)([1-7])(.*)$/);
      if (match && suffixPattern.test(match[3])) return { root: match[2], accidental: match[1], suffix: match[3], degree: true };
      return null;
    });
    if (parsed.some(part => !part) || parsed.some(part => part.degree) && parsed.some(part => !part.degree)) return null;
    return parsed;
  }

  function displayTokens(text) {
    const parsed = splitChord(text);
    if (!parsed) return [{ text, kind: "plain" }];
    const tokens = [];
    parsed.forEach((part, index) => {
      if (index) tokens.push({ text: "/", kind: "plain" });
      if (part.degree && part.accidental) tokens.push({ text: part.accidental, kind: "accidental" });
      tokens.push({ text: part.root, kind: "root" });
      if (!part.degree && part.accidental) tokens.push({ text: part.accidental, kind: "accidental" });
      const pieces = part.suffix.match(/sus[24]|add(?:13|11|[249])|maj|dim|aug|m|6\/9|13|11|[245679]|[#b]+|[(),]/g) || [];
      pieces.forEach(piece => tokens.push({
        text: piece,
        kind: /^(?:6\/9|13|11|[245679]|[#b]+|[(),])$/.test(piece) ? "extension" : "quality"
      }));
    });
    return tokens;
  }

  function transposeName(text, semitones) {
    const parts = splitChord(text);
    if (!parts || parts.some(part => part.degree)) return text;
    const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const flatNames = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    return parts.map(part => {
      const names = /[b♭]/.test(part.accidental) ? flatNames : sharpNames;
      return names[mod(notePitch(part.root + part.accidental) + semitones)] + part.suffix;
    }).join("/");
  }

  return { categories, buildPalette, displayTokens, transposeName, notePitch };
})();
