import Phaser from "phaser";
import "./styles.css";
import packageJson from "../package.json";
import { PacBeccaScene } from "./game/PacBeccaScene";
import { setupLeaderboard } from "./ui/leaderboard";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#15151f",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 640
  },
  render: {
    antialias: true,
    pixelArt: false
  },
  scene: [PacBeccaScene]
};

setupLeaderboard();
document.querySelector("#version-badge")!.textContent = `v${packageJson.version}`;

let game: Phaser.Game | null = null;
const startScreen = document.querySelector<HTMLElement>("#start-screen");
const startButton = document.querySelector<HTMLButtonElement>("#start-game");

function startGame(): void {
  if (game) {
    return;
  }

  game = new Phaser.Game(config);
  startScreen?.classList.add("is-hidden");
  startButton?.setAttribute("disabled", "true");
}

startButton?.addEventListener("click", startGame);

if (!startButton || !startScreen) {
  startGame();
}
