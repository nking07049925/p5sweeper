import { Graphics } from "p5";

type GameState = "START" | "PLAYING" | "DEAD" | "WIN";

class Cell {
  hasBomb: boolean;
  flagged: boolean;
  revealed: boolean;
  neighbours: Set<Cell>;

  bombCount = 0;

  setBomb() {
    this.hasBomb = true;
    this.neighbours.forEach((cell) => cell.bombCount++);
  }

  display(graphics: Graphics) {}
  update() {}
  reveal(visited = new Set<Cell>()) {
    if (visited.has(this)) return;
    visited.add(this);

    this.revealed = true;

    if (!this.bombCount)
      this.neighbours.forEach((neighbour) => neighbour.reveal());
  }
  flag() {
    this.flagged = true;
  }
}

/** Cell specific stuff */
interface CellManager {
  generate(): Cell[];
  display(graphics: Graphics, cells: Cell[]): void;
  findCell(x: number, y: number): Cell;
}

/** Implements all of the common graph and game logic */
class MineSweeper {
  constructor(private manager: CellManager, w: number, h: number) {
    this.init();
    this.graphics = createGraphics(w, h);
  }

  cells: Cell[];
  bombs: Set<Cell>;
  unrevealed: Set<Cell>;
  state: GameState;
  graphics: Graphics;

  init() {
    this.cells = this.manager.generate();
    this.bombs = new Set();
    this.unrevealed = new Set();
    this.state = "START";
  }

  placeBombs(count: number, nucleus: Cell) {
    const skipped = new Set([nucleus, ...nucleus.neighbours]);
    if (count > skipped.size) return;
    const cells = this.cells.filter(
      (cell) => cell != nucleus && !nucleus.neighbours.has(cell)
    );
    const taken: Record<number, number> = {};
    for (let i = 0; i < cells.length; i++) {
      const x = floor(random(cells.length - i) + i);
      const cell = cells[taken[x] ?? x];
      cell.hasBomb = true;
      this.bombs.add(cell);
      taken[x] = taken[i] ?? i;
    }
  }

  initialReveal(x: number, y: number): boolean {
    const cell = this.manager.findCell(x, y);
    if (!cell) return false;
    this.placeBombs(floor(this.cells.length * 0.5), cell);
    cell.reveal();
    return true;
  }

  display() {
    this.manager.display(this.graphics, this.cells);
  }
}
