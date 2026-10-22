import { describeTransition, equal } from './puzzle.js';

/** Stable tile elements with transformed coordinates, never grid reordering. */
export class PuzzleBoard {
  constructor(element, onMove = null) {
    this.element = element;
    this.tiles = new Map();
    this.state = null;
    element.classList.add('puzzle-board');
    for (let tile = 0; tile <= 8; tile++) {
      const cell = document.createElement(onMove && tile ? 'button' : 'span');
      cell.className = tile ? 'puzzle-tile' : 'blank-cell';
      cell.dataset.tile = tile;
      cell.textContent = tile || '';
      if (cell.tagName === 'BUTTON') {
        cell.type = 'button';
        cell.addEventListener('click', () => onMove(tile));
      }
      this.tiles.set(tile, cell);
      element.append(cell);
    }
  }
  render(state, { animate = true, goal = false, duration = 420 } = {}) {
    let moving = null;
    if (this.state && !equal(this.state, state)) {
      try { moving = describeTransition(this.state, state).tile; } catch { animate = false; }
    }
    this.element.classList.toggle('instant', !animate);
    this.element.classList.toggle('goal', goal);
    this.element.style.setProperty('--tile-duration', `${duration}ms`);
    const blank = state.indexOf(0);
    state.forEach((tile, index) => {
      const cell = this.tiles.get(tile);
      const row = Math.floor(index / 3), col = index % 3;
      cell.style.setProperty('--x', col);
      cell.style.setProperty('--y', row);
      cell.classList.toggle('moving', tile === moving && animate);
      if (tile) {
        const adjacent = Math.abs(row - Math.floor(blank / 3)) + Math.abs(col - blank % 3) === 1;
        cell.setAttribute('aria-label', `Tile ${tile}, row ${row + 1}, column ${col + 1}${adjacent ? ', can slide into blank' : ''}`);
        if (cell.tagName === 'BUTTON') cell.setAttribute('aria-disabled', String(!adjacent));
      }
    });
    this.element.setAttribute('aria-label', `${goal ? 'Goal reached. ' : ''}Puzzle: ${state.map(n => n || 'blank').join(', ')}`);
    this.state = [...state];
  }
}
