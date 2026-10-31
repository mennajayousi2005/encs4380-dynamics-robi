// The "Predict, then check" box. OWNER: Menna. Every module uses it, and it is graded under teaching value.
// items: [{ q, options: [..], answer: indexOfRightOption, why }]
// lock: the sliders to keep disabled until the user commits to a guess.
export function addPredict(parent, items, lock = []) {
  // TODO(Menna): build the box inside parent. Until you do, the sliders simply stay unlocked.
  // 1. Make a div with class "panel predict", a heading "Predict, then check", and a body div. Add it to parent.
  // 2. Keep the index of the current question, starting at 0. Write a function ask() that:
  //    a. Empties the body and disables everything in lock: lock.forEach(s => s.disable(true)).
  //    b. Shows the question in a div with class "q", and one radio button per option. Options can contain HTML.
  //    c. Adds a "Lock my guess" button (class "primary") and an empty div with class "answer".
  // 3. When the button is clicked:
  //    a. If no radio is chosen, say "Pick an answer first." and stop.
  //    b. Show Correct or Not quite (classes "right" and "wrong"), then item.why.
  //    c. Disable the button and enable everything in lock.
  //    d. If there is more than one question, add an "Another question" button that moves to the next and calls ask().
  // 4. Call ask() once at the end.
  parent.textContent = 'TODO(Menna): the predict box, in js/predict.js.';
}
