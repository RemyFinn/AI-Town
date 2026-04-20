import * as Phaser from "phaser";

import "./styles.css";
import { TownBackendClient } from "./game/api/TownBackendClient";
import { WORLD_CONFIG } from "./game/content/world";
import { TownSimulation } from "./game/simulation/systems/TownSimulation";
import { BootScene } from "./phaser/scenes/BootScene";
import { TownScene } from "./phaser/scenes/TownScene";
import { createHud } from "./ui/hud/domHud";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("找不到 #app 容器。");
}

app.innerHTML = `
  <div class="app-shell">
    <div class="game-stage">
      <div id="game-root" class="game-root"></div>
    </div>
  </div>
`;

const gameRoot = document.querySelector<HTMLDivElement>("#game-root");
const gameStage = document.querySelector<HTMLDivElement>(".game-stage");

if (!gameRoot || !gameStage) {
  throw new Error("游戏挂载节点初始化失败。");
}

const simulation = new TownSimulation(new TownBackendClient());
createHud(gameStage, simulation);
void simulation.initialize();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: gameRoot,
  width: WORLD_CONFIG.width,
  height: WORLD_CONFIG.height,
  backgroundColor: "#081216",
  pixelArt: true,
  scene: [new BootScene(), new TownScene(simulation)],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WORLD_CONFIG.width,
    height: WORLD_CONFIG.height,
  },
});

window.addEventListener("beforeunload", () => {
  game.destroy(true);
});
