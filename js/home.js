// Landing page. OWNER: Menna.
import { renderNav } from './ui.js';
import { renderChecks } from './validate.js';
import { CHECKS } from './checks.js';

renderNav();
const result = renderChecks(document.getElementById('checks'), CHECKS);
document.getElementById('summary').textContent = `${result.passed} of ${result.total} rows pass.`;
