import { PuzzleBoard } from './board.js';
import { stateOf } from './puzzle.js';
import { formatState, number, statusLabel } from './statistics.js';

export class SearchVisualization {
  constructor() {
    this.board = new PuzzleBoard(document.getElementById('search-board'));
    this.reset();
  }
  reset() {
    this.snapshots = [];
    this.totalSnapshots = 0;
    this.index = 0;
    this.follow = true;
  }
  add(snapshot) {
    this.snapshots.push(snapshot);
    this.totalSnapshots++;
    if (this.snapshots.length > 120) {
      this.snapshots.shift();
      this.index = Math.max(0, this.index - 1);
    }
    if (this.follow) this.index = this.snapshots.length - 1;
  }
  render(fallback) {
    const $ = id => document.getElementById(id);
    const snap = this.snapshots[this.index];
    const range = $('snapshot-range');
    range.disabled = !snap;
    range.max = Math.max(0, this.snapshots.length - 1);
    range.value = this.index;
    $('snapshot-position').textContent = snap ? `${this.totalSnapshots - this.snapshots.length + this.index + 1} / ${this.totalSnapshots} (${this.snapshots.length} retained)` : '0 / 0';
    $('follow-live').textContent = this.follow ? 'Following latest' : 'Follow latest';
    $('follow-live').setAttribute('aria-pressed', String(this.follow));
    this.board.render(snap?.current ? stateOf(snap.current.key) : fallback, { animate: false });
    $('search-status').textContent = snap ? statusLabel(snap.status) : 'Not started';
    $('current-node-info').innerHTML = `<dt>Depth</dt><dd>${snap?.current?.depth ?? '—'}</dd><dt>Parent (0 = blank)</dt><dd class="mono">${formatState(snap?.current?.parent)}</dd><dt>Move into state</dt><dd>${snap?.current?.move || '—'}</dd>`;
    $('frontier-count').textContent = `${number(snap?.stats.frontier ?? 0)} waiting`;
    $('frontier').innerHTML = snap?.frontier.length ? snap.frontier.map((node, i) => `<div class="queue-item"><small>${i === 0 ? 'FRONT →' : `+${i}`}</small><span class="state-string">${formatState(node.key)}</span><small>d = ${node.depth}</small></div>`).join('') : `<p class="empty-state">${snap ? 'The frontier is empty.' : 'Run BFS to fill the frontier.'}</p>`;
    $('frontier-caption').textContent = `Showing ${snap?.frontier.length ?? 0} of ${number(snap?.stats.frontier ?? 0)} waiting states. 0 = blank.`;
    $('explored-caption').textContent = `${snap?.explored.length ?? 0} displayed · ${number(snap?.stats.expanded ?? 0)} processed`;
    $('explored').innerHTML = snap?.explored.length ? snap.explored.map(node => `<tr><td>${number(node.order)}</td><td><span class="state-string">${formatState(node.key)}</span></td><td>${node.depth}</td></tr>`).join('') : '<tr><td colspan="3" class="empty-state">No states processed yet.</td></tr>';
    $('successors-caption').textContent = snap?.status === 'solved' ? 'Goal node: no successors are generated.' : 'From the current expanded node';
    $('successors').innerHTML = snap?.successors.length ? snap.successors.map(node => `<div class="successor-item"><div><span class="state-string">${formatState(node.key)}</span><p>${node.move} · candidate depth ${node.depth}</p></div><span class="badge ${node.duplicate ? 'neutral' : ''}">${node.duplicate ? 'Duplicate · skipped' : 'New · queued'}</span></div>`).join('') : `<p class="empty-state">${snap?.status === 'solved' ? 'Goal verified. The shortest path has been reconstructed.' : 'No successors for this snapshot.'}</p>`;
    $('event-caption').textContent = snap ? `Showing ${snap.events.length} of ${number(snap.eventCount)} actual events at this snapshot. Latest 80 retained.` : 'Actual events, in execution order. Latest 80 retained per snapshot.';
    $('event-log').innerHTML = snap?.events.length ? snap.events.map(event => `<li><span>#${event.order}</span><strong>${event.type}</strong>${event.state ? `<code>${formatState(event.state)}</code>` : ''}<span>${event.detail}</span></li>`).join('') : '<li class="empty-state">No search has run yet.</li>';
  }
}
