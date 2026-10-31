// Site navigation. OWNER: Menna.
// A page appears in the menu only when ready is true. The statement forbids
// placeholder links, so each owner sets ready: true once their module works.
export const PAGES = [
  { href: 'index.html', label: 'Home', ready: true },
  { href: 'module1.html', label: 'Module 1', ready: false },
  { href: 'module2.html', label: 'Module 2', ready: false },
  { href: 'module3.html', label: 'Module 3', ready: false },
  { href: 'module4.html', label: 'Module 4', ready: false },
];
