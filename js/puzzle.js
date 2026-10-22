/** Pure puzzle rules. Directions always describe the NUMBERED tile, not the blank. */
export const EXAMPLE_INITIAL = [2, 8, 3, 1, 6, 4, 7, 0, 5];
export const EXAMPLE_GOAL = [1, 2, 3, 8, 0, 4, 7, 6, 5];
export const keyOf = state => state.join('');
export const stateOf = key => Array.from(key, Number);
export const equal = (a, b) => keyOf(a) === keyOf(b);

export function validateState(state, label = 'State') {
  if (!Array.isArray(state) || state.length !== 9) throw new Error(`${label}: enter exactly nine cells.`);
  if (state.some(n => !Number.isInteger(n) || n < 0 || n > 8)) {
    throw new Error(`${label}: use only whole numbers 0–8; 0 represents the blank.`);
  }
  if (state.filter(n => n === 0).length !== 1) throw new Error(`${label}: include exactly one blank (0).`);
  if (new Set(state).size !== 9) throw new Error(`${label}: each number 1–8 must occur exactly once; remove duplicates.`);
  return true;
}

export function parseState(text, label = 'State') {
  const tokens = text.trim().split(/[\s,;]+/).filter(Boolean);
  const state = tokens.map(token => /^\d$/.test(token) ? Number(token) : NaN);
  validateState(state, label);
  return state;
}

export function parity(state) {
  let inversions = 0;
  for (let i = 0; i < state.length; i++) {
    for (let j = i + 1; j < state.length; j++) {
      if (state[i] && state[j] && state[i] > state[j]) inversions++;
    }
  }
  return inversions % 2;
}

export function isSolvable(initial, goal) {
  validateState(initial, 'Initial state');
  validateState(goal, 'Goal state');
  // For an odd-width board, blank position does not affect inversion parity.
  return parity(initial) === parity(goal);
}

export function neighbors(state) {
  const blank = state.indexOf(0);
  const row = Math.floor(blank / 3), col = blank % 3;
  const choices = [
    [row > 0, blank - 3, 'down'],
    [col > 0, blank - 1, 'right'],
    [row < 2, blank + 3, 'up'],
    [col < 2, blank + 1, 'left']
  ];
  return choices.filter(([legal]) => legal).map(([, from, direction]) => {
    const next = [...state], tile = state[from];
    [next[blank], next[from]] = [next[from], next[blank]];
    return { state: next, tile, direction, move: `Tile ${tile} ${direction}` };
  });
}

export function describeTransition(before, after) {
  const move = neighbors(before).find(next => equal(next.state, after));
  if (!move) throw new Error('The transition must be a single legal tile move.');
  return { ...move, text: `Tile ${move.tile} slides ${move.direction} into the blank cell.` };
}

export function shuffledState(start, steps = 40, random = Math.random) {
  validateState(start);
  let state = [...start], previous = '';
  for (let i = 0; i < steps; i++) {
    const options = neighbors(state).filter(next => keyOf(next.state) !== previous);
    const next = options[Math.floor(random() * options.length)];
    previous = keyOf(state);
    state = next.state;
  }
  return state;
}
