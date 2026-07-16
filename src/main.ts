import type Phaser from "phaser";
import "./styles.css";
import packageJson from "../package.json";
import {
  PACBECCA_AUDIO_PAUSE_EVENT,
  PACBECCA_SOUND_CHANGE_EVENT,
  getSoundToggleLabel,
  primePacBeccaAudio,
  readStoredSoundEnabled,
  writeStoredSoundEnabled
} from "./game/sound";
import {
  PACBECCA_GAME_READY_EVENT,
  PACBECCA_LOADING_ERROR_EVENT,
  PACBECCA_LOADING_PROGRESS_EVENT,
  type PacBeccaLoadingErrorDetail,
  type PacBeccaLoadingProgressDetail
} from "./game/loadingEvents";
import { setupLeaderboard } from "./ui/leaderboard";

type PhaserRuntime = typeof Phaser;
type PhaserGame = Phaser.Game;
type PhaserGameConfig = Phaser.Types.Core.GameConfig;
type PacBeccaSceneConstructor = typeof import("./game/PacBeccaScene").PacBeccaScene;

const GAME_SCENE_KEY = "pacbecca";
const START_BUTTON_LABEL = "Start Game";
const START_BUTTON_LOADING_LABEL = "Loading...";
const START_READY_STATUS = "Ready when you are.";
const START_LOADING_CODE_STATUS = "Loading game code...";
const START_LOADING_ASSETS_STATUS = "Loading Becca and rage images...";
const START_READY_TO_PLAY_STATUS = "Ready to play.";
const START_LOAD_ERROR_STATUS = "The game could not load. Try again.";

let game: PhaserGame | null = null;
let gameLoadPromise: Promise<void> | null = null;
const startScreen = document.querySelector<HTMLElement>("#start-screen");
const startButton = document.querySelector<HTMLButtonElement>("#start-game");
const startStatus = document.querySelector<HTMLElement>("#start-status");
const startProgress = document.querySelector<HTMLElement>("#start-progress");
const startProgressBar = document.querySelector<HTMLElement>("#start-progress-bar");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-game");
const leaderboardRestartButton = document.querySelector<HTMLButtonElement>("#leaderboard-restart");
const infoToggle = document.querySelector<HTMLButtonElement>("#info-toggle");
const leaderboardToggle = document.querySelector<HTMLButtonElement>("#leaderboard-toggle");
const pauseToggle = document.querySelector<HTMLButtonElement>("#pause-toggle");
const soundToggle = document.querySelector<HTMLButtonElement>("#sound-toggle");
const infoOverlay = document.querySelector<HTMLElement>("#info-overlay");
const infoClose = document.querySelector<HTMLButtonElement>("#info-close");
const leaderboardSection = document.querySelector<HTMLElement>("#leaderboard-section");
const leaderboardNameInput = document.querySelector<HTMLInputElement>("#leaderboard-name");
const restartPrompt = document.querySelector<HTMLElement>("#restart-prompt");
const root = document.documentElement;

setupLeaderboard();
document.querySelector("#version-badge")!.textContent = `v${packageJson.version}`;

let viewportRefreshFrame = 0;
let lastViewportSize = "";
let userPaused = false;
let soundEnabled = readStoredSoundEnabled();

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

function setSoundButtonState(): void {
  if (!soundToggle) {
    return;
  }

  soundToggle.textContent = getSoundToggleLabel(soundEnabled);
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
}

function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  writeStoredSoundEnabled(enabled);
  setSoundButtonState();
  window.dispatchEvent(
    new CustomEvent(PACBECCA_SOUND_CHANGE_EVENT, {
      detail: {
        enabled
      }
    })
  );
}

function setStartLoadingState(loading: boolean, message: string, progress: number): void {
  startScreen?.classList.toggle("is-loading", loading);
  startButton?.toggleAttribute("disabled", loading);
  if (startButton) {
    startButton.textContent = loading ? START_BUTTON_LOADING_LABEL : START_BUTTON_LABEL;
  }

  updateStartLoadingProgress(message, progress);
}

function updateStartLoadingProgress(message: string, progress: number): void {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const percent = Math.round(clampedProgress * 100);

  if (startStatus) {
    startStatus.textContent = message;
  }
  startProgress?.setAttribute("aria-valuenow", String(percent));
  if (startProgressBar) {
    startProgressBar.style.transform = `scaleX(${clampedProgress})`;
  }
}

function revealLoadedGame(): void {
  startScreen?.classList.add("is-hidden");
  startScreen?.setAttribute("aria-hidden", "true");
  setPauseButtonState();
  syncGamePauseState();
  scheduleViewportRefresh();
}

function waitForGameReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      window.removeEventListener(PACBECCA_GAME_READY_EVENT, handleReady);
      window.removeEventListener(PACBECCA_LOADING_ERROR_EVENT, handleLoadingError);
    };

    const handleReady = (): void => {
      cleanup();
      resolve();
    };

    const handleLoadingError = (event: Event): void => {
      cleanup();
      const detail = (event as CustomEvent<PacBeccaLoadingErrorDetail>).detail;
      reject(new Error(detail?.message ?? START_LOAD_ERROR_STATUS));
    };

    window.addEventListener(PACBECCA_GAME_READY_EVENT, handleReady);
    window.addEventListener(PACBECCA_LOADING_ERROR_EVENT, handleLoadingError, { once: true });
  });
}

window.addEventListener(PACBECCA_LOADING_PROGRESS_EVENT, (event) => {
  const detail = (event as CustomEvent<PacBeccaLoadingProgressDetail>).detail;
  if (!detail) {
    return;
  }

  updateStartLoadingProgress(detail.message, detail.progress);
});

function syncGamePauseState(): void {
  if (!game) {
    setPauseButtonState();
    return;
  }

  const overlayOpen = Boolean(infoOverlay && !infoOverlay.hidden);
  if (userPaused || overlayOpen) {
    game.scene.pause(GAME_SCENE_KEY);
  } else {
    game.scene.resume(GAME_SCENE_KEY);
  }
  window.dispatchEvent(
    new CustomEvent(PACBECCA_AUDIO_PAUSE_EVENT, {
      detail: {
        paused: userPaused || overlayOpen
      }
    })
  );
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
    void startGame();
  }
  setUserPaused(!userPaused);
  pauseToggle.blur();
});
soundToggle?.addEventListener("click", () => {
  setSoundEnabled(!soundEnabled);
  soundToggle.blur();
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
    void startGame();
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

async function startGame(): Promise<void> {
  if (game) {
    return;
  }

  if (gameLoadPromise) {
    return gameLoadPromise;
  }

  primePacBeccaAudio(soundEnabled);
  gameLoadPromise = loadAndStartGame();
  return gameLoadPromise;
}

async function loadAndStartGame(): Promise<void> {
  setStartLoadingState(true, START_LOADING_CODE_STATUS, 0.04);

  try {
    const [{ default: Phaser }, { PacBeccaScene }] = await Promise.all([
      import("phaser") as Promise<{ default: PhaserRuntime }>,
      import("./game/PacBeccaScene")
    ]);

    updateStartLoadingProgress(START_LOADING_ASSETS_STATUS, 0.16);
    const gameReady = waitForGameReady();
    game = new Phaser.Game(createGameConfig(Phaser, PacBeccaScene));
    await gameReady;
    updateStartLoadingProgress(START_READY_TO_PLAY_STATUS, 1);
    revealLoadedGame();
  } catch (error) {
    game?.destroy(true);
    game = null;
    gameLoadPromise = null;
    setPauseButtonState();
    setStartLoadingState(false, START_LOAD_ERROR_STATUS, 0);
    throw error;
  }
}

function createGameConfig(
  Phaser: PhaserRuntime,
  PacBeccaScene: PacBeccaSceneConstructor
): PhaserGameConfig {
  return {
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
}

function resetGameFromUi(): void {
  if (!game) {
    setRestartPromptVisible(false);
    void startGame();
    return;
  }

  setRestartPromptVisible(false);
  setInfoOverlay(false, { restoreFocus: false });
  userPaused = false;
  syncGamePauseState();
  window.dispatchEvent(new CustomEvent("pacbecca:reset-game"));
}

startButton?.addEventListener("click", () => {
  void startGame().catch((error: unknown) => {
    console.error(error);
  });
});

resetButton?.addEventListener("click", () => {
  resetGameFromUi();
  resetButton.blur();
});

leaderboardRestartButton?.addEventListener("click", () => {
  resetGameFromUi();
  leaderboardRestartButton.blur();
});

setPauseButtonState();
setSoundButtonState();
updateStartLoadingProgress(START_READY_STATUS, 0);

if (!startButton || !startScreen) {
  void startGame();
}
