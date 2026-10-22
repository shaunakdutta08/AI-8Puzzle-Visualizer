import { validateState, isSolvable, neighbors, keyOf, stateOf } from './puzzle.js';

/** FIFO with an O(1) head index. Slots are retained until this search is released. */
export class FIFOQueue {
  items = [];
  head = 0;
  get size() { return this.items.length - this.head; }
  enqueue(value) { this.items.push(value); }
  dequeue() { return this.size ? this.items[this.head++] : undefined; }
  preview(count = 8) { return this.items.slice(this.head, this.head + count); }
}

/**
 * Genuine graph BFS. Mark discovered on enqueue, check goal on dequeue.
 * Expanded includes every dequeued/processed state, including a dequeued goal.
 * Bounded snapshots are copied; callers never receive mutable internal storage.
 */
export async function bfs(initial, goal, {
  signal, onSnapshot = () => {}, batchSize = 256, delay = 0,
  maxExpanded = Infinity
} = {}) {
  validateState(initial, 'Initial state');
  validateState(goal, 'Goal state');
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error('Batch size must be a positive integer.');
  if (!(maxExpanded >= 0)) throw new Error('Search limit must be nonnegative.');
  const started = performance.now();
  const stats = {
    generated: 0, expanded: 0, maxDepth: 0, solutionDepth: null, moves: null,
    elapsed: 0, memoryBytes: 0, frontier: 0, peakFrontier: 0, duplicates: 0
  };
  const queue = new FIFOQueue(), parents = new Map();
  const events = [], explored = [];
  let current = null, successors = [], eventCount = 0;
  const log = (type, state = '', detail = '') => {
    events.push({ order: ++eventCount, type, state, detail });
    if (events.length > 80) events.shift();
  };
  const snapshot = status => {
    stats.elapsed = performance.now() - started;
    stats.frontier = queue.size;
    // Transparent model: 96 B per discovered record + 8 B per retained queue slot.
    stats.memoryBytes = parents.size * 96 + queue.items.length * 8;
    const snap = {
      status, stats: { ...stats }, current: current && { ...current },
      frontier: queue.preview().map(key => ({ key, ...parents.get(key) })),
      explored: explored.map(node => ({ ...node })),
      successors: successors.map(node => ({ ...node })),
      events: events.map(event => ({ ...event })), eventCount
    };
    onSnapshot(snap);
    return snap;
  };
  const result = (status, path = [], moves = []) => {
    log('Search completed', '', status);
    const finalSnapshot = snapshot(status);
    return { status, path, moves, stats: { ...finalSnapshot.stats }, snapshot: finalSnapshot };
  };
  log('Search initialized');
  if (!isSolvable(initial, goal)) {
    log('Parity mismatch', keyOf(initial), 'The initial and goal states are in different reachable components.');
    return result('unsolvable');
  }
  if (signal?.aborted) return result('cancelled');
  const startKey = keyOf(initial), goalKey = keyOf(goal);
  parents.set(startKey, { parent: null, move: null, depth: 0 });
  queue.enqueue(startKey);
  stats.generated = stats.peakFrontier = 1;
  log('Initial state inserted', startKey, 'Depth 0');
  snapshot('searching');
  // Always give the browser a paint/cancel opportunity, including shallow searches.
  await new Promise(resolve => setTimeout(resolve, 0));
  while (queue.size) {
    if (signal?.aborted) return result('cancelled');
    let processed = 0;
    while (queue.size && processed < batchSize) {
      if (signal?.aborted) return result('cancelled');
      if (stats.expanded >= maxExpanded) {
        log('Search limit reached', '', `${maxExpanded} states processed; solvability was not disproved.`);
        return result('limited');
      }
      const key = queue.dequeue(), node = parents.get(key);
      current = { key, ...node, order: ++stats.expanded };
      explored.push(current);
      if (explored.length > 12) explored.shift();
      processed++;
      successors = [];
      log('State removed from queue', key, `Depth ${node.depth}`);
      if (key === goalKey) {
        log('Goal discovered', key, `Verified on dequeue at depth ${node.depth}`);
        const path = [], moves = [];
        let cursor = key;
        while (cursor !== null) {
          path.push(stateOf(cursor));
          const info = parents.get(cursor);
          if (info.move) moves.push(info.move);
          cursor = info.parent;
        }
        path.reverse(); moves.reverse();
        stats.solutionDepth = node.depth;
        stats.moves = path.length - 1;
        log('Solution reconstructed', key, `${stats.moves} moves; ${path.length} states`);
        return result('solved', path, moves);
      }
      for (const next of neighbors(stateOf(key))) {
        const nextKey = keyOf(next.state), duplicate = parents.has(nextKey);
        log('Successor generated', nextKey, next.move);
        successors.push({ key: nextKey, move: next.move, duplicate, depth: node.depth + 1 });
        if (duplicate) {
          stats.duplicates++;
          log('Duplicate state skipped', nextKey);
          continue;
        }
        parents.set(nextKey, { parent: key, move: next.move, depth: node.depth + 1 });
        queue.enqueue(nextKey);
        stats.generated++;
        stats.maxDepth = Math.max(stats.maxDepth, node.depth + 1);
        stats.peakFrontier = Math.max(stats.peakFrontier, queue.size);
        log('New state added', nextKey, `Parent ${key}; depth ${node.depth + 1}`);
      }
      // Preserve early, useful node-level evidence even when later work is batched.
      if (stats.expanded <= 16) snapshot('searching');
    }
    snapshot('searching');
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  log('Frontier exhausted', '', 'No reachable goal was found.');
  return result('exhausted');
}
