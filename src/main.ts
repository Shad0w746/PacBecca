import Phaser from "phaser";
import "./styles.css";
import { PacBeccaScene } from "./game/PacBeccaScene";

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

new Phaser.Game(config);
