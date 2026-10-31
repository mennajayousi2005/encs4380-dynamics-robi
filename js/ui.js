// Shared page controls. OWNER: Menna. Already working; read it so you can explain it.
import { PAGES } from './nav.js';

// Draws the site menu in <header id="nav"> and highlights the current page.
export function renderNav() {
  const here = location.pathname.split('/').pop() || 'index.html';
  const header = document.getElementById('nav');
  header.className = 'site';
  for (const page of PAGES) {
    if (!page.ready && page.href !== here) continue;
    const a = document.createElement('a');
    a.href = page.href;
    a.textContent = page.label;
    if (page.href === here) a.className = 'active';
    header.appendChild(a);
  }
}

// Adds a labelled slider. With log: true the slider moves evenly in powers of ten.
// Returns { value, set(v), setRange(min, max, step), disable(flag) }. set() does not fire onInput.
export function addSlider(parent, { label, min, max, value, step = 0.01, unit = '', log = false, digits = 3, onInput }) {
  const box = document.createElement('div');
  box.className = 'slider';
  const title = document.createElement('label');
  const name = document.createElement('span');
  name.innerHTML = label;
  const out = document.createElement('output');
  title.append(name, out);
  const input = document.createElement('input');
  input.type = 'range';
  box.append(title, input);
  parent.appendChild(box);

  const LOG_STEPS = 1000;
  let lo = min;
  let hi = max;
  const toPos = v => (log ? (Math.log(v / lo) / Math.log(hi / lo)) * LOG_STEPS : v);
  const fromPos = p => (log ? lo * Math.pow(hi / lo, p / LOG_STEPS) : p);
  const show = v => { out.textContent = `${Number(v.toPrecision(digits))}${unit ? ' ' + unit : ''}`; };
  const applyRange = () => {
    input.min = log ? 0 : lo;
    input.max = log ? LOG_STEPS : hi;
    input.step = log ? 1 : step;
  };
  applyRange();

  let current = value;
  input.value = toPos(value);
  show(value);
  input.addEventListener('input', () => {
    current = fromPos(Number(input.value));
    show(current);
    if (onInput) onInput(current);
  });
  return {
    get value() { return current; },
    set(v) { current = v; input.value = toPos(v); show(v); },
    setRange(newMin, newMax, newStep = step) {
      lo = newMin;
      hi = newMax;
      step = newStep;
      applyRange();
      current = Math.min(Math.max(current, lo), hi);
      input.value = toPos(current);
      show(current);
    },
    disable(flag) { input.disabled = flag; },
  };
}

// Adds a label with a value on the right. Returns { set(text) }.
export function addReadout(parent, label) {
  const row = document.createElement('div');
  row.className = 'readout';
  const name = document.createElement('span');
  name.innerHTML = label;
  const val = document.createElement('b');
  val.textContent = '-';
  row.append(name, val);
  parent.appendChild(row);
  return { set(text) { val.textContent = text; } };
}

// Formats a number for a readout. NaN, null and undefined show as a dash.
export function fmt(value, digits = 3, unit = '') {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${Number(value.toPrecision(digits))}${unit ? ' ' + unit : ''}`;
}

// Adds a row of buttons. items: [{ label, onClick }].
export function addButtons(parent, items) {
  const row = document.createElement('div');
  row.className = 'buttons';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.label;
    b.addEventListener('click', item.onClick);
    row.appendChild(b);
  }
  parent.appendChild(row);
  return row;
}

// Lets the predict box lock a row of buttons too, so presets cannot skip the guess.
export function lockable(row) {
  return { disable(flag) { row.querySelectorAll('button').forEach(b => { b.disabled = flag; }); } };
}

// Adds a dropdown. options: [{ value, label }]. Returns { value, set(v) }.
export function addSelect(parent, label, options, onChange) {
  const box = document.createElement('div');
  box.className = 'field';
  const title = document.createElement('label');
  title.innerHTML = label;
  const select = document.createElement('select');
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => onChange(select.value));
  box.append(title, select);
  parent.appendChild(box);
  return { get value() { return select.value; }, set(v) { select.value = v; } };
}

// Adds a labelled number box. Returns { value, set(v) }; an empty box gives NaN.
export function addNumber(parent, label, { value = '', step = 'any', onInput } = {}) {
  const box = document.createElement('div');
  box.className = 'field';
  const title = document.createElement('label');
  title.innerHTML = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = step;
  input.value = value;
  if (onInput) input.addEventListener('input', () => onInput(Number(input.value)));
  box.append(title, input);
  parent.appendChild(box);
  return {
    get value() { return input.value === '' ? NaN : Number(input.value); },
    set(v) { input.value = v; },
    disable(flag) { input.disabled = flag; },
  };
}

// Writes LaTeX into an element with KaTeX.
export function tex(element, latex) {
  katex.render(latex, element, { throwOnError: false, displayMode: true });
}

// Shows a yellow notice while an owner's TODO is still open. Returns { show(flag) }.
export function addTodoBanner(parent, text) {
  const box = document.createElement('div');
  box.className = 'todo-banner';
  box.textContent = text;
  parent.prepend(box);
  return { show(flag) { box.style.display = flag ? 'block' : 'none'; } };
}
