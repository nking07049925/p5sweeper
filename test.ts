import { Graphics } from "p5";

type GameState = "START" | "PLAYING" | "DEAD" | "WIN";

class Cell {
  hasBomb: boolean;
  flagged: boolean;
  revealed: boolean;
  neighbours: Set<Cell>;

  bombCount: number = 0;

  setBomb() {
    if (this.hasBomb)
      throw new Error(
        "Trying to set bomb, but cell already had bomb; something went wrong"
      );
    this.hasBomb = true;
    this.neighbours.forEach((cell) => cell.bombCount++);
  }

  display(graphics: Graphics) {}
  update() {}
  reveal() {
    this.revealed = true;
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
  state: GameState;
  graphics: Graphics;

  init() {
    this.cells = this.manager.generate();
    this.bombs = new Set();
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
      cells[taken[x] ?? x].setBomb();
      taken[x] = taken[i] ?? i;
    }

    this.cells.forEach((cell) => cell.hasBomb && this.bombs.add(cell));
  }

  revealCells(nucleus: Cell) {
    const visited = new Set<Cell>();
    const revealed: QueueCell[] = [];

    interface QueueCell {
      cell: Cell;
      depth: number;
    }

    const queue = [{ cell: nucleus, depth: 0 }];
    while (queue.length) {
      const current = queue.shift() as QueueCell;
      const { cell, depth } = current;
      if (visited.has(cell)) continue;
      visited.add(cell);

      if (cell.revealed) continue;

      cell.reveal();
      revealed.push(current);

      if (!cell.bombCount)
        cell.neighbours.forEach((cell) =>
          queue.push({ cell, depth: depth + 1 })
        );
    }
  }

  initialReveal(x: number, y: number): boolean {
    const nucleus = this.manager.findCell(x, y);
    if (!nucleus) return false;
    this.placeBombs(floor(this.cells.length * 0.5), nucleus);
    this.revealCells(nucleus);
    return true;
  }

  display() {
    this.manager.display(this.graphics, this.cells);
  }
}
