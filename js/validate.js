// The validation table. OWNER: Menna. Already working; read it so you can explain it.
// Each row: { check, label, expected, tol, unit, digits, owner, value: () => number }
// value() runs the group's real functions with fixed parameters, so the sliders do not affect it.
// A row shows "To do" while the owner's function still returns NaN. A value of null means the test
// does not apply, for example an unstable loop has no steady state.
export function renderChecks(parent, rows) {
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'checks';
  table.innerHTML = '<thead><tr><th>#</th><th>Test</th><th>Expected</th><th>Our value</th><th>Tolerance</th><th>Result</th></tr></thead>';
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  wrap.appendChild(table);
  parent.appendChild(wrap);

  let passed = 0;
  for (const row of rows) {
    let value = NaN;
    try { value = row.value(); } catch (err) { console.warn(`Check ${row.check}:`, err); }
    const digits = row.digits ?? 4;
    const unit = row.unit ? ` ${row.unit}` : '';
    const done = typeof value === 'number' && Number.isFinite(value);
    const ok = done && Math.abs(value - row.expected) <= row.tol;
    if (ok) passed++;
    const tr = document.createElement('tr');
    const badge = value === null ? '<span class="badge fail">Not applicable: unstable or too slow to test</span>'
      : !done ? `<span class="badge todo">To do (${row.owner})</span>`
      : ok ? '<span class="badge pass">Pass</span>' : '<span class="badge fail">Fail</span>';
    tr.innerHTML = `<td>${row.check}</td><td>${row.label}</td><td>${row.expected}${unit}</td>`
      + `<td>${done ? Number(value.toPrecision(digits)) + unit : '-'}</td><td>&plusmn;${row.tol}${unit}</td><td>${badge}</td>`;
    tbody.appendChild(tr);
  }
  return { passed, total: rows.length };
}
