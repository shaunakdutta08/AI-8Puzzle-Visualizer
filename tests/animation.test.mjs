import test from 'node:test';
import assert from 'node:assert/strict';
import { Playback } from '../js/animation.js';
import { neighbors, EXAMPLE_GOAL as goal } from '../js/puzzle.js';

const middle = neighbors(goal)[0].state;
const start = neighbors(middle).find(next => next.state.join('') !== goal.join('')).state;
const path = [start, middle, goal];
function setup() {
  let id = 0;
  const tasks = new Map(), events = [];
  const playback = new Playback(data => events.push(data), {
    schedule(fn, delay) { const key = ++id; tasks.set(key, { fn, delay }); return key; },
    unschedule(key) { tasks.delete(key); }
  });
  const advance = () => { const [key, task] = tasks.entries().next().value; tasks.delete(key); task.fn(); };
  playback.load(path);
  return { playback, tasks, events, advance };
}
test('starts at step 0 and plays actual legal path through the final goal', () => {
  const { playback, tasks, events, advance } = setup();
  assert.equal(playback.step, 0);
  assert.deepEqual(events.at(-1).state, start);
  playback.play(); advance();
  assert.equal(playback.step, 1);
  assert.deepEqual(events.at(-1).state, middle);
  assert.ok(events.at(-1).transition.text.startsWith('Tile '));
  advance();
  assert.deepEqual(events.at(-1).state, goal);
  assert.equal(playback.status, 'complete');
  assert.equal(tasks.size, 0);
});
test('pause preserves step, resume continues, multiple play calls use one timer', () => {
  const { playback, tasks, advance } = setup();
  playback.play(); playback.play(); playback.play(); assert.equal(tasks.size, 1);
  advance(); playback.pause();
  assert.equal(playback.step, 1); assert.equal(tasks.size, 0);
  playback.play(); assert.equal(tasks.size, 1); advance();
  assert.equal(playback.status, 'complete');
});
test('next, previous, reset, replay and bounds stop stale timers', () => {
  const { playback, tasks } = setup();
  playback.play(); playback.seek(playback.step + 1);
  assert.equal(playback.step, 1); assert.equal(tasks.size, 0);
  playback.seek(playback.step - 1); assert.equal(playback.step, 0);
  playback.seek(-10); assert.equal(playback.step, 0);
  playback.seek(999); assert.equal(playback.status, 'complete');
  playback.reset(); assert.equal(playback.step, 0);
  playback.replay(); assert.equal(playback.step, 0); assert.equal(tasks.size, 1);
  playback.replay(); assert.equal(tasks.size, 1);
});
test('all speed settings affect the actual timer without duplication', () => {
  const { playback, tasks } = setup(); playback.play();
  for (const speed of [1200,200,600]) {
    playback.setSpeed(speed);
    assert.equal(tasks.size, 1);
    assert.equal([...tasks.values()][0].delay, speed);
  }
  assert.throws(() => playback.setSpeed(100));
});
test('new puzzle clears path, completion status, and timer; zero-move path is valid', () => {
  const { playback, tasks } = setup(); playback.play(); playback.clear();
  assert.equal(tasks.size, 0); assert.equal(playback.path.length, 0);
  assert.equal(playback.status, 'empty');
  playback.play(); assert.equal(tasks.size, 0);
  playback.load([goal]); assert.equal(playback.status, 'complete');
  playback.play(); assert.equal(tasks.size, 0);
});
