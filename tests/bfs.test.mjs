import test from 'node:test';
import assert from 'node:assert/strict';
import { bfs, FIFOQueue } from '../js/bfs.js';
import { EXAMPLE_INITIAL as initial, EXAMPLE_GOAL as goal, neighbors, describeTransition, keyOf } from '../js/puzzle.js';

test('FIFO order, previews and empty-queue behavior', () => {
  const queue = new FIFOQueue();
  assert.equal(queue.dequeue(), undefined);
  for (const n of [7, 3, 5]) queue.enqueue(n);
  assert.deepEqual(queue.preview(2), [7, 3]);
  assert.equal(queue.dequeue(), 7);
  queue.enqueue(8);
  assert.equal(queue.size, 3);
  assert.deepEqual([queue.dequeue(),queue.dequeue(),queue.dequeue()], [3,5,8]);
  assert.equal(queue.size, 0);
  assert.equal(queue.dequeue(), undefined);
});
test('initial equals goal: depth 0, one state, no moves and exact counters', async () => {
  const result = await bfs(goal, goal);
  assert.equal(result.status, 'solved');
  assert.deepEqual(result.path, [goal]);
  assert.deepEqual(result.moves, []);
  assert.equal(result.stats.generated, 1);
  assert.equal(result.stats.expanded, 1);
  assert.equal(result.stats.solutionDepth, 0);
  assert.equal(result.stats.moves, 0);
  assert.equal(result.stats.frontier, 0);
  assert.equal(result.stats.memoryBytes, 104);
});
test('one legal move returns two states and one correctly described move', async () => {
  const start = neighbors(goal)[0].state;
  const result = await bfs(start, goal);
  assert.equal(result.stats.moves, 1);
  assert.deepEqual(result.path, [start, goal]);
  assert.equal(result.moves[0], describeTransition(start, goal).move);
});
test('example shortest solution, legal path, parent/depth tracking and live counting', async () => {
  const snapshots = [];
  const result = await bfs(initial, goal, { batchSize: 1, onSnapshot: snapshot => snapshots.push(snapshot) });
  assert.equal(result.status, 'solved');
  assert.equal(result.stats.moves, 5); // Known minimum, independently verified below with a reverse distance map.
  assert.equal(result.stats.solutionDepth, 5);
  assert.equal(result.path.length, 6);
  assert.deepEqual(result.path[0], initial);
  assert.deepEqual(result.path.at(-1), goal);
  assert.equal(new Set(result.path.map(keyOf)).size, result.path.length);
  result.path.slice(1).forEach((state, index) => {
    assert.equal(describeTransition(result.path[index], state).move, result.moves[index]);
  });
  let previousDepth = -1;
  for (const snapshot of snapshots) {
    assert.equal(snapshot.stats.generated, snapshot.stats.expanded + snapshot.stats.frontier);
    assert.equal(snapshot.stats.memoryBytes, snapshot.stats.generated * 104);
    if (snapshot.current) {
      assert.ok(snapshot.current.depth >= previousDepth); previousDepth = snapshot.current.depth;
      if (snapshot.current.parent) {
        const parent = Array.from(snapshot.current.parent, Number);
        assert.ok(neighbors(parent).some(next => keyOf(next.state) === snapshot.current.key));
      } else assert.equal(snapshot.current.depth, 0);
    }
    for (const node of snapshot.frontier) {
      if (node.parent) {
        const parent = Array.from(node.parent, Number);
        assert.equal(describeTransition(parent, Array.from(node.key, Number)).move, node.move);
      }
    }
    assert.ok(snapshot.events.length <= 80);
    assert.ok(snapshot.explored.length <= 12);
    assert.ok(snapshot.frontier.length <= 8);
  }
  assert.ok(result.stats.duplicates > 0);
  assert.ok(result.stats.elapsed >= 0);
  assert.deepEqual(result.stats, result.snapshot.stats);
  assert.ok(result.snapshot.events.some(e => e.type === 'Solution reconstructed'));
});
test('reverse distance oracle verifies shortest paths for every state up to depth 5', async () => {
  const distances = new Map([[keyOf(goal), 0]]), queue = [goal];
  for (let head = 0; head < queue.length; head++) {
    const state = queue[head], depth = distances.get(keyOf(state));
    if (depth === 5) continue;
    for (const next of neighbors(state)) if (!distances.has(keyOf(next.state))) {
      distances.set(keyOf(next.state), depth + 1); queue.push(next.state);
    }
  }
  for (const state of queue) {
    const result = await bfs(state, goal);
    assert.equal(result.stats.moves, distances.get(keyOf(state)));
  }
});
test('invalid and unsolvable input do not execute a fake search', async () => {
  await assert.rejects(bfs([1,2], goal));
  const result = await bfs([8,2,3,1,6,4,7,0,5], goal);
  assert.equal(result.status, 'unsolvable');
  assert.deepEqual(result.path, []);
  assert.equal(result.stats.generated, 0);
  assert.equal(result.stats.expanded, 0);
  assert.equal(result.stats.solutionDepth, null);
});
test('pre-cancellation and cancellation during exploration return partial honest results', async () => {
  const early = new AbortController(); early.abort();
  assert.equal((await bfs(initial, goal, { signal: early.signal })).status, 'cancelled');
  const controller = new AbortController();
  const result = await bfs(initial, goal, {
    signal: controller.signal, batchSize: 1,
    onSnapshot(snapshot) { if (snapshot.stats.expanded >= 3) controller.abort(); }
  });
  assert.equal(result.status, 'cancelled');
  assert.ok(result.stats.expanded >= 3);
  assert.deepEqual(result.path, []);
  assert.equal(result.stats.moves, null);
});
test('a search limit reports stopped, never unsolvable', async () => {
  const result = await bfs(initial, goal, { maxExpanded: 2 });
  assert.equal(result.status, 'limited');
  assert.equal(result.stats.expanded, 2);
  assert.deepEqual(result.path, []);
  assert.equal(result.stats.moves, null);
});
test('a hardest standard-goal instance reaches the true depth of 31', { timeout: 30000 }, async () => {
  const result = await bfs([8,6,7,2,5,4,3,0,1], [1,2,3,4,5,6,7,8,0], { batchSize: 2048 });
  assert.equal(result.status, 'solved');
  assert.equal(result.stats.moves, 31);
  assert.equal(result.path.length, 32);
  for (let i = 1; i < result.path.length; i++) describeTransition(result.path[i - 1], result.path[i]);
  assert.ok(result.stats.generated <= 181440);
});
