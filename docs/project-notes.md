# Project notes

## Architecture for a demonstration

`puzzle.js` owns the rules; `bfs.js` owns search; `animation.js` owns timed path traversal; `board.js` owns tile positions; `visualization.js` owns sampled search rendering; `statistics.js` formats actual measurements; `app.js` connects controls and navigation.

The search view and the playback board show two different processes. A BFS expansion may be unrelated to the eventual path. Search snapshots record dequeue order, parent data, successors and queue prefixes. Playback consumes only the returned path. Directions describe the **numbered tile**; a tile sliding right means the blank moves left.

Nine stable DOM elements represent the puzzle. Eight tile transforms change coordinates in response to legal path transitions; grid reordering is not used. Backward stepping derives the highlighted tile from the reverse transition. Board replacement skips slide animation because a shuffle or new input need not be adjacent. The completion message requires a valid returned path, the last path index, and equality with the selected goal.

Each input edit cancels and invalidates search/playback immediately. Validation happens on Apply or Run. Generation tokens prevent abandoned async results from changing the new puzzle. Playback always owns at most one timer; pause, seek, reset, reload, speed changes and invalidation clear the old timer first.

## Initial inspection

The supplied workspace contained no files, package metadata, existing puzzle source or applicable ancestor AGENTS.md. The pasted brief was read before implementation. Consequently this is a new implementation directly in the requested workspace, using the user's requested static technologies. No registration number was provided or introduced in the rendered website.

## Automated verification

Run `npm test` to reproduce all tests. The suite includes the actual 31-move hardest case and a reverse distance oracle for all states within five moves of the example goal, rather than checking a hardcoded path alone. Playback uses a deterministic fake clock in tests to verify timer uniqueness, pause/resume, reset/replay, single-step movement, speed changes and invalidation.

The finite puzzle graph makes true frontier exhaustion impossible for a valid parity-matched goal; the empty FIFO is tested and the exhaustion branch is inspected. This branch is not claimed to have been reached by a valid 8-Puzzle integration test.

Final automated result: **21 tests passed, 0 failed** using `npm test` on 22 October 2026. This includes the static asset/import and repository-subpath checks. Two real defects found during development were corrected: zero-move replay recursion and invoking browser timer functions with the wrong receiver. The final engine/playback tests passed after those fixes, and real browser animation subsequently completed successfully.

## Observed browser verification

The finished application was tested in the Codex in-app browser over a local static server. Root hosting and `/ai-puzzle-lab/` repository-subpath hosting both loaded. Final application logs on the repository-subpath document contained no warnings or errors. The CSS and BFS module also returned HTTP 200 directly under that subpath.

| Area | Checks actually performed |
| --- | --- |
| Navigation | All six desktop pages, active page indication, overview launch, mobile menu open/close and mobile route selection |
| Example BFS | Five-move, six-state result; 62 unique generated states, 35 processed states, discovered maximum depth 6, solution depth 5 |
| Playback | Next/Previous and tile highlighting; Play/Pause/Resume; Reset and hidden completion message; Replay and actual final goal equality; all three speed selectors |
| Real movement | Stable tile element had a translated matrix and a 0.44 s transform transition at Slow; actual final board matched the selected goal after automatic playback |
| Input and state changes | Valid configuration, duplicate error, incompatible parity error, initial equal to goal, manual adjacent slide, input-edit invalidation during playback |
| Puzzle tools | Custom-goal random generation, shuffle preserving the goal, Load Example and Reset Puzzle |
| Cancellation | Slow per-expansion search cancelled safely; partial counters retained and playback disabled |
| Search dashboard | Actual FIFO front, explored order/depth, parent, discovered successors, duplicate skip, bounded event log and historical snapshot slider |
| Guide and comparison | Computed example walkthrough contained six states; actual run history and Clear history empty state; unimplemented algorithms marked Theory only |
| Appearance | Light and dark modes; mobile sidebar removed from accessibility tree while closed; accurate menu labels and state |
| Responsive layout | Requested widths 1440, 1366, 1024, 768, 390 and 320 px, including 1366 × 768 laptop and 390 × 844 phone; document scroll width equaled client width on checked solver/overview/comparison layouts |
| Control fit | Laptop tile board was 220 px wide; secondary playback controls ended at y = 718 in a 768 px viewport. Phone board was about 191 px wide, with playback controls ending at y = 702. Header did not overlap at 390 or 320 px |

Desktop and phone screenshots are in `docs/screenshots/`. Reduced-motion support was verified by inspecting the CSS media query and its transition/animation overrides; the operating-system preference was not changed for a separate runtime test. Full screen-reader testing and a real GitHub Pages deployment were not performed. The manual checklist below supports those final checks.

## Manual acceptance checklist

1. Visit every navigation item; verify the active item, compact header and mobile collapsible menu. No registration identifier appears in headers, menus, badges, tooltips or page content.
2. Apply exactly nine unique values 0–8. Try duplicates, missing values, negative values, decimal values, letters, no blank and two blanks. Clear inline errors must appear and no old path may play.
3. Swap two nonblank tiles to change parity. Run BFS must report that the goal is unreachable, never show success, and never fabricate stats or a path.
4. Set the two states equal. Search must produce one state and zero moves. Try a one-move input and the supplied example (five moves).
5. Inspect an intermediate search snapshot: FIFO front, depth, parent, discovered/duplicate successors, expansion order and real event IDs. Compare the final counters with the solver. Search history and solution order must not be conflated.
6. Turn on Watch every expansion. Run, navigate to Search Visualization, inspect a snapshot and choose Follow latest. Cancel Search; verify partial statistics and an explicit cancelled state.
7. Play the example. Verify the actual numbered tile slides into the blank; pause/resume, next/previous, reset, replay and every speed setting must work. Verify the goal before success. Repeat Play/Replay/Speed interactions and confirm there is no doubled playback.
8. During playback edit input, click an adjacent tile or shuffle. Playback must stop and disable until a fresh search completes. Nonadjacent tiles must not change the board.
9. Generate random puzzles with a custom valid goal. Goal must stay unchanged and every generated board must be solvable relative to it. Loading Example preserves the goal and reports a parity mismatch if needed.
10. Check both themes, keyboard-only controls and focus rings. Enable reduced motion in the operating system; movement should become immediate while the explanations and step controls remain useful.
11. Check 1440 px desktop, 1024 px laptop, 768 px tablet, 390 px phone and 320 px narrow viewport. Main content must not overflow horizontally; tables may scroll inside their own container. Controls remain reachable.
12. Open Performance Comparison before any run: no sample measurements. After runs, only actual BFS records appear; all other algorithms remain Theory only. Clear history must restore the empty state.
13. Compute the Algorithm Guide walkthrough. It must show six states with solver-derived move descriptions for the supplied example.
14. Serve under a repository subpath, navigate directly to `index.html#solver`, and check local assets, module requests and console errors. After publishing, repeat against the real GitHub Pages URL.

## Remaining operational steps

Create/push a GitHub repository, enable Pages for its root directory, replace README URL and screenshot placeholders, and verify the real deployment. A hosted URL cannot be verified before a real repository/site exists. Timings vary with device and teaching mode. Memory remains an explicitly documented estimate. Search trace retention and tab-local run history are intentional limits.
