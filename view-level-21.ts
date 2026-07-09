import { LevelGenerator } from "./src/logic/levelGenerator";

const currentLevel = 21;
const levelSeed = (currentLevel * 15485863) % 2147483647;
const levelGenerator = new LevelGenerator(levelSeed);
const level = levelGenerator.generate(currentLevel, false);

console.log("LEVEL 21 DATA:");
console.log("Grid Size:", level.gridSize);
console.log("Strategy:", level.strategyType);
console.log("Strategy Name:", level.strategyName);
console.log("Solution Paths Count:", level.solutionPaths?.length);
level.solutionPaths?.forEach((path, idx) => {
  console.log(`Path ${idx} (Length ${path.length}):`, JSON.stringify(path));
});

console.log("\nGRID STRUCTURE:");
for (let r = 0; r < level.gridSize; r++) {
  let rowStr = "";
  for (let c = 0; c < level.gridSize; c++) {
    const cell = level.grid[r][c];
    let char = ".";
    if (cell.type === "wall") char = "#";
    else if (cell.type === "dot") char = `D${cell.colorIndex}`;
    else if (cell.type === "rotator") char = "R";
    else if (cell.type === "bridge") char = "B";
    else if (cell.type === "teleporter") char = "T";
    rowStr += char.padEnd(4);
  }
  console.log(rowStr);
}
