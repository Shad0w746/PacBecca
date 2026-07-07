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

let game: Phaser.Game | null = null;
const startScreen = document.querySelector<HTMLElement>("#start-screen");
const startButton = document.querySelector<HTMLButtonElement>("#start-game");
const infoToggle = document.querySelector<HTMLButtonElement>("#info-toggle");
const infoOverlay = document.querySelector<HTMLElement>("#info-overlay");
const infoClose = document.querySelector<HTMLButtonElement>("#info-close");
const root = document.documentElement;

setupLeaderboard();
document.querySelector("#version-badge")!.textContent = `v${packageJson.version}`;

let viewportRefreshFrame = 0;
let lastViewportSize = "";

function refreshViewportSize(): void {
  viewportRefreshFrame = 0;
  const width = Math.max(window.innerWidth || root.clientWidth, 1);
  const height = Math.max(window.innerHeight || root.clientHeight, 1);
  const nextSize = `${width}x${height}`;

  if (nextSize !== lastViewportSize) {
    lastViewportSize = nextSize;
    root.style.setProperty("--pacbecca-viewport-width", `${width}px`);
    root.style.setProperty("--pacbecca-viewport-height", `${height}px`);

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "pacbecca:resize",
          width,
          height
        },
        "*"
      );
    }
  }

  game?.scale.refresh();
}

function scheduleViewportRefresh(): void {
  if (viewportRefreshFrame) {
    return;
  }

  viewportRefreshFrame = window.requestAnimationFrame(refreshViewportSize);
}

window.addEventListener("resize", scheduleViewportRefresh);
window.addEventListener("orientationchange", scheduleViewportRefresh);

if ("ResizeObserver" in window) {
  const viewportObserver = new ResizeObserver(scheduleViewportRefresh);
  viewportObserver.observe(root);
}

scheduleViewportRefresh();

function setGamePaused(paused: boolean): void {
  if (!game) {
    return;
  }

  if (paused) {
    game.scene.pause("pacbecca");
  } else {
    game.scene.resume("pacbecca");
  }
}

function setInfoOverlay(open: boolean): void {
  if (!infoOverlay || !infoToggle) {
    return;
  }

  infoOverlay.hidden = !open;
  infoToggle.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("is-info-open", open);
  setGamePaused(open);

  if (open) {
    infoClose?.focus();
  } else {
    infoToggle.focus();
  }
}

infoToggle?.addEventListener("click", () => setInfoOverlay(true));
infoClose?.addEventListener("click", () => setInfoOverlay(false));
document.addEventListener(
  "click",
  (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest("#info-toggle")) {
      event.preventDefault();
      setInfoOverlay(true);
      return;
    }

    if (target.closest("#info-close")) {
      event.preventDefault();
      setInfoOverlay(false);
    }
  },
  true
);
infoOverlay?.addEventListener("click", (event) => {
  if (event.target === infoOverlay) {
    setInfoOverlay(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && infoOverlay && !infoOverlay.hidden) {
    setInfoOverlay(false);
  }
});

window.addEventListener("pacbecca:final-score", () => {
  setTimeout(() => setInfoOverlay(true), 0);
});

window.addEventListener("message", (event) => {
  const data = event.data;

  if (
    data &&
    typeof data === "object" &&
    "type" in data &&
    data.type === "pacbecca:set-paused" &&
    "paused" in data
  ) {
    setGamePaused(Boolean(data.paused));
  }
});

function startGame(): void {
  if (game) {
    return;
  }

  game = new Phaser.Game(config);
  startScreen?.classList.add("is-hidden");
  startScreen?.setAttribute("aria-hidden", "true");
  startButton?.setAttribute("disabled", "true");
  scheduleViewportRefresh();
}

startButton?.addEventListener("click", startGame);

if (!startButton || !startScreen) {
  startGame();
}
