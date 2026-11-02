// The "Predict, then check" box. OWNER: Menna. Every module uses it, and it is graded under teaching value.
// items: [{ q, options: [..], answer: indexOfRightOption, why }]
// lock: the sliders to keep disabled until the user commits to a guess.

let boxCount = 0;   // counts the boxes on the page, so each box gets its own radio group name

export function addPredict(parent, items, lock = []) {
  if (!items || items.length === 0) return;

  // 1. The box: a heading and a body, added to parent
  const box = document.createElement('div');
  box.className = 'panel predict';
  const title = document.createElement('h3');
  title.textContent = 'Predict, then check';
  const body = document.createElement('div');
  box.append(title, body);
  parent.appendChild(box);

  const group = 'predict-' + boxCount++;
  let index = 0;   // the current question

  // 2. Show the current question
  function ask() {
    const item = items[index];

    // a. Empty the body and lock the sliders
    body.innerHTML = '';
    lock.forEach(s => s.disable(true));

    // b. The question and one radio button per option
    const q = document.createElement('div');
    q.className = 'q';
    q.innerHTML = item.q;
    body.appendChild(q);

    item.options.forEach((opt, i) => {
      const label = document.createElement('label');
      label.style.display = 'block';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = group;
      radio.value = i;
      const text = document.createElement('span');
      text.innerHTML = ' ' + opt;
      label.append(radio, text);
      body.appendChild(label);
    });

    // c. The button and the empty answer area
    const button = document.createElement('button');
    button.className = 'primary';
    button.textContent = 'Lock my guess';
    const answer = document.createElement('div');
    answer.className = 'answer';
    body.append(button, answer);

    // 3. When the button is clicked
    button.addEventListener('click', () => {
      // a. Nothing chosen yet
      const chosen = body.querySelector(`input[name="${group}"]:checked`);
      if (!chosen) {
        answer.textContent = 'Pick an answer first.';
        return;
      }

      // b. Correct or Not quite, then the explanation
      const right = Number(chosen.value) === item.answer;
      answer.innerHTML = '';
      const verdict = document.createElement('strong');
      verdict.className = right ? 'right' : 'wrong';
      verdict.textContent = right ? 'Correct. ' : 'Not quite. ';
      const why = document.createElement('span');
      why.innerHTML = item.why;
      answer.append(verdict, why);

      // c. No changing the guess now; unlock the sliders
      button.disabled = true;
      body.querySelectorAll(`input[name="${group}"]`).forEach(r => { r.disabled = true; });
      lock.forEach(s => s.disable(false));

      // d. Move on to the next question
      if (items.length > 1) {
        const next = document.createElement('button');
        next.textContent = 'Another question';
        next.style.display = 'block';
        next.style.marginTop = '8px';
        next.addEventListener('click', () => {
          index = (index + 1) % items.length;
          ask();
        });
        answer.appendChild(next);
      }
    });
  }

  // 4. Show the first question
  ask();
}