// The Control section's landing page. OWNER: Menna.
// It lists only pages marked ready in nav.js, so it never shows a placeholder link.
import { renderNav } from './ui.js';
import { PAGES } from './nav.js';

const TITLES = {
  'p1.html': 'P1: PID playground',
  'p2.html': 'P2: A slow sensor in the loop',
  'p3.html': 'P3: Digital PID',
  'p4.html': 'P4: Tuning challenge',
  'mysystem.html': 'My system: the Micromouse drive motor',
};

renderNav();
const links = document.getElementById('links');
for (const page of PAGES) {
  if (!page.ready || !TITLES[page.href]) continue;
  const box = document.createElement('div');
  box.className = 'panel';
  box.style.marginTop = '8px';
  const a = document.createElement('a');
  a.href = page.href;
  a.textContent = TITLES[page.href];
  box.appendChild(a);
  links.appendChild(box);
}
