# AI Puzzle Lab

**Interactive 8-Puzzle Problem Solver Using AI Search Algorithms**  
Course: Artificial Intelligence · Student: Shaunak Dutta  
Assigned algorithm: Breadth-First Search (BFS)

A complete static educational application. Configure an initial and goal arrangement, inspect genuine FIFO exploration, and animate the minimum-move solution. No registration number is included in the website. The workspace was empty when implementation began; there was no earlier source code to preserve.

## Overview and problem statement

The 8-Puzzle has eight numbered tiles and one blank on a 3 × 3 board. A move slides one adjacent numbered tile into the blank. Find a sequence of legal slides that transforms an initial state into a selected goal, minimizing the number of moves.

The application models arrangements as graph vertices and legal slides as edges. The blank is `0` internally and empty visually. Its objectives are to explain state-space search, demonstrate FIFO exploration and duplicate detection, recover a shortest path through parent pointers, and measure the real cost of BFS.

## Run locally

The **application has no runtime dependencies and requires no Node application server**. Serve the folder with any static HTTP server, such as VS Code Live Server, and open `index.html` over HTTP. Opening it with `file://` is unsupported because browser restrictions prevent ES module loading.

If Node.js 20+ is installed, an optional dependency-free development helper is included:

```sh
npm start
```

Open `http://127.0.0.1:4173`. No `npm install` is needed. The helper is for local preview only; GitHub Pages serves the same files directly.

## Features and demonstration

- Six working hash-based pages: Overview, Puzzle Solver, Search Visualization, Algorithm Guide, Performance Comparison, About Project.
- Responsive navigation, light/dark theme, keyboard focus indicators, semantic controls and reduced-motion support.
- Validated custom initial and goal inputs, legal manual tile slides, random solvable generation, shuffle, example loading and puzzle reset.
- Genuine asynchronous BFS: head-index FIFO queue, discovered map, parent/move/depth records, parity validation and cancellation.
- Smooth translation of stable individual tile elements through the real reconstructed path. The blank is a separate visual cell.
- Play / Pause / Resume, Next / Previous, step scrubber, Reset, Replay and Slow / Normal / Fast timing.
- Separate exploration snapshots, current node, parent, frontier, explored states, discovered and duplicate successors, and actual event log.
- Live measurements, latest 12 actual runs in the current tab, theoretical comparison, and solver-computed example walkthrough.

### Verify the animation

1. Open **Puzzle Solver**. The supplied initial state is `283164705`; the goal is `123804765` (0 = blank).
2. Select **Run BFS**. The example requires **5 moves**, so playback contains **6 states**, including step 0.
3. Select **Play Animation**. A numbered tile visibly slides into the blank for each legal move. Search does not auto-start playback.
4. Use **Pause**, **Resume**, **Next**, **Previous**, **Reset**, **Replay** and the speed selector. Reset preserves the computed path and returns to step 0; Reset Puzzle clears the search and restores the last applied/generated initial configuration.
5. At the last step the board is checked against the selected goal before showing **GOAL REACHED / BFS FOUND THE SHORTEST SOLUTION**. An already-solved input correctly has zero moves.
6. Change an input, click a legal tile, shuffle or generate another puzzle. Old playback and search are invalidated immediately.

Slow = 1200 ms/move; Normal = 600 ms/move; Fast = 200 ms/move. Tile transition duration is at most 440 ms and 72% of the selected interval. Each transition completes before the next automatic move. Manual controls remain available during playback and stop its single timer. Reduced-motion users see immediate, understandable state changes with the same step controls and explanations.

## Technologies and structure

HTML5, CSS3, CSS Grid, transform transitions, JavaScript ES modules and browser APIs. No framework, CDN, API, backend, database, build step, or external font is required.

```text
index.html                 Six page sections, navigation and educational content
assets/favicon.svg         Local application icon
css/style.css              Design tokens, themes, tile movement and breakpoints
js/
  app.js                   Routing, input controls and application integration
  puzzle.js                Validation, parity, legal moves and solvable shuffling
  bfs.js                   Independent asynchronous FIFO graph-search engine
  animation.js             DOM-independent playback state machine, one timer
  board.js                 Stable tile DOM elements and transform positioning
  visualization.js         Bounded execution snapshots and search dashboard
  statistics.js            Honest counters and presentation helpers
tests/
  puzzle.test.mjs           Puzzle validation, parity, legal moves, random generation
  bfs.test.mjs              FIFO, shortest paths, accounting, cancellation, hard case
  animation.test.mjs        Playback controls and timer lifecycle
  static.test.mjs           Local paths, module imports and HTML structure
tools/serve.mjs             Optional static preview server
docs/project-notes.md       Architecture, testing evidence and manual test checklist
README.md                  Usage, algorithm and GitHub Pages deployment
LICENSE                    MIT license
package.json               Optional local preview/test commands; no dependencies
```

## BFS working principle

1. Validate both states and compare inversion parity.
2. Insert the initial state at depth 0 into the FIFO queue and mark it discovered.
3. Dequeue the oldest waiting state and check for the goal.
4. If it is not the goal, generate every legal adjacent tile slide.
5. Skip already discovered states; mark new states on enqueue and store their parent, tile direction and depth.
6. Repeat until the goal is dequeued, the user cancels, an optional engine limit is reached, or the frontier is empty.
7. Follow parent pointers from the goal to the initial state and reverse the resulting path.

```text
validate(initial, goal)
if inversion_parity(initial) != inversion_parity(goal):
    return UNSOLVABLE
queue.enqueue(initial)
discovered[initial] = { parent: null, depth: 0 }
while queue is not empty:
    if cancelled: return CANCELLED
    current = queue.dequeue()
    if current == goal:
        return reconstruct_path(discovered, current)
    for successor in legal_neighbors(current):
        if successor not in discovered:
            discovered[successor] = {
                parent: current,
                move: actual_tile_direction,
                depth: discovered[current].depth + 1
            }
            queue.enqueue(successor)
return FRONTIER_EXHAUSTED
```

Marking states when they enter the queue prevents duplicate enqueues and cycles. Every move costs one, so processing in nondecreasing depth order guarantees a shortest solution. The engine is independent of all DOM code and returns paths computed from parent pointers, never a hardcoded answer.

### Complexity and assumptions

With graph duplicate detection and constant-time map/queue operations, BFS takes **O(V + E) time and O(V) space**, where V is the reachable states and E is legal edges. The finite 8-Puzzle has 9! total permutations and two parity components of 181,440 states each. Queue slots are retained until the run is released; this remains O(V).

The conventional tree-search estimate is **O(b^d) time and space**, with branching factor b and shallowest goal depth d. A literal tree search that goal-checks on dequeue may generate the next level; some texts express that time bound as O(b^(d+1)). These are growth estimates, distinct from observed wall time. BFS is complete on this finite graph and optimal for equal positive move costs. It does not minimize cost for arbitrary weighted edges. Parent storage and a large frontier can consume considerable memory.

Only BFS executes. DFS, DLS, IDDLS (iterative deepening depth-limited search), GBFS and A* are theoretical rows with explicit assumptions. They have no fabricated benchmarks.

### Validation and random generation

Both inputs must contain exactly nine single-digit integers 0–8, each once; spaces, newlines, commas or semicolons separate values. The interface reports duplicates, invalid tokens and blank count errors. For this odd-width board, initial and goal inversion parity (excluding 0) must match. The comparison is against the **selected goal**, not a hardcoded sorted goal.

Generate Random Puzzle performs 60 legal slides starting from the goal; Shuffle Puzzle performs 20 legal slides from the displayed arrangement. Immediate reversal is avoided. These operations preserve solvability, but do not sample states uniformly or guarantee a difficulty level. Generating a random puzzle can replace an invalid initial input using a valid selected goal. The goal is preserved by shuffle, example loading, reset and manual moves; random generation honors a valid edited goal explicitly entered by the user.

### Cancellation, search sampling and responsiveness

Default searches yield after at most 256 processed nodes. The first 16 expansions also produce detailed snapshots. “Watch every expansion” uses one node per batch and an 80 ms interval for teaching. Cancel is processed at the next opportunity; replacing a puzzle aborts and invalidates the old search through a generation token. No later callback can overwrite a new puzzle.

Only the latest 120 snapshots are retained. Each contains at most 8 frontier entries, 12 explored entries and 80 actual events. The slider inspects retained snapshots; Follow latest returns to live view. DOM work is coalesced into animation frames. The displayed frontier is the first portion of the real queue, and the total waiting count is shown. A goal snapshot has no generated successors because expansion stops after its goal check. Inspect a preceding snapshot to see successor/duplicate handling.

There is no default search cap; the valid state space is finite. The engine's optional `maxExpanded` returns `limited`, never a false claim of unsolvability. Frontier exhaustion is explicitly handled, though a valid parity-matched 8-Puzzle goal is always reachable. The queue's empty behavior is unit-tested; the unreachable exhaustion branch is reviewed, not artificially presented as a real puzzle run.

### Statistics conventions

| Measurement | Definition |
| --- | --- |
| Solution status | Ready, searching, solved, cancelled, unsolvable, limited or exhausted |
| Nodes generated | Unique states discovered, including the initial state |
| Nodes expanded | States dequeued and processed, including a dequeued goal |
| Maximum search depth | Largest depth among discovered states; can exceed solution depth |
| Solution depth | Depth of the dequeued goal; unavailable for interrupted/failed searches |
| Total moves | Number of transitions in the returned path (path length minus one) |
| Execution time | `performance.now()` wall time, including cooperative scheduling, trace callbacks and demonstration delays |
| Memory usage (estimate) | 96 bytes per discovered record + 8 bytes per retained queue slot |

The memory model excludes DOM, snapshots, JavaScript engine overhead and other browser memory; it is an educational estimate, **not a measured heap size**. Timing is device-dependent. Compare timing only under similar settings. Run history is tab-local and clears on reload. Cancelled runs record partial real counters with no solution depth or moves. Preflight invalid input does not create a benchmark or fake search trace.

## Tests

With Node.js 20+:

```sh
npm test
```

No installation is required. Tests use Node's built-in test runner. Coverage includes input validation; odd-width parity for custom goals; 100 generated puzzles; FIFO empty/dequeue order; depth-zero and one-move solutions; example path legality and accounting; shortest distances for every state within five moves of the example goal using a reverse-distance oracle; parent/depth tracking; duplicate handling; cancellation; limits; a known 31-move puzzle; all playback controls and timer changes; and static hosting integrity.

See [project notes](docs/project-notes.md) for observed browser verification, honest limits and a manual checklist. Browser screenshots are described below rather than shipping fabricated images.

## Screenshots

- [Verified desktop solver](docs/screenshots/solver-desktop.jpg)
- [Verified mobile solver](docs/screenshots/solver-mobile.jpg)
- [Screenshot placeholder: overview, light theme]
- [Screenshot placeholder: search snapshot showing the frontier and duplicate successors]

The two supplied screenshots were captured from the working application during browser verification. Replace remaining placeholders with screenshots from your own demonstration if needed.

## GitHub Pages deployment

Repository URL: **[Add your actual GitHub repository URL]**  
Live site URL: **[Add your actual GitHub Pages URL]**

1. Create a GitHub repository (for example, `ai-puzzle-lab`). Choose the visibility and account appropriate for your assignment.
2. Upload this folder's files, or commit and push them. Keep `index.html` at the repository root, with `css/`, `js/` and `assets/` beside it. Do not nest everything in an extra folder.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the branch containing the application (commonly `main`) and **/ (root)**, then save.
6. Wait for GitHub to finish publishing and use the actual URL displayed in Pages settings.
7. Verify all six sections, Run BFS, tile animation, and the browser console at that URL. Update the URL placeholders above.

All local files use relative URLs and navigation uses hashes, so repository subpaths work without server rewrites. `.nojekyll` disables unnecessary Jekyll processing. No secrets, machine paths, localhost API calls or application server are used by the production files. The optional preview server also serves `/ai-puzzle-lab/` as a subpath test fixture. No repository or live deployment has been invented or created.

Official publishing reference: [GitHub Docs — configure a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## References and acknowledgements

- [Princeton Algorithms, section 4.1: graphs and breadth-first paths](https://algs4.cs.princeton.edu/41graph/) — graph-search concepts and shortest unweighted paths.
- [UC Berkeley CS188 textbook: uninformed search](https://inst.eecs.berkeley.edu/~cs188/textbook/search/uninformed.html) — search strategies, assumptions and tree-search complexity conventions.
- [GitHub Pages documentation](https://docs.github.com/en/pages) — static publishing guidance.
- Native browser CSS/JavaScript APIs and Node's built-in development/test tools. No third-party runtime assets or libraries.

## License

MIT. See [LICENSE](LICENSE).
