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
const resetButton = document.querySelector<HTMLButtonElement>("#reset-game");
const leaderboardRestartButton = document.querySelector<HTMLButtonElement>("#leaderboard-restart");
const infoToggle = document.querySelector<HTMLButtonElement>("#info-toggle");
const leaderboardToggle = document.querySelector<HTMLButtonElement>("#leaderboard-toggle");
const pauseToggle = document.querySelector<HTMLButtonElement>("#pause-toggle");
const infoOverlay = document.querySelector<HTMLElement>("#info-overlay");
const infoClose = document.querySelector<HTMLButtonElement>("#info-close");
const leaderboardSection = document.querySelector<HTMLElement>("#leaderboard-section");
const leaderboardNameInput = document.querySelector<HTMLInputElement>("#leaderboard-name");
const restartPrompt = document.querySelector<HTMLElement>("#restart-prompt");
const root = document.documentElement;

setupLeaderboard();
const displayVersion = packageJson.version.replace(/\.0$/, "");
document.querySelector("#version-badge")!.textContent = `v${displayVersion}`;

let viewportRefreshFrame = 0;
let lastViewportSize = "";
let userPaused = false;

function refreshViewportSize(): void {
  viewportRefreshFrame = 0;
  const width = Math.max(window.innerWidth || root.clientWidth, 1);
  const height = Math.max(window.innerHeight || root.clientHeight, 1);
  const nextSize = `${width}x${height}`;

  if (nextSize === lastViewportSize) {
    return;
  }

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

function setPauseButtonState(): void {
  if (!pauseToggle) {
    return;
  }

  pauseToggle.textContent = userPaused ? "Resume" : "Pause";
  pauseToggle.setAttribute("aria-pressed", String(userPaused));
  pauseToggle.disabled = !game;
}

function syncGamePauseState(): void {
  if (!game) {
    setPauseButtonState();
    return;
  }

  const overlayOpen = Boolean(infoOverlay && !infoOverlay.hidden);
  if (userPaused || overlayOpen) {
    game.scene.pause("pacbecca");
  } else {
    game.scene.resume("pacbecca");
  }
  setPauseButtonState();
}

function setUserPaused(paused: boolean): void {
  userPaused = paused;
  syncGamePauseState();
}

function setInfoOverlay(
  open: boolean,
  options: {
    focus?: "close" | "leaderboardName" | "none";
    restoreFocus?: boolean;
    target?: "rules" | "leaderboard";
  } = {}
): void {
  if (!infoOverlay || !infoToggle) {
    return;
  }

  const restoreFocus = options.restoreFocus ?? true;

  infoOverlay.hidden = !open;
  infoToggle.setAttribute("aria-expanded", String(open));
  leaderboardToggle?.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("is-info-open", open);
  syncGamePauseState();

  if (open) {
    if (options.target === "leaderboard") {
      leaderboardSection?.scrollIntoView({ block: "start" });
    }
    if (
      options.focus === "leaderboardName" &&
      leaderboardNameInput &&
      !leaderboardNameInput.disabled
    ) {
      leaderboardNameInput.focus();
    } else if (options.focus !== "none") {
      infoClose?.focus();
    }
  } else if (restoreFocus) {
    if (isStartScreenActive()) {
      startButton?.focus();
    } else {
      (options.target === "leaderboard" ? leaderboardToggle : infoToggle)?.focus();
    }
  }
}

function isStartScreenActive(): boolean {
  return Boolean(
    startScreen &&
      !startScreen.classList.contains("is-hidden") &&
      startScreen.getAttribute("aria-hidden") !== "true"
  );
}

function isRestartPromptActive(): boolean {
  return Boolean(restartPrompt && !restartPrompt.hidden);
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.getAttribute("contenteditable") === "true" ||
    target.closest("[contenteditable='true']") !== null
  );
}

function isLeaderboardSubmitTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("#leaderboard-submit"));
}

function setRestartPromptVisible(visible: boolean): void {
  if (!restartPrompt) {
    return;
  }

  restartPrompt.hidden = !visible;
}

infoToggle?.addEventListener("click", () => setInfoOverlay(true, { target: "rules" }));
leaderboardToggle?.addEventListener("click", () =>
  setInfoOverlay(true, { target: "leaderboard" })
);
infoClose?.addEventListener("click", () => setInfoOverlay(false));
pauseToggle?.addEventListener("click", () => {
  if (!game) {
    startGame();
  }
  setUserPaused(!userPaused);
  pauseToggle.blur();
});
document.addEventListener(
  "click",
  (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest("#info-toggle")) {
      event.preventDefault();
      setInfoOverlay(true, { target: "rules" });
      return;
    }

    if (target.closest("#leaderboard-toggle")) {
      event.preventDefault();
      setInfoOverlay(true, { target: "leaderboard" });
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
    return;
  }

  if (
    event.key !== "Enter" ||
    event.repeat ||
    isTextEntryTarget(event.target) ||
    isLeaderboardSubmitTarget(event.target)
  ) {
    return;
  }

  if (isRestartPromptActive()) {
    event.preventDefault();
    event.stopPropagation();
    resetGameFromUi();
    return;
  }

  if (isStartScreenActive()) {
    event.preventDefault();
    event.stopPropagation();
    setInfoOverlay(false, { restoreFocus: false });
    startGame();
  }
});

window.addEventListener("pacbecca:final-score", () => {
  setRestartPromptVisible(true);
  setTimeout(
    () => setInfoOverlay(true, { focus: "leaderboardName", target: "leaderboard" }),
    0
  );
});

window.addEventListener("pacbecca:game-reset", () => {
  setRestartPromptVisible(false);
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
    setUserPaused(Boolean(data.paused));
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
  setPauseButtonState();
  scheduleViewportRefresh();
}

function resetGameFromUi(): void {
  if (!game) {
    setRestartPromptVisible(false);
    startGame();
    return;
  }

  setRestartPromptVisible(false);
  setInfoOverlay(false, { restoreFocus: false });
  userPaused = false;
  syncGamePauseState();
  window.dispatchEvent(new CustomEvent("pacbecca:reset-game"));
}

startButton?.addEventListener("click", startGame);

resetButton?.addEventListener("click", () => {
  resetGameFromUi();
  resetButton.blur();
});

leaderboardRestartButton?.addEventListener("click", () => {
  resetGameFromUi();
  leaderboardRestartButton.blur();
});

setPauseButtonState();

if (!startButton || !startScreen) {
  startGame();
}
