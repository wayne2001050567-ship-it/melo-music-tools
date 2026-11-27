/* Pitch classes are shared by each key pair; spellings match the display examples. */
const majorNames = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const minorNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const playRoots = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9 };
function getKeys(play, capo) {
  const root = (playRoots[play] + capo) % 12;
  return { major: `${majorNames[root]} 大調`, minor: `${minorNames[(root + 9) % 12]} 小調` };
}
let play = 'C';
let capo = 0;
const ns = 'http://www.w3.org/2000/svg';
const drawing = document.getElementById('boardDrawing');
const choices = document.getElementById('fretButtons');
function svgElement(tag, attributes, parent, text) {
  const element = document.createElementNS(ns, tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  if (text !== undefined) element.textContent = text;
  parent.append(element);
  return element;
}
function render() {
  const keys = getKeys(play, capo);
  document.getElementById('major').textContent = keys.major;
  document.getElementById('minor').textContent = keys.minor;
  document.getElementById('combination').textContent = `Play ${play} + Capo ${capo}`;
  document.getElementById('position').textContent = `${capo} 格`;
  document.getElementById('capoHint').textContent = capo === 0 ? '不使用 Capo' : `夾在第 ${capo} 格`;
  document.getElementById('decrease').disabled = capo === 0;
  document.getElementById('increase').disabled = capo === 12;
  document.querySelectorAll('[data-play]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.play === play)));
  [...choices.children].forEach((button, index) => button.setAttribute('aria-pressed', String(index === capo)));
}
function setCapo(value, reveal = true) {
  capo = Math.max(0, Math.min(12, value));
  render();
  if (reveal) choices.children[capo].scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
// Equal-width frets keep all twelve touch targets comfortably sized on phones.
svgElement('rect', { x: 60, y: 42, width: 696, height: 116, rx: 4, class: 'neck' }, drawing);
svgElement('rect', { x: 408, y: 42, width: 348, height: 116, class: 'high-fret-area' }, drawing);
for (const fret of [3, 5, 7, 9, 12]) {
  const x = 60 + (fret - .5) * 58;
  for (const y of fret === 12 ? [78, 122] : [100]) svgElement('circle', { cx: x, cy: y, r: 5, class: 'marker' }, drawing);
}
for (let index = 0; index < 6; index++) svgElement('line', { x1: 60, x2: 756, y1: 50 + index * 20, y2: 50 + index * 20, 'stroke-width': 1 + index * .2, class: 'string' }, drawing);
for (let index = 0; index <= 12; index++) svgElement('line', { x1: 60 + index * 58, x2: 60 + index * 58, y1: 42, y2: 158, class: index === 0 ? 'nut' : 'fret' }, drawing);
for (let fret = 0; fret <= 12; fret++) {
  const x = fret === 0 ? 2 : 60 + (fret - 1) * 58;
  const button = svgElement('g', { class: 'fret-choice', role: 'button', tabindex: 0, 'aria-label': fret === 0 ? 'Capo 0，不使用 Capo' : `Capo 第 ${fret} 格`, 'aria-pressed': String(fret === 0) }, choices);
  svgElement('rect', { x: x + 2, y: 28, width: 54, height: 154, rx: 6, class: 'hit' }, button);
  if (fret > 0) svgElement('rect', { x: x + 38, y: 36, width: 11, height: 128, rx: 5, class: 'capo' }, button);
  else svgElement('line', { x1: 17, x2: 43, y1: 98, y2: 98, 'stroke-width': 4, stroke: 'currentColor', 'aria-hidden': true }, button);
  svgElement('text', { x: x + 29, y: 23 }, button, fret);
  button.addEventListener('click', () => setCapo(fret));
  button.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setCapo(fret); }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? 12 : Math.max(0, Math.min(12, fret + (event.key === 'ArrowRight' ? 1 : -1)));
      setCapo(target);
      choices.children[target].focus({ preventScroll: true });
    }
  });
}
document.querySelectorAll('[data-play]').forEach(button => button.addEventListener('click', () => { play = button.dataset.play; render(); }));
document.getElementById('decrease').addEventListener('click', () => setCapo(capo - 1));
document.getElementById('increase').addEventListener('click', () => setCapo(capo + 1));
render();
