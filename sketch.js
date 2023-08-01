//@ts-check
/** @typedef {import("p5/global")} p5global */
/** @typedef {import("p5").Vector} Vector */

const cellSize = 50;

/** @type {"START" | "PLAYING" | "DEAD" | "WIN"} */
let gameState = "START";

/** @type {Cell | undefined} */
let hovered = undefined;
let brightColor = 255;

class Cell {
  /** @param {Vector} pos */
  constructor(pos = createVector()) {
    /** @type {Vector} */
    this.pos = pos;
    /** @type {boolean} */
    this.hasBomb = false;
    /** @type {Set<Cell>} */
    this.neighbours = new Set();
    /** @type {number} */
    this.bombCount = 0;
    /** @private @type {number} */
    this.flagCount = 0;
    /** @private @type {number} */
    this.unrevealedCount = 0;
    /** @type {boolean} */
    this.revealed = false;
    /** @type {boolean} */
    this.flagged = false;
  }

  display() {
    const { x, y } = this.pos;
    fill(
      hovered == this
        ? brightColor / 4
        : hovered?.neighbours.has(this)
        ? brightColor / 8
        : 0
    );
    const half = cellSize / 2;
    const size = cellSize;
    stroke(brightColor);
    rect(x, y, cellSize, cellSize);
    const center = this.pos.copy().add(half, half);
    if (!this.revealed) {
      rect(x + size * 0.1, y + size * 0.1, size * 0.8, size * 0.8);
      if (this.flagged) {
        noStroke();
        fill(brightColor);
        const r = size * 0.2;
        triangle(
          x + half - r + r / 6,
          y + half,
          x + half + r / 2 + r / 6,
          y + half - (r * 3) / 2 / sqrt(3),
          x + half + r / 2 + r / 6,
          y + half + (r * 3) / 2 / sqrt(3)
        );
      }
      return;
    }
    if (this.hasBomb) {
      noStroke();
      fill(brightColor);
      drawBomb(center, size / 4);
    } else {
      drawDie(this.bombCount, center, size / 4);
    }
  }

  /**
   * Add a cell to the list of neighbours
   * @public
   * @param {Cell} cell
   */
  addNeighbour(cell) {
    this.neighbours.add(cell);
    this.unrevealedCount++;
  }

  getCells() {
    return [this, ...this.neighbours];
  }

  setBomb() {
    this.hasBomb = true;
    this.neighbours.forEach((neighbour) => {
      neighbour.bombCount++;
    });
  }

  reveal(visited = new Set()) {
    if (this.flagged || visited.has(this)) return;
    visited.add(this);

    if (this.bombCount && this.flagCount == this.bombCount) {
      this.neighbours.forEach((neighbour) => neighbour.reveal(visited));
    }
    if (this.revealed) return;

    unrevealed.delete(this);
    this.revealed = true;
    this.neighbours.forEach((neighbour) => neighbour.unrevealedCount--);
    if (this.hasBomb) return;
    if (!this.bombCount)
      this.neighbours.forEach((neighbour) => neighbour.reveal(visited));
  }

  /**
   * @type {(direct?: boolean) => void}
   */
  flag(direct) {
    if (this.revealed) {
      if (this.unrevealedCount == this.bombCount) {
        this.neighbours.forEach(
          (neighbour) => !neighbour.revealed && neighbour.flag()
        );
      }
      return;
    }
    if (this.flagged && !direct) return;
    this.flagged = !this.flagged;
    if (this.flagged) flagged.add(this);
    else flagged.delete(this);
    this.neighbours.forEach((neighbour) => {
      neighbour.flagCount += this.flagged ? 1 : -1;
    });
  }
}

function die() {
  gameState = "DEAD";
}

function win() {
  gameState = "WIN";
}

/** @type {Cell[]} */
let cells = [];
/** @type {Cell[]} */
let bombs = [];
/** @type {Set<Cell>} */
let unrevealed = new Set();
/** @type {Set<Cell>} */
let flagged = new Set();

const countX = 10;
const countY = 10;

/**
 * p5js setup
 */
function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  textAlign(CENTER, CENTER);

  randomSeed(1);

  generateCells();
}
/**
 * p5js draw
 */
function draw() {
  brightColor = gameState == "DEAD" ? 128 : 255;
  background(0);
  const sizeX = countX * cellSize;
  const sizeY = countY * cellSize;
  for (let i = 0; i < bombs.length; i++) {
    if (i < bombs.length - flagged.size) {
      fill(brightColor);
    } else {
      noFill();
    }
    stroke(brightColor);
    const h = height / 2 - sizeY / 2;
    drawBomb(
      createVector(
        cellSize + (i * cellSize) / 2 - width / 2,
        -height / 2 + h / 2 + (((i % 2) - 0.5) * h) / 4
      ),
      cellSize / 4
    );
  }
  cells.forEach((cell) => cell.display());
  if (gameState == "DEAD") drawSkull();
}

/**
 * @param {MouseEvent} event
 */
function mousePressed(event) {
  if (!["DEAD", "WIN"].includes(gameState)) {
    const clicked = findClicked(mouseX, mouseY);
    if (clicked) {
      if (gameState == "START") placeBombs(12, clicked.getCells());
      if (mouseButton == LEFT) {
        clicked.reveal();
        if (clicked.hasBomb) {
          return die();
        }
        if (unrevealed.size == bombs.length) {
          return win();
        }
      } else {
        clicked.flag(true);
      }
    }
  } else {
    generateCells();
  }
}

function mouseMoved() {
  hovered = findClicked(mouseX, mouseY);
}

function mouseDragged() {
  hovered = findClicked(mouseX, mouseY);
}

/**
 * Fill the cells variable with connected cells
 */
function generateCells() {
  gameState = "START";
  cells = [];
  bombs = [];
  flagged = new Set();

  /** @type {Cell[][]} */
  const temp = [];

  for (let j = 0; j < countX; j++) {
    temp.push([]);
    for (let i = 0; i < countY; i++) {
      const cell = new Cell(
        createVector((i - countX / 2) * cellSize, (j - countY / 2) * cellSize)
      );
      temp[j].push(cell);
      if (j > 0) {
        const other = temp[j - 1][i];
        other.addNeighbour(cell);
        cell.addNeighbour(other);
        if (i < countX - 1) {
          const other = temp[j - 1][i + 1];
          other.addNeighbour(cell);
          cell.addNeighbour(other);
        }
      }
      if (i > 0) {
        const other = temp[j][i - 1];
        other.addNeighbour(cell);
        cell.addNeighbour(other);
      }
      if (j > 0 && i > 0) {
        const other = temp[j - 1][i - 1];
        other.addNeighbour(cell);
        cell.addNeighbour(other);
      }
      cells.push(cell);
    }
  }

  unrevealed = new Set(cells);
}

/**
 * Choose random cells to be filled with bombs
 * @type {(bombCount: number, ignored?: Cell[]) => void}
 */
function placeBombs(bombCount, ignored) {
  gameState = "PLAYING";

  let viableCells = cells;
  if (ignored) {
    const viable = new Set(cells);
    ignored.forEach((cell) => viable.delete(cell));
    viableCells = [...viable];
  }

  /** @type {Cell[]} */
  const shuffled = shuffle(viableCells);
  shuffled.slice(0, bombCount).forEach((cell) => {
    bombs.push(cell);
    cell.setBomb();
  });
}

/**
 * Detects which specific cell was clicked
 * @type {(mouseX: number, mouseY: number) => Cell | undefined}
 */
function findClicked(mouseX, mouseY) {
  const loc = createVector(mouseX - width / 2, mouseY - height / 2);

  const sizeX = cellSize * countX;
  const sizeY = cellSize * countY;

  if (abs(loc.x) > sizeX / 2 || abs(loc.y) > sizeY / 2) return;

  loc.add(sizeX / 2, sizeY / 2).div(cellSize);

  const i = floor(loc.x);
  const j = floor(loc.y);
  return cells[i + j * countX];
}

/** @type {[number, number][][]} */
const dies = [
  [],
  [
    [1, -1],
    [-1, 1],
  ],
  [
    [-1, -1],
    [1, 1],
  ],
  [
    [-1, 0],
    [1, 0],
  ],
  [
    [0, -1],
    [0, 1],
  ],
];

/**
 * Render a die face with a specified value 0-9
 * @type {(num: number, pos: Vector, size: number) => void}
 */
function drawDie(num, pos, size) {
  if (num > 9) num = 9;
  noStroke();
  fill(brightColor);
  if (num % 2 == 1) {
    circle(pos.x, pos.y, 10);
  }
  for (let i = 0; i <= num / 2; i++) {
    dies[i].forEach(([x, y]) => circle(pos.x + x * size, pos.y + y * size, 10));
  }
}

/**
 * Render a bomb
 * @type {(pos: Vector, size: number) => void}
 */
function drawBomb(pos, size) {
  beginShape();
  for (let i = 0; i < 16; i++) {
    const angle = map(i, 0, 16, 0, TWO_PI);
    const { x, y } = createVector(size * (0.5 + 0.5 * (i % 2 ? 0 : 1)))
      .setHeading(angle)
      .add(pos);
    vertex(x, y);
  }
  endShape("close");
}

function drawSkull() {
  const deg = frameCount * 0.03;

  noStroke();
  fill(255);
  translate(0, -25 - 5 * sin(deg));
  circle(0, 0, 200);
  rect(-65, 0, 130, 110, 15);
  for (let i = 0; i < 6; i++) {
    rect(-58 + i * 20, 116 + 3 * sin(deg + i * 5), 16, 30, 4);
  }
  fill(0);
  circle(45, -10 + 3 * sin(deg + 0.8), 70);
  circle(-45, 10 + 3.5 * sin(deg + 2), 70);
  circle(5, 50 + 4 * sin(deg + 1.4), 30);
}
