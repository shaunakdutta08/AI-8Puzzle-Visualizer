import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLE_INITIAL as initial, EXAMPLE_GOAL as goal, validateState, parseState, parity, isSolvable, neighbors, describeTransition, shuffledState, keyOf } from '../js/puzzle.js';

test('valid states and whitespace/comma-separated manual input', () => {
  assert.equal(validateState(initial), true);
  assert.deepEqual(parseState('2,8,3\n1 6 4;7 0 5'), initial);
});
test('invalid lengths, duplicates, missing/extra blanks and invalid values are rejected', () => {
  for (const state of [initial.slice(1), [...initial, 9], [2,8,3,1,6,4,7,0,7], [2,8,3,1,6,4,7,5,5], [2,8,3,1,6,4,0,0,5], [2,8,3,1,6,4,7,-1,5], [2,8,3,1,6,4,7,1.5,5], [2,8,3,1,6,4,7,NaN,5]]) {
    assert.throws(() => validateState(state));
  }
  for (const text of ['', '1 2 3', '2 8 3 1 6 4 7 x 5', '2 8 3 1 6 4 7 0.0 5', '2 8 3 1 6 4 7 0 0x5']) assert.throws(() => parseState(text));
});
test('arbitrary goal parity is supported, even when it differs from the standard goal', () => {
  assert.equal(isSolvable(initial, goal), true);
  assert.equal(isSolvable(initial, [1,2,3,4,5,6,7,8,0]), false);
  assert.equal(isSolvable([8,2,3,1,6,4,7,0,5], goal), false);
});
test('neighbors are exactly adjacent slides with correct tile direction', () => {
  assert.equal(neighbors([0,1,2,3,4,5,6,7,8]).length, 2);
  assert.equal(neighbors([1,0,2,3,4,5,6,7,8]).length, 3);
  assert.equal(neighbors(goal).length, 4);
  for (const move of neighbors(initial)) {
    assert.equal(parity(move.state), parity(initial));
    assert.equal(move.state.filter((n,i) => n !== initial[i]).length, 2);
    assert.ok(neighbors(move.state).some(next => keyOf(next.state) === keyOf(initial)));
    assert.match(describeTransition(initial, move.state).text, new RegExp(`Tile ${move.tile} slides ${move.direction}`));
  }
  assert.throws(() => describeTransition(initial, goal), /legal/);
});
test('random generation preserves selected goal, valid tiles and solvability over 100 puzzles', () => {
  const before = [...goal];
  let seed = 123;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 100; i++) {
    const state = shuffledState(goal, 60, random);
    assert.equal(validateState(state), true);
    assert.equal(isSolvable(state, goal), true);
  }
  assert.deepEqual(goal, before);
});
