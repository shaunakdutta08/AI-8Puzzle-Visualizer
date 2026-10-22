import { EXAMPLE_INITIAL, EXAMPLE_GOAL, parseState, isSolvable, neighbors, equal, keyOf, shuffledState, describeTransition } from './puzzle.js';
import { bfs } from './bfs.js';
import { PuzzleBoard } from './board.js';
import { Playback } from './animation.js';
import { renderStats, formatState, number, statusLabel } from './statistics.js';
import { SearchVisualization } from './visualization.js';

const $ = id => document.getElementById(id);
let initial = [...EXAMPLE_INITIAL], goal = [...EXAMPLE_GOAL], resetInitial = [...initial];
let displayed = [...initial], controller = null, generation = 0, dirty = false;
let route = 'overview', rendering = false;
const runs = [];
const mainBoard = new PuzzleBoard($('main-board'), manualMove);
const goalBoard = new PuzzleBoard($('goal-board'));
const overviewBoard = new PuzzleBoard($('overview-board'));
const visualization = new SearchVisualization();
const playback = new Playback(renderPlayback);

function message(text, type = '') {
  $('solver-message').textContent = text;
  $('solver-message').className = `notice ${type}`;
}
function writeInputs() {
  const text = state => [0, 3, 6].map(offset => state.slice(offset, offset + 3).join(' ')).join('\n');
  $('initial-input').value = text(initial);
  $('goal-input').value = text(goal);
  dirty = false;
}
function scheduleVisualization() {
  if (rendering) return;
  rendering = true;
  requestAnimationFrame(() => {
    rendering = false;
    if (route === 'visualization') visualization.render(initial);
  });
}
function invalidate({ clearTrace = true } = {}) {
  generation++;
  controller?.abort();
  controller = null;
  $('run').disabled = false;
  $('cancel').disabled = true;
  playback.clear();
  renderStats($('solver-stats'));
  if (clearTrace) visualization.reset();
  scheduleVisualization();
}
function commit(nextInitial, nextGoal, { baseline = true, animate = false } = {}) {
  invalidate();
  initial = [...nextInitial]; goal = [...nextGoal];
  if (baseline) resetInitial = [...initial];
  displayed = [...initial];
  mainBoard.render(initial, { animate });
  goalBoard.render(goal, { animate: false });
  $('board-status').textContent = 'Ready';
  writeInputs();
}
function applyInputs() {
  const nextInitial = parseState($('initial-input').value, 'Initial state');
  const nextGoal = parseState($('goal-input').value, 'Goal state');
  if (!isSolvable(nextInitial, nextGoal)) throw new Error('Unsolvable configuration: initial and goal inversion parity differ. Change either state; no legal sequence connects them.');
  commit(nextInitial, nextGoal);
  return true;
}
function manualMove(tile) {
  if (dirty) { message('Apply your edited configuration before moving tiles.', 'error'); return; }
  const next = neighbors(displayed).find(move => move.tile === tile);
  if (!next) { message('Only a tile directly beside the blank can move.', 'error'); return; }
  // Start a fresh search from the board the user actually sees, including a paused path.
  const before = [...displayed];
  commit(next.state, goal, { baseline: false });
  mainBoard.render(before, { animate: false });
  // Commit the old transform before applying the new one, so a real slide is visible.
  void $('main-board').offsetWidth;
  mainBoard.render(initial, { animate: true, duration: 220 });
  message(`${next.move}. Previous search and playback cleared.`);
}
function renderPlayback(data) {
  const hasPath = playback?.path?.length > 0;
  const complete = hasPath && data.status === 'complete' && data.step === data.total && equal(data.state, goal);
  displayed = [...(data.state || initial)];
  mainBoard.render(displayed, { animate: !!data.state, goal: complete, duration: Math.min(440, data.speed * .72) });
  $('goal-message').hidden = !complete;
  $('current-step').textContent = data.step;
  $('total-moves').textContent = hasPath ? data.total : '—';
  $('playback-status').textContent = ({ empty: 'Awaiting search', ready: 'Ready to play', playing: 'Playing', paused: 'Paused', complete: 'Goal reached' })[data.status];
  $('board-status').textContent = complete ? 'Goal reached' : hasPath ? 'Shortest path ready' : 'Ready';
  $('move-explanation').textContent = !hasPath ? 'Run BFS to discover a shortest solution.' : data.step === 0 ? (complete ? 'The initial state already equals the goal. Zero moves required.' : `Initial state. ${data.total} moves to the goal.`) : data.transition.text;
  $('play').textContent = data.status === 'playing' ? 'Ⅱ Pause' : data.status === 'paused' ? '▶ Resume' : data.status === 'complete' ? '↻ Replay' : '▶ Play Animation';
  $('play').disabled = !hasPath || data.total === 0;
  $('previous').disabled = !hasPath || data.step === 0;
  $('next').disabled = !hasPath || data.step === data.total;
  $('reset-playback').disabled = !hasPath;
  $('replay').disabled = !hasPath || data.total === 0;
  $('solution-scrubber').disabled = !hasPath || data.total === 0;
  $('solution-scrubber').max = data.total;
  $('solution-scrubber').value = data.step;
}
async function runSearch() {
  try { applyInputs(); } catch (error) {
    invalidate();
    message(error.message, 'error');
    if (error.message.startsWith('Unsolvable')) renderStats($('solver-stats'), null, 'unsolvable');
    return;
  }
  const token = generation;
  controller = new AbortController();
  const signal = controller.signal;
  $('run').disabled = true;
  $('cancel').disabled = false;
  $('board-status').textContent = 'Searching';
  message('BFS is exploring level by level. The main board stays at the initial state until you play the solution.');
  const slow = $('slow-search').checked;
  try {
    const result = await bfs(initial, goal, {
      signal, batchSize: slow ? 1 : 256, delay: slow ? 80 : 0,
      onSnapshot(snapshot) {
        if (token !== generation) return;
        visualization.add(snapshot);
        renderStats($('solver-stats'), snapshot.stats, snapshot.status);
        scheduleVisualization();
      }
    });
    if (token !== generation) return;
    runs.unshift({ initial: keyOf(initial), goal: keyOf(goal), ...result.stats, status: result.status, slow });
    if (runs.length > 12) runs.pop();
    renderRuns();
    renderStats($('solver-stats'), result.stats, result.status);
    if (result.status === 'solved') {
      playback.load(result.path);
      message(`BFS found a shortest solution: ${result.stats.moves} moves, ${result.path.length} states. ${result.stats.moves ? 'Select Play Animation to watch it.' : 'The initial state is already the goal.'}`, 'success');
    } else {
      $('board-status').textContent = statusLabel(result.status);
      const messages = {
        cancelled: 'Search cancelled safely. Partial statistics and the actual search trace are retained. Run BFS to start again.',
        unsolvable: 'Unsolvable: initial and goal parity differ. There is no legal solution.',
        limited: 'Search stopped at its limit. This does not mean the puzzle is unsolvable.',
        exhausted: 'The frontier is empty. No reachable goal was found.'
      };
      message(messages[result.status], result.status === 'unsolvable' ? 'error' : '');
    }
  } catch (error) {
    if (token === generation) message(`Search failed: ${error.message}`, 'error');
  } finally {
    if (token === generation) {
      controller = null;
      $('run').disabled = false;
      $('cancel').disabled = true;
    }
  }
}
function renderRuns() {
  $('clear-runs').disabled = !runs.length;
  if (!runs.length) {
    $('run-history').innerHTML = '<div class="empty-state spacious"><h3>No measurements yet.</h3><p>Run a puzzle to record actual search statistics.</p><a class="text-link" href="#solver">Open Puzzle Solver →</a></div>';
    return;
  }
  $('run-history').innerHTML = `<div class="table-scroll"><table class="run-table"><thead><tr><th>Initial → goal (0 = blank)</th><th>Status</th><th>Generated</th><th>Expanded</th><th>Moves</th><th>Elapsed</th><th>Mode</th></tr></thead><tbody>${runs.map(run => `<tr><td class="mono">${formatState(run.initial)}<br>→ ${formatState(run.goal)}</td><td>${statusLabel(run.status)}</td><td>${number(run.generated)}</td><td>${number(run.expanded)}</td><td>${number(run.moves)}</td><td>${run.elapsed.toFixed(1)} ms</td><td>${run.slow ? 'Every expansion' : 'Batched'}</td></tr>`).join('')}</tbody></table></div>`;
}
function navigate() {
  const target = location.hash.slice(1) || 'overview';
  // The skip link is a focus action, not a page route.
  if (target === 'main') { $('main').focus(); return; }
  const valid = ['overview', 'solver', 'visualization', 'guide', 'comparison', 'about'];
  route = valid.includes(target) ? target : 'overview';
  document.querySelectorAll('.page').forEach(page => { page.hidden = page.id !== `page-${route}`; });
  document.querySelectorAll('[data-route]').forEach(link => {
    const active = link.dataset.route === route;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  $('sidebar').classList.remove('open');
  $('menu-toggle').setAttribute('aria-expanded', 'false');
  $('menu-toggle').setAttribute('aria-label', 'Open navigation');
  if (route === 'visualization') visualization.render(initial);
  document.title = `AI Puzzle Lab | ${({ overview: '8-Puzzle', solver: 'Puzzle Solver', visualization: 'Search Visualization', guide: 'Algorithm Guide', comparison: 'Performance Comparison', about: 'About Project' })[route]}`;
  window.scrollTo(0, 0);
}

$('config-form').addEventListener('submit', event => {
  event.preventDefault();
  try { applyInputs(); message('Configuration valid. Parity matches; the goal is reachable.', 'success'); }
  catch (error) { invalidate(); message(error.message, 'error'); }
});
for (const id of ['initial-input', 'goal-input']) $(id).addEventListener('input', () => {
  dirty = true;
  invalidate();
  $('board-status').textContent = 'Unapplied edits';
  message('Configuration edited. Apply it or run BFS to validate. Previous solution cleared.');
});
$('run').addEventListener('click', runSearch);
$('cancel').addEventListener('click', () => {
  controller?.abort();
  $('cancel').disabled = true;
  message('Cancellation requested. Waiting for the current batch to yield.');
});
$('random').addEventListener('click', () => {
  let selectedGoal;
  try { selectedGoal = parseState($('goal-input').value, 'Goal state'); }
  catch (error) { message(error.message, 'error'); return; }
  commit(shuffledState(selectedGoal, 60), selectedGoal);
  message('Random solvable puzzle generated with 60 legal slides from your goal. This is not a difficulty or shortest-depth guarantee.');
});
$('shuffle').addEventListener('click', () => {
  if (dirty) {
    try { applyInputs(); } catch (error) { message(error.message, 'error'); return; }
  }
  commit(shuffledState(displayed, 20), goal);
  message('Puzzle shuffled with 20 legal slides. Your goal is unchanged.');
});
$('example').addEventListener('click', () => {
  // Loading the example resets only the initial state; the selected goal is preserved.
  if (!isSolvable(EXAMPLE_INITIAL, goal)) {
    message('The example and your goal have different parity. Choose the example goal in the Goal state field to use this initial state.', 'error'); return;
  }
  commit(EXAMPLE_INITIAL, goal);
  message('Example initial state loaded. Your selected goal is unchanged.');
});
$('reset-puzzle').addEventListener('click', () => {
  commit(resetInitial, goal);
  message('Puzzle restored to the last applied or generated initial state. Search and playback cleared.');
});
$('play').addEventListener('click', () => playback.status === 'playing' ? playback.pause() : playback.play());
$('previous').addEventListener('click', () => playback.seek(playback.step - 1));
$('next').addEventListener('click', () => playback.seek(playback.step + 1));
$('reset-playback').addEventListener('click', () => playback.reset());
$('replay').addEventListener('click', () => playback.replay());
$('speed').addEventListener('change', () => playback.setSpeed(Number($('speed').value)));
$('solution-scrubber').addEventListener('input', () => playback.seek(Number($('solution-scrubber').value)));
$('snapshot-range').addEventListener('input', () => {
  visualization.follow = false;
  visualization.index = Number($('snapshot-range').value);
  visualization.render(initial);
});
$('follow-live').addEventListener('click', () => {
  visualization.follow = true;
  visualization.index = Math.max(0, visualization.snapshots.length - 1);
  visualization.render(initial);
});
$('clear-runs').addEventListener('click', () => { runs.length = 0; renderRuns(); });
$('compute-example').addEventListener('click', async () => {
  $('compute-example').disabled = true;
  $('walkthrough').innerHTML = '<p class="empty-state">Computing the example with the same BFS engine…</p>';
  try {
    const result = await bfs(EXAMPLE_INITIAL, EXAMPLE_GOAL);
    $('walkthrough').replaceChildren();
    result.path.forEach((state, index) => {
      const wrapper = document.createElement('div'); wrapper.className = 'walkthrough-step';
      const label = document.createElement('strong'); label.textContent = `STEP ${index}${index === result.path.length - 1 ? ' · GOAL' : ''}`;
      const board = document.createElement('div'); board.setAttribute('role', 'img');
      const explanation = document.createElement('p'); explanation.textContent = index ? describeTransition(result.path[index - 1], state).text : 'Initial state · depth 0';
      wrapper.append(label, board, explanation); $('walkthrough').append(wrapper);
      new PuzzleBoard(board).render(state, { animate: false });
    });
  } catch (error) { $('walkthrough').textContent = error.message; }
  finally { $('compute-example').disabled = false; }
});
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('theme-toggle').setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  $('theme-toggle').setAttribute('aria-pressed', String(theme === 'dark'));
}
let preferredTheme;
try { preferredTheme = localStorage.getItem('puzzle-theme'); } catch { /* Storage may be disabled. */ }
setTheme(preferredTheme === 'dark' || (!preferredTheme && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light');
$('theme-toggle').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(theme);
  try { localStorage.setItem('puzzle-theme', theme); } catch { /* Theme still works without persistence. */ }
});
$('menu-toggle').addEventListener('click', () => {
  const open = $('sidebar').classList.toggle('open');
  $('menu-toggle').setAttribute('aria-expanded', String(open));
  $('menu-toggle').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    $('sidebar').classList.remove('open'); $('menu-toggle').setAttribute('aria-expanded', 'false');
    $('menu-toggle').setAttribute('aria-label', 'Open navigation');
  }
});
document.addEventListener('click', event => {
  if (!$('sidebar').contains(event.target) && !$('menu-toggle').contains(event.target)) {
    $('sidebar').classList.remove('open'); $('menu-toggle').setAttribute('aria-expanded', 'false');
    $('menu-toggle').setAttribute('aria-label', 'Open navigation');
  }
});
window.addEventListener('hashchange', navigate);
overviewBoard.render(EXAMPLE_INITIAL, { animate: false });
mainBoard.render(initial, { animate: false });
goalBoard.render(goal, { animate: false });
renderStats($('solver-stats'));
navigate();
