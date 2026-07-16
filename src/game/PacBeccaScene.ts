import Phaser from "phaser";
import {
  AVATAR_ASSET_PATH,
  AVATAR_FRAME_COUNT,
  AVATAR_FRAME_SIZE,
  AVATAR_SHEET_ASSET_PATH,
  BOARD_OFFSET,
  BRAZY_RAGE_SPLASH_DURATION_MS,
  BURST_METER_MAX,
  GAME_TITLE,
  GHOSTS,
  LEVELS,
  RAGE_SCREENSHOT_ASSET_PATHS,
  RAGE_SCREENSHOT_KEYS,
  WRONG_WAY_HYPNO_DURATION_MS
} from "./config";
import { isRearContact } from "./collision";
import { targetForGhost } from "./ghostAi";
import { hasCompletedGhostSweep } from "./ghostSweep";
import {
  keyOf,
  neighborInDirection,
  oppositeDirection,
  parseMaze,
  TILE_SIZE,
  toWorld,
  walkableDirections
} from "./maze";
import { chooseRandomTurn, chooseTurnTowardTarget } from "./pathfinding";
import {
  PACBECCA_AUDIO_PAUSE_EVENT,
  PACBECCA_SOUND_CHANGE_EVENT,
  PacBeccaAudio,
  readStoredSoundEnabled
} from "./sound";
import {
  dispatchGameReady,
  dispatchLoadingError,
  dispatchLoadingProgress
} from "./loadingEvents";
import {
  Direction,
  GhostConfig,
  GhostMood,
  GlobalGhostMode,
  GridPoint,
  LevelConfig,
  MazeModel,
  PACBECCA_LEVEL_CHANGED_EVENT,
  PACBECCA_SET_LEVEL_EVENT,
  PacBeccaSetLevelDetail,
  PickupKind
} from "./types";

interface MovingEntity {
  tile: GridPoint;
  fromTile: GridPoint;
  toTile: GridPoint;
  direction: Direction;
  progress: number;
  container: Phaser.GameObjects.Container;
}

interface PlayerEntity extends MovingEntity {
  sprite: Phaser.GameObjects.Sprite;
  ring: Phaser.GameObjects.Arc;
  shadow: Phaser.GameObjects.Ellipse;
  faceDetails: Phaser.GameObjects.Graphics;
  mouth: Phaser.GameObjects.Graphics;
  gloss: Phaser.GameObjects.Arc;
  chompTimeMs: number;
  lastFacing: Exclude<Direction, "none">;
  lastFrameIndex: number;
  faceDetailKey: string;
  mouthKey: string;
  hypnoRenderKey: string;
}

interface GhostFaceParts {
  body: Phaser.GameObjects.Arc;
  shine: Phaser.GameObjects.Arc;
  leftEye: Phaser.GameObjects.Arc;
  rightEye: Phaser.GameObjects.Arc;
  leftPupil: Phaser.GameObjects.Arc;
  rightPupil: Phaser.GameObjects.Arc;
  facingMarker: Phaser.GameObjects.Text;
  nameTagBack: Phaser.GameObjects.Rectangle;
  nameLabel: Phaser.GameObjects.Text;
}

interface GhostEntity extends MovingEntity {
  config: GhostConfig;
  mood: GhostMood;
  released: boolean;
  eatenUntilMs: number;
  face: GhostFaceParts;
  lastFacing: Exclude<Direction, "none">;
  renderFacing: Exclude<Direction, "none"> | "";
  renderStyleKey: string;
}

interface HudRenderCache {
  score: string;
  level: string;
  lives: string;
  mode: string;
  burst: string;
  ghostList: string;
  meterWidth: number;
}

const PLAYER_FRAME_SEQUENCE = [5, 2, 1, 0, 4, 3, 4, 0, 1, 2] as const;
const PLAYER_OPEN_BUCKETS = 8;
const HYPNO_COLOR_BUCKETS = 18;
const COLLISION_RADIUS_SQUARED = 16 * 16;

const PLAYER_LEAN_BY_DIRECTION: Record<Exclude<Direction, "none">, number> = {
  up: 0,
  down: 0,
  left: -8,
  right: 8
};

const DIRECTION_ANGLE_BY_DIRECTION: Record<Exclude<Direction, "none">, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2
};

const GHOST_FACING_VECTORS: Record<
  Exclude<Direction, "none">,
  { x: number; y: number; marker: string }
> = {
  up: { x: 0, y: -1, marker: "^" },
  down: { x: 0, y: 1, marker: "v" },
  left: { x: -1, y: 0, marker: "<" },
  right: { x: 1, y: 0, marker: ">" }
};

export class PacBeccaScene extends Phaser.Scene {
  private readonly ghostListText = GHOSTS.map(
    (ghost) => `${ghost.name}: ${ghost.personality}`
  ).join("\n");
  private levelIndex = 0;
  private score = 0;
  private lives = 3;
  private burstMeter = 0;
  private powerCansCollected = 0;
  private powerHitRagePending = false;
  private wrongWaySaveUsed = false;
  private hypnoRainbowUntilMs = 0;
  private secretHypnoUsedThisSession = false;
  private secretHypnoLevelIndex: number | null = null;
  private secretClickTimesMs: number[] = [];
  private ghostCombo = 0;
  private ghostEatsThisRound = 0;
  private eatenGhostIds = new Set<string>();
  private maze!: MazeModel;
  private level!: LevelConfig;
  private player!: PlayerEntity;
  private ghosts: GhostEntity[] = [];
  private pickups = new Map<string, Phaser.GameObjects.GameObject>();
  private desiredDirection: Direction = "none";
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private hud!: {
    title: Phaser.GameObjects.Text;
    score: Phaser.GameObjects.Text;
    level: Phaser.GameObjects.Text;
    lives: Phaser.GameObjects.Text;
    mode: Phaser.GameObjects.Text;
    burst: Phaser.GameObjects.Text;
    ghostList: Phaser.GameObjects.Text;
    message: Phaser.GameObjects.Text;
    meterBar: Phaser.GameObjects.Rectangle;
  };
  private hudCache: HudRenderCache = {
    score: "",
    level: "",
    lives: "",
    mode: "",
    burst: "",
    ghostList: "",
    meterWidth: -1
  };
  private wallLayer!: Phaser.GameObjects.Graphics;
  private floorLayer!: Phaser.GameObjects.Graphics;
  private globalMode: GlobalGhostMode = "scatter";
  private modeCursor = 0;
  private modeRemainingMs = 0;
  private frightenedUntilMs = 0;
  private pausedAfterHit = false;
  private rageOverlay?: Phaser.GameObjects.Container;
  private rageOverlayResumeEvent?: Phaser.Time.TimerEvent;
  private restartPrompt?: Phaser.GameObjects.Container;
  private lifeResetEvent?: Phaser.Time.TimerEvent;
  private levelAdvanceEvent?: Phaser.Time.TimerEvent;
  private ended = false;
  private readonly soundFx = new PacBeccaAudio();
  private readonly handleExternalReset = (): void => {
    this.restartGame();
  };
  private readonly handleDiagnosticLevelChange = (event: Event): void => {
    const level = (event as CustomEvent<PacBeccaSetLevelDetail>).detail?.level;
    if (!Number.isInteger(level)) {
      return;
    }

    const levelIndex = Phaser.Math.Clamp(level - 1, 0, LEVELS.length - 1);
    this.startDiagnosticLevel(levelIndex);
  };
  private readonly handleSoundPreferenceChange = (event: Event): void => {
    const enabled = (event as CustomEvent<{ enabled?: unknown }>).detail?.enabled;
    if (typeof enabled !== "boolean") {
      return;
    }

    this.soundFx.setEnabled(enabled);
    if (enabled) {
      this.soundFx.play("ui");
    }
  };
  private readonly handleAudioPauseChange = (event: Event): void => {
    const paused = (event as CustomEvent<{ paused?: unknown }>).detail?.paused;
    if (typeof paused === "boolean") {
      this.soundFx.setGameplayPaused(paused);
    }
  };

  constructor() {
    super("pacbecca");
  }

  preload(): void {
    dispatchLoadingProgress(0.16, "Loading Becca and rage images...");
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      dispatchLoadingProgress(0.16 + progress * 0.78, `Loading game assets... ${Math.round(progress * 100)}%`);
    });
    this.load.once(Phaser.Loader.Events.COMPLETE, (_loader: unknown, _totalComplete: number, totalFailed: number) => {
      if (totalFailed > 0) {
        dispatchLoadingError("Some game images could not load.");
        return;
      }

      dispatchLoadingProgress(0.96, "Preparing maze...");
    });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: { key?: unknown }) => {
      const key = typeof file.key === "string" ? file.key : "a game image";
      dispatchLoadingError(`Could not load ${key}.`);
    });

    this.load.image("becca-head", AVATAR_ASSET_PATH);
    this.load.spritesheet("becca-head-sheet", AVATAR_SHEET_ASSET_PATH, {
      frameWidth: AVATAR_FRAME_SIZE,
      frameHeight: AVATAR_FRAME_SIZE
    });
    RAGE_SCREENSHOT_ASSET_PATHS.forEach((path, index) => {
      this.load.image(RAGE_SCREENSHOT_KEYS[index], path);
    });
  }

  create(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,SPACE,ENTER", false) as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard!.removeCapture("UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,W,A,S,D,ENTER");

    this.soundFx.setEnabled(readStoredSoundEnabled());
    this.createHud();
    this.startLevel(0);
    dispatchLoadingProgress(1, "Ready to play.");
    dispatchGameReady();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handleSecretPlayerClick, this);
    window.addEventListener("pacbecca:reset-game", this.handleExternalReset);
    window.addEventListener(PACBECCA_SET_LEVEL_EVENT, this.handleDiagnosticLevelChange);
    window.addEventListener(PACBECCA_SOUND_CHANGE_EVENT, this.handleSoundPreferenceChange);
    window.addEventListener(PACBECCA_AUDIO_PAUSE_EVENT, this.handleAudioPauseChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("pacbecca:reset-game", this.handleExternalReset);
      window.removeEventListener(PACBECCA_SET_LEVEL_EVENT, this.handleDiagnosticLevelChange);
      window.removeEventListener(PACBECCA_SOUND_CHANGE_EVENT, this.handleSoundPreferenceChange);
      window.removeEventListener(PACBECCA_AUDIO_PAUSE_EVENT, this.handleAudioPauseChange);
      this.soundFx.dispose();
    });
  }

  update(_time: number, delta: number): void {
    if (this.ended) {
      if (!this.isTypingInTextField() && Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
        this.restartGame();
      }
      return;
    }

    if (this.pausedAfterHit) {
      return;
    }

    if (this.isTypingInTextField()) {
      this.desiredDirection = "none";
    } else {
      this.readControls();
    }
    this.updateMode(delta);
    this.updatePlayer(delta);
    if (this.levelAdvanceEvent || this.ended) {
      this.updateHud();
      return;
    }
    this.updateGhosts(delta);
    this.checkCollisions();
    this.checkGhostSweepWin();
    this.updateHud();
  }

  private createHud(): void {
    this.add
      .rectangle(0, 0, 960, 640, 0x101018)
      .setOrigin(0)
      .setDepth(-20);

    this.floorLayer = this.add.graphics();
    this.wallLayer = this.add.graphics();

    this.hud = {
      title: this.add.text(32, 18, GAME_TITLE, {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "30px",
        fontStyle: "700",
        color: "#f8fafc"
      }),
      score: this.add.text(660, 72, "", this.hudStyle(24)),
      level: this.add.text(660, 118, "", this.hudStyle(18)),
      lives: this.add.text(660, 154, "", this.hudStyle(18)),
      mode: this.add.text(660, 190, "", this.hudStyle(18)),
      burst: this.add.text(660, 250, "Becca Burst", this.hudStyle(17)),
      ghostList: this.add.text(660, 332, "", this.hudStyle(16)),
      message: this.add
        .text(660, 472, "", {
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "18px",
          color: "#f8fafc",
          wordWrap: { width: 250, useAdvancedWrap: true }
        })
        .setAlpha(0.9),
      meterBar: this.add.rectangle(660, 286, 0, 18, 0xf472b6).setOrigin(0, 0.5)
    };

    this.add
      .rectangle(660, 286, 220, 18)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xf8fafc, 0.35);

    this.add.text(660, 548, "Move: arrows/WASD\nBurst: Space\nRestart: Enter", {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
      color: "#cbd5e1",
      lineSpacing: 8
    });
  }

  private hudStyle(size: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: `${size}px`,
      color: "#f8fafc"
    };
  }

  private startLevel(levelIndex: number): void {
    this.soundFx.stopPowerMode();
    this.lifeResetEvent?.remove(false);
    this.lifeResetEvent = undefined;
    this.levelAdvanceEvent?.remove(false);
    this.levelAdvanceEvent = undefined;

    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    this.maze = parseMaze(this.level.rows);
    this.globalMode = "scatter";
    this.modeCursor = 0;
    this.modeRemainingMs = this.level.modeTimeline[0].durationMs;
    this.frightenedUntilMs = 0;
    this.hypnoRainbowUntilMs = 0;
    this.secretHypnoLevelIndex = null;
    this.secretClickTimesMs = [];
    this.ghostCombo = 0;
    this.ghostEatsThisRound = 0;
    this.eatenGhostIds.clear();
    this.desiredDirection = "none";
    this.pausedAfterHit = false;
    this.ended = false;

    this.clearLevelObjects();
    this.drawMaze();
    this.createPickups();
    this.player = this.createPlayer();
    this.ghosts = this.createGhosts();
    this.updateHud();
    this.hud.message.setText("Clear the maze. Space fires Becca Burst at full meter.");
    this.soundFx.startBackgroundMusic();
    this.soundFx.play(levelIndex === 0 ? "start" : "levelStart");
    window.dispatchEvent(
      new CustomEvent(PACBECCA_LEVEL_CHANGED_EVENT, {
        detail: {
          level: this.level.id
        }
      })
    );
  }

  private clearLevelObjects(): void {
    this.clearRageOverlay();
    this.clearRestartPrompt();
    this.pickups.forEach((pickup) => pickup.destroy());
    this.pickups.clear();
    this.ghosts.forEach((ghost) => ghost.container.destroy());
    if (this.player) {
      this.player.container.destroy();
    }
    this.wallLayer.clear();
    this.floorLayer.clear();
  }

  private drawMaze(): void {
    const { palette } = this.level;
    this.floorLayer.fillStyle(palette.floor, 1);
    this.floorLayer.fillRoundedRect(
      BOARD_OFFSET.x - 10,
      BOARD_OFFSET.y - 10,
      this.maze.width * TILE_SIZE + 20,
      this.maze.height * TILE_SIZE + 20,
      12
    );

    this.wallLayer.fillStyle(palette.wall, 1);
    this.wallLayer.lineStyle(2, palette.wallAccent, 0.55);

    for (let y = 0; y < this.maze.height; y += 1) {
      for (let x = 0; x < this.maze.width; x += 1) {
        if (!this.maze.walls.has(keyOf({ x, y }))) {
          continue;
        }
        const px = BOARD_OFFSET.x + x * TILE_SIZE;
        const py = BOARD_OFFSET.y + y * TILE_SIZE;
        this.wallLayer.fillRoundedRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2, 5);
        this.wallLayer.strokeRoundedRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6, 4);
      }
    }
  }

  private createPickups(): void {
    this.maze.pickups.forEach((kind, key) => {
      const [x, y] = key.split(",").map(Number);
      const world = toWorld({ x, y }, BOARD_OFFSET);
      let pickup: Phaser.GameObjects.GameObject;

      if (kind === "pellet") {
        pickup = this.add.circle(world.x, world.y, 3, this.level.palette.pellet, 0.9);
      } else if (kind === "power") {
        pickup = this.createPowerCan(world);
        this.tweens.add({
          targets: pickup,
          scale: 1.16,
          yoyo: true,
          repeat: -1,
          duration: 520,
          ease: "Sine.easeInOut"
        });
      } else {
        pickup = this.add.star(world.x, world.y, 5, 4, 9, this.level.palette.heart, 0.95);
        this.tweens.add({
          targets: pickup,
          angle: 360,
          repeat: -1,
          duration: 2400,
          ease: "Linear"
        });
      }

      this.pickups.set(key, pickup);
    });
  }

  private createPowerCan(world: GridPoint): Phaser.GameObjects.Container {
    const body = this.add.graphics();
    body.fillStyle(0xb7791f, 0.78);
    body.fillEllipse(0, 8, 17, 6);
    body.fillStyle(0xfacc15, 1);
    body.fillRoundedRect(-9, -8, 18, 16, 4);
    body.fillStyle(0xfff2a8, 1);
    body.fillEllipse(0, -8, 17, 5);
    body.fillStyle(0xd69e2e, 0.95);
    body.fillEllipse(0, 8, 17, 5);
    body.lineStyle(1, 0x8a5a06, 0.85);
    body.strokeEllipse(0, -8, 17, 5);
    body.strokeEllipse(0, 8, 17, 5);
    body.lineStyle(2, 0xfef08a, 0.92);
    body.lineBetween(-8, -6, -8, 6);
    body.lineBetween(8, -6, 8, 6);
    body.fillStyle(0xfef08a, 0.92);
    body.fillRoundedRect(-7, -4, 14, 9, 3);
    body.lineStyle(1, 0x1d4ed8, 0.9);
    body.strokeRoundedRect(-7, -4, 14, 9, 3);
    body.lineStyle(1, 0x7c4a03, 0.8);
    body.strokeRoundedRect(-9, -8, 18, 16, 4);

    const label = this.add
      .text(0, 0, "BB", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "6px",
        fontStyle: "900",
        color: "#1d4ed8"
      })
      .setOrigin(0.5);

    const tab = this.add.rectangle(0, -11, 7, 2, 0xe2e8f0, 0.9);
    const shine = this.add.rectangle(-4, -5, 5, 2, 0xffffff, 0.45);
    return this.add.container(world.x, world.y, [body, tab, shine, label]);
  }

  private createPlayer(): PlayerEntity {
    const start = this.maze.playerStart;
    const world = toWorld(start, BOARD_OFFSET);
    const shadow = this.add.ellipse(2, 9, 30, 11, 0x050712, 0.42);
    const ring = this.add.circle(0, 0, 17, 0xffffff, 0).setStrokeStyle(3, 0xf9a8d4, 0.95);
    const sprite = this.add.sprite(0, -2, "becca-head-sheet", 5).setDisplaySize(34, 34);
    const faceDetails = this.add.graphics();
    const gloss = this.add.circle(-6, -9, 5, 0xffffff, 0.2).setScale(1.55, 0.7);
    const mouth = this.add.graphics();
    const container = this.add.container(world.x, world.y, [
      shadow,
      ring,
      sprite,
      faceDetails,
      gloss,
      mouth
    ]);
    container.setDepth(20);
    return {
      tile: start,
      fromTile: start,
      toTile: start,
      direction: "none",
      progress: 1,
      container,
      sprite,
      ring,
      shadow,
      faceDetails,
      mouth,
      gloss,
      chompTimeMs: 0,
      lastFacing: "right",
      lastFrameIndex: 5,
      faceDetailKey: "",
      mouthKey: "",
      hypnoRenderKey: ""
    };
  }

  private createGhosts(): GhostEntity[] {
    return GHOSTS.map((config) => {
      const start = this.maze.ghostStarts[config.id];
      const world = toWorld(start, BOARD_OFFSET);
      const body = this.add.circle(0, 0, 13, config.color, 1);
      const shine = this.add.circle(-4, -5, 4, config.accent, 0.9);
      const leftEye = this.add.circle(-4, -1, 4, 0xf8fafc, 0.95);
      const rightEye = this.add.circle(5, -1, 4, 0xf8fafc, 0.95);
      const leftPupil = this.add.circle(-5.5, -1, 1.7, 0x111827, 1);
      const rightPupil = this.add.circle(3.5, -1, 1.7, 0x111827, 1);
      const facingMarker = this.add
        .text(-9, 0, "<", {
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "17px",
          fontStyle: "900",
          color: "#ffffff",
          stroke: "#111827",
          strokeThickness: 4
        })
        .setOrigin(0.5);
      const nameTagBack = this.add
        .rectangle(0, 21, Math.max(42, config.name.length * 7 + 10), 14, 0x050712, 0.78)
        .setStrokeStyle(1, config.accent, 0.88);
      const nameLabel = this.add
        .text(0, 21, config.name, {
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "9px",
          fontStyle: "900",
          color: "#f8fafc",
          align: "center",
          stroke: "#111827",
          strokeThickness: 2
        })
        .setOrigin(0.5);
      const container = this.add.container(world.x, world.y, [
        body,
        shine,
        leftEye,
        rightEye,
        leftPupil,
        rightPupil,
        facingMarker,
        nameTagBack,
        nameLabel
      ]);
      container.setDepth(15);
      return {
        config,
        mood: "normal",
        released: false,
        eatenUntilMs: 0,
        face: {
          body,
          shine,
          leftEye,
          rightEye,
          leftPupil,
          rightPupil,
          facingMarker,
          nameTagBack,
          nameLabel
        },
        lastFacing: "left",
        renderFacing: "",
        renderStyleKey: "",
        tile: start,
        fromTile: start,
        toTile: start,
        direction: "left",
        progress: 1,
        container
      };
    });
  }

  private readControls(): void {
    if (this.cursors.left.isDown || this.keys.A.isDown) {
      this.desiredDirection = "left";
    } else if (this.cursors.right.isDown || this.keys.D.isDown) {
      this.desiredDirection = "right";
    } else if (this.cursors.up.isDown || this.keys.W.isDown) {
      this.desiredDirection = "up";
    } else if (this.cursors.down.isDown || this.keys.S.isDown) {
      this.desiredDirection = "down";
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE) &&
      this.burstMeter >= BURST_METER_MAX
    ) {
      this.triggerBurst();
    }
  }

  private isTypingInTextField(): boolean {
    const activeElement = document.activeElement;

    return (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLSelectElement ||
      activeElement?.getAttribute("contenteditable") === "true"
    );
  }

  private updateMode(delta: number): void {
    if (this.frightenedUntilMs > this.time.now && this.frightenedUntilMs - delta <= this.time.now) {
      this.ghostCombo = 0;
    }

    if (this.time.now < this.frightenedUntilMs) {
      return;
    }

    this.modeRemainingMs -= delta;
    if (this.modeRemainingMs > 0) {
      return;
    }

    this.modeCursor = Math.min(
      this.modeCursor + 1,
      this.level.modeTimeline.length - 1
    );
    const next = this.level.modeTimeline[this.modeCursor];
    if (next.mode !== this.globalMode) {
      this.globalMode = next.mode;
      this.reverseGhosts();
    }
    this.modeRemainingMs = next.durationMs;
  }

  private updatePlayer(delta: number): void {
    this.advanceEntity(
      this.player,
      this.level.playerTilesPerSecond,
      delta,
      () => this.choosePlayerDirection()
    );
    this.consumePickup();
    this.updatePlayerAppearance(delta);
  }

  private choosePlayerDirection(): Direction {
    if (this.canMove(this.player.tile, this.desiredDirection)) {
      return this.desiredDirection;
    }
    if (this.canMove(this.player.tile, this.player.direction)) {
      return this.player.direction;
    }
    return "none";
  }

  private updateGhosts(delta: number): void {
    this.ghosts.forEach((ghost) => {
      if (!ghost.released && this.time.now >= ghost.config.releaseDelayMs) {
        ghost.released = true;
      }

      if (!ghost.released) {
        return;
      }

      const speed = this.speedForGhost(ghost);
      this.advanceEntity(ghost, speed, delta, () => this.chooseGhostDirection(ghost));
      this.updateGhostAppearance(ghost);
    });
  }

  private speedForGhost(ghost: GhostEntity): number {
    if (ghost.mood === "eaten") {
      return this.level.ghostTilesPerSecond + 2.2;
    }
    if (this.isGhostVulnerable(ghost)) {
      return this.level.frightenedTilesPerSecond;
    }
    return this.level.ghostTilesPerSecond;
  }

  private chooseGhostDirection(ghost: GhostEntity): Direction {
    if (ghost.mood === "eaten") {
      if (ghost.tile.x === this.maze.ghostStarts[ghost.config.id].x && ghost.tile.y === this.maze.ghostStarts[ghost.config.id].y) {
        ghost.mood = "normal";
      }
      return chooseTurnTowardTarget(
        this.maze,
        ghost.tile,
        ghost.direction,
        this.maze.ghostStarts[ghost.config.id],
        true
      );
    }

    if (this.isGhostVulnerable(ghost)) {
      return chooseRandomTurn(
        this.maze,
        ghost.tile,
        ghost.direction,
        () => Phaser.Math.FloatBetween(0, 0.999)
      );
    }

    const leadHunterTile = this.ghosts[0]?.tile ?? ghost.tile;
    const target =
      this.globalMode === "scatter"
        ? ghost.config.scatterTarget
        : targetForGhost(ghost.config, ghost.tile, {
            playerTile: this.player.tile,
            playerDirection: this.player.direction,
            leadHunterTile,
            boardCenter: {
              x: Math.floor(this.maze.width / 2),
              y: Math.floor(this.maze.height / 2)
            }
          });

    return chooseTurnTowardTarget(this.maze, ghost.tile, ghost.direction, target);
  }

  private advanceEntity(
    entity: MovingEntity,
    tilesPerSecond: number,
    delta: number,
    chooseDirection: () => Direction
  ): void {
    if (entity.progress >= 1) {
      entity.tile = entity.toTile;
      entity.fromTile = entity.tile;
      entity.direction = chooseDirection();

      if (entity.direction === "none") {
        entity.progress = 1;
        this.placeEntity(entity, entity.tile);
        return;
      }

      entity.toTile = neighborInDirection(entity.tile, entity.direction);
      entity.progress = 0;
    }

    entity.progress = Math.min(1, entity.progress + (tilesPerSecond * delta) / 1000);
    const fromX = BOARD_OFFSET.x + entity.fromTile.x * TILE_SIZE;
    const fromY = BOARD_OFFSET.y + entity.fromTile.y * TILE_SIZE;
    const toX = BOARD_OFFSET.x + entity.toTile.x * TILE_SIZE;
    const toY = BOARD_OFFSET.y + entity.toTile.y * TILE_SIZE;
    const x = Phaser.Math.Linear(fromX, toX, entity.progress);
    const y = Phaser.Math.Linear(fromY, toY, entity.progress);
    entity.container.setPosition(x, y);
  }

  private placeEntity(entity: MovingEntity, tile: GridPoint): void {
    entity.container.setPosition(
      BOARD_OFFSET.x + tile.x * TILE_SIZE,
      BOARD_OFFSET.y + tile.y * TILE_SIZE
    );
  }

  private canMove(tile: GridPoint, direction: Direction): boolean {
    return (
      direction !== "none" &&
      walkableDirections(this.maze, tile).includes(direction as Exclude<Direction, "none">)
    );
  }

  private updatePlayerAppearance(delta: number): void {
    const moving = this.player.direction !== "none";
    if (moving) {
      this.player.lastFacing = this.player.direction as Exclude<Direction, "none">;
      this.player.chompTimeMs += delta;
    } else {
      this.player.chompTimeMs = Math.max(0, this.player.chompTimeMs - delta * 0.5);
    }

    const frameIndex = moving
      ? PLAYER_FRAME_SEQUENCE[
          Math.floor(this.player.chompTimeMs / 95) % PLAYER_FRAME_SEQUENCE.length
        ] % AVATAR_FRAME_COUNT
      : 5;
    if (frameIndex !== this.player.lastFrameIndex) {
      this.player.lastFrameIndex = frameIndex;
      this.player.sprite.setFrame(frameIndex);
    }

    const phase = (this.player.chompTimeMs % 300) / 300;
    const openAmount = moving ? Math.sin(phase * Math.PI) : 0;
    const openBucket = moving ? Math.round(openAmount * PLAYER_OPEN_BUCKETS) : 0;
    const renderOpenAmount = openBucket / PLAYER_OPEN_BUCKETS;
    const bob = moving ? Math.sin(this.player.chompTimeMs / 72) * 1.2 : 0;
    const lean = PLAYER_LEAN_BY_DIRECTION[this.player.lastFacing];

    this.player.sprite.setPosition(0, -2 + bob);
    this.player.sprite.setAngle(lean);
    this.player.gloss.setPosition(-6, -10 + bob * 0.45);
    this.player.ring.setScale(1 + openAmount * 0.035, 1 - openAmount * 0.02);
    this.player.shadow.setScale(1 + openAmount * 0.18, 0.92 - openAmount * 0.04);
    this.player.shadow.setAlpha(0.34 + openAmount * 0.16);
    this.drawPlayerFaceDetails(bob, lean, renderOpenAmount, openBucket);
    this.updateHypnoRainbowAppearance();
    this.drawPlayerMouth(renderOpenAmount, bob, lean, openBucket);
  }

  private updateHypnoRainbowAppearance(): void {
    if (!this.isHypnoRainbowActive()) {
      if (this.player.hypnoRenderKey !== "normal") {
        this.player.hypnoRenderKey = "normal";
        this.player.sprite.clearTint();
        this.player.ring.setStrokeStyle(3, 0xf9a8d4, 0.95);
        this.player.gloss.setFillStyle(0xffffff, 0.2);
        this.player.container.setScale(1);
      }
      return;
    }

    const phase = ((this.time.now % 650) / 650);
    const colorBucket = Math.floor(phase * HYPNO_COLOR_BUCKETS);
    const renderKey = `hypno:${colorBucket}`;
    if (renderKey !== this.player.hypnoRenderKey) {
      this.player.hypnoRenderKey = renderKey;
      const bucketPhase = colorBucket / HYPNO_COLOR_BUCKETS;
      const tint = Phaser.Display.Color.HSVToRGB(bucketPhase, 0.9, 1).color;
      const accent = Phaser.Display.Color.HSVToRGB((bucketPhase + 0.33) % 1, 0.85, 1).color;
      this.player.sprite.setTint(tint);
      this.player.ring.setStrokeStyle(5, accent, 1);
      this.player.gloss.setFillStyle(0xffffff, 0.45);
    }
    this.player.container.setScale(1.08 + Math.sin(this.time.now / 60) * 0.05);
  }

  private drawPlayerFaceDetails(
    bob: number,
    lean: number,
    openAmount: number,
    openBucket: number
  ): void {
    const details = this.player.faceDetails;
    details.setPosition(0, -2 + bob);
    details.setAngle(lean);
    const renderKey = `${lean}:${openBucket}`;
    if (renderKey === this.player.faceDetailKey) {
      return;
    }

    this.player.faceDetailKey = renderKey;
    details.clear();

    details.lineStyle(1.2, 0xffffff, 0.24);
    details.beginPath();
    details.arc(0, 0, 14.4, Math.PI * 1.1, Math.PI * 1.82, false);
    details.strokePath();

    details.lineStyle(1.6, 0xfef3c7, 0.32);
    details.lineBetween(-9, -12, -11, 7);
    details.lineBetween(8, -12, 11, 7);

    details.fillStyle(0xfb7185, 0.2 + openAmount * 0.08);
    details.fillEllipse(-7, 4, 5.4, 3.3);
    details.fillEllipse(7, 4, 5.4, 3.3);

    details.lineStyle(1, 0xffffff, 0.22);
    details.lineBetween(0, -4, -1.3, 2);
    details.lineBetween(-1.3, 2, 1.2, 2.8);
  }

  private drawPlayerMouth(
    openAmount: number,
    bob: number,
    lean: number,
    openBucket: number
  ): void {
    const mouth = this.player.mouth;
    mouth.setPosition(0, bob);
    mouth.setAngle(lean * 0.35);
    const renderKey = `${this.player.lastFacing}:${openBucket}`;
    if (renderKey === this.player.mouthKey) {
      return;
    }

    this.player.mouthKey = renderKey;
    mouth.clear();

    if (openAmount <= 0.06) {
      this.drawClosedPlayerMouth();
      return;
    }

    const directionAngle = DIRECTION_ANGLE_BY_DIRECTION[this.player.lastFacing];
    const center = { x: 0, y: -2 };
    const radius = 20;
    const halfAngle = 0.16 + openAmount * 0.76;
    const upperAngle = directionAngle - halfAngle;
    const lowerAngle = directionAngle + halfAngle;
    const front = { x: Math.cos(directionAngle), y: Math.sin(directionAngle) };
    const tongue = {
      x: center.x + front.x * (7.5 + openAmount * 3),
      y: center.y + front.y * (7.5 + openAmount * 3)
    };

    mouth.fillStyle(0x070711, 0.97);
    mouth.beginPath();
    mouth.moveTo(center.x, center.y);
    mouth.arc(
      center.x,
      center.y,
      radius,
      upperAngle,
      lowerAngle,
      false
    );
    mouth.closePath();
    mouth.fillPath();

    mouth.fillStyle(0xfb7185, 0.84);
    mouth.fillEllipse(tongue.x, tongue.y + 1.2, 7 + openAmount * 4, 3 + openAmount * 2.6);

    mouth.fillStyle(0xf8fafc, 0.98);
    this.drawPlayerTooth(upperAngle, 12.6, 2.4 + openAmount * 1.4);
    this.drawPlayerTooth(lowerAngle, 12.6, 2.4 + openAmount * 1.4);

    mouth.lineStyle(3, 0xf472b6, 0.9);
    mouth.beginPath();
    mouth.moveTo(center.x, center.y);
    mouth.arc(
      center.x,
      center.y,
      radius,
      upperAngle,
      lowerAngle,
      false
    );
    mouth.closePath();
    mouth.strokePath();

    mouth.lineStyle(1.2, 0xffffff, 0.58);
    mouth.lineBetween(
      center.x + front.x * 5,
      center.y + front.y * 5 - 1,
      center.x + front.x * 13,
      center.y + front.y * 13 - 1
    );
  }

  private drawClosedPlayerMouth(): void {
    const directionAngle = DIRECTION_ANGLE_BY_DIRECTION[this.player.lastFacing];
    const center = { x: 0, y: -2 };
    const front = { x: Math.cos(directionAngle), y: Math.sin(directionAngle) };
    const side = { x: -front.y, y: front.x };
    const lipCenter = {
      x: center.x + front.x * 8,
      y: center.y + front.y * 8
    };
    const lipHalf = 3.8;

    this.player.mouth.lineStyle(2, 0xf472b6, 0.75);
    this.player.mouth.lineBetween(
      lipCenter.x - side.x * lipHalf,
      lipCenter.y - side.y * lipHalf,
      lipCenter.x + side.x * lipHalf,
      lipCenter.y + side.y * lipHalf
    );
    this.player.mouth.fillStyle(0xffffff, 0.46);
    this.player.mouth.fillEllipse(
      lipCenter.x + front.x * 1.5,
      lipCenter.y + front.y * 1.5 - 0.6,
      3.4,
      1.5
    );
  }

  private drawPlayerTooth(edgeAngle: number, distance: number, length: number): void {
    const center = { x: 0, y: -2 };
    const edge = { x: Math.cos(edgeAngle), y: Math.sin(edgeAngle) };
    const side = { x: -edge.y, y: edge.x };
    const base = {
      x: center.x + edge.x * distance,
      y: center.y + edge.y * distance
    };
    const width = 1.8;
    const tip = {
      x: base.x - edge.x * length,
      y: base.y - edge.y * length
    };

    this.player.mouth.fillTriangle(
      base.x - side.x * width,
      base.y - side.y * width,
      base.x + side.x * width,
      base.y + side.y * width,
      tip.x,
      tip.y
    );
  }

  private consumePickup(): void {
    const key = keyOf(this.player.tile);
    const pickup = this.maze.pickups.get(key);
    if (!pickup) {
      return;
    }

    this.maze.pickups.delete(key);
    this.pickups.get(key)?.destroy();
    this.pickups.delete(key);

    if (pickup === "pellet") {
      this.score += 10;
      this.addBurst(1);
      this.soundFx.play("pellet");
    } else if (pickup === "power") {
      this.score += 50;
      this.addBurst(18);
      this.powerCansCollected += 1;
      this.soundFx.play("power");
      // Arm the rage flash here; display it only after the next ghost contact.
      if (this.powerCansCollected === 1) {
        this.powerHitRagePending = true;
      }
      this.showPowerPickupBurst();
      this.frightenGhosts(this.level.frightenedDurationMs);
    } else {
      this.score += 125;
      this.addBurst(28);
      this.soundFx.play("heart");
    }

    if (this.maze.pickups.size === 0) {
      this.advanceLevel();
    }
  }

  private frightenGhosts(durationMs: number): void {
    this.frightenedUntilMs = Math.max(this.frightenedUntilMs, this.time.now + durationMs);
    this.ghostCombo = 0;
    this.reverseGhosts();
    this.soundFx.startPowerMode(durationMs);
  }

  private showPowerPickupBurst(): void {
    const colors = [
      0xfef08a,
      0x38bdf8,
      0xf472b6,
      0x34d399,
      0xfb7185,
      0xa78bfa
    ];
    const burst = this.add
      .container(this.player.container.x, this.player.container.y)
      .setDepth(1200);
    const ring = this.add
      .circle(0, 0, 16, 0xffffff, 0)
      .setStrokeStyle(4, 0xfef08a, 0.9);

    burst.add(ring);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 3.1,
      duration: 540,
      ease: "Sine.easeOut"
    });

    Array.from({ length: 24 }, (_value, index) => {
      const angle = (Math.PI * 2 * index) / 24 + Phaser.Math.FloatBetween(-0.12, 0.12);
      const distance = Phaser.Math.Between(26, 58);
      const color = colors[index % colors.length];
      const spark =
        index % 4 === 0
          ? this.add.star(0, 0, 5, 2, Phaser.Math.Between(5, 8), color, 1)
          : this.add.circle(0, 0, Phaser.Math.Between(2, 4), color, 1);

      spark.setBlendMode(Phaser.BlendModes.ADD);
      burst.add(spark);
      this.tweens.add({
        targets: spark,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(460, 720),
        ease: "Cubic.easeOut"
      });
    });

    this.time.delayedCall(760, () => burst.destroy(true));
  }

  private triggerBurst(): void {
    this.burstMeter = 0;
    this.frightenGhosts(this.level.burstDurationMs);
    this.soundFx.play("burst");
    this.cameras.main.flash(160, 244, 114, 182);
    this.hud.message.setText("Becca Burst!");
  }

  private addBurst(amount: number): void {
    this.burstMeter = Math.min(BURST_METER_MAX, this.burstMeter + amount);
  }

  private reverseGhosts(): void {
    this.ghosts.forEach((ghost) => {
      if (ghost.progress < 1 || ghost.direction === "none") {
        return;
      }
      const reverse = oppositeDirection(ghost.direction);
      if (this.canMove(ghost.tile, reverse)) {
        ghost.direction = reverse;
      }
    });
  }

  private handleSecretPlayerClick(pointer: Phaser.Input.Pointer): void {
    if (!this.player || this.secretHypnoUsedThisSession || this.ended) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      pointer.x,
      pointer.y,
      this.player.container.x,
      this.player.container.y
    );
    if (distance > 28) {
      this.secretClickTimesMs = [];
      return;
    }

    const now = this.time.now;
    this.secretClickTimesMs = [...this.secretClickTimesMs, now].filter(
      (time) => now - time <= 1000
    );

    if (this.secretClickTimesMs.length >= 3) {
      this.triggerSecretRoundHypno();
    }
  }

  private triggerSecretRoundHypno(): void {
    this.secretHypnoUsedThisSession = true;
    this.secretHypnoLevelIndex = this.levelIndex;
    this.secretClickTimesMs = [];
    this.ghostCombo = 0;
    this.reverseGhosts();
    this.soundFx.startRageMode(WRONG_WAY_HYPNO_DURATION_MS);
    this.cameras.main.flash(260, 255, 0, 230);
    this.cameras.main.shake(220, 0.004);
    this.hud.message.setText("PacBecca is mad. Hypno mode for this round!");
  }

  private isHypnoRainbowActive(): boolean {
    return (
      this.time.now < this.hypnoRainbowUntilMs ||
      this.secretHypnoLevelIndex === this.levelIndex
    );
  }

  private isGhostVulnerable(ghost: GhostEntity): boolean {
    return (
      this.time.now < this.frightenedUntilMs ||
      this.isHypnoRainbowActive() ||
      ghost.mood === "stunned"
    );
  }

  private canTriggerWrongWaySave(): boolean {
    return this.powerCansCollected > 0 && !this.wrongWaySaveUsed;
  }

  private triggerHypnoRainbow(): void {
    this.wrongWaySaveUsed = true;
    this.hypnoRainbowUntilMs = this.time.now + WRONG_WAY_HYPNO_DURATION_MS;
    this.ghostCombo = 0;
    this.reverseGhosts();
    this.soundFx.startRageMode(WRONG_WAY_HYPNO_DURATION_MS);
    this.cameras.main.flash(180, 255, 0, 210);
    this.cameras.main.shake(160, 0.004);
    this.hud.message.setText("BECCA RAGE!!!");
    this.showBrazyRageSplash();
  }

  private flashPendingPowerHitRage(): void {
    if (!this.powerHitRagePending) {
      return;
    }

    this.powerHitRagePending = false;
    this.soundFx.play("rage");
    this.cameras.main.flash(180, 255, 236, 59);
    this.showBeccaRageTextFlash();
  }

  private showBeccaRageTextFlash(): void {
    const text = this.add
      .text(480, 118, "BECCA RAGE!!!", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "66px",
        fontStyle: "900",
        color: "#fff200",
        stroke: "#111827",
        strokeThickness: 12
      })
      .setOrigin(0.5)
      .setDepth(4900)
      .setAlpha(0)
      .setScale(0.84)
      .setShadow(0, 6, "#f472b6", 9, true, true);

    this.tweens.add({
      targets: text,
      alpha: 1,
      scale: 1.08,
      duration: 130,
      ease: "Back.easeOut",
      yoyo: true,
      hold: 360,
      onComplete: () => text.destroy()
    });
  }

  private showBrazyRageSplash(): void {
    this.clearRageOverlay();
    const wasPaused = this.pausedAfterHit;
    this.pausedAfterHit = true;

    const screenshotKey =
      RAGE_SCREENSHOT_KEYS[Phaser.Math.Between(0, RAGE_SCREENSHOT_KEYS.length - 1)];
    const backdrop = this.add.rectangle(480, 320, 960, 640, 0x050510, 0.76);
    const burst = this.add.star(480, 320, 18, 82, 330, 0xfff200, 0.28);
    const screenshot = this.add.image(480, 342, screenshotKey);
    const imageScale = Math.min(680 / screenshot.width, 430 / screenshot.height);
    screenshot.setScale(imageScale);
    screenshot.setAngle(Phaser.Math.Between(-3, 3));

    const frame = this.add
      .rectangle(
        screenshot.x,
        screenshot.y,
        screenshot.displayWidth + 18,
        screenshot.displayHeight + 18,
        0xffffff,
        0
      )
      .setStrokeStyle(5, 0xfacc15, 0.92);

    const title = this.add
      .text(480, 106, "BECCA RAGE!!!", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "66px",
        fontStyle: "900",
        color: "#fff200",
        stroke: "#111827",
        strokeThickness: 10
      })
      .setOrigin(0.5)
      .setShadow(0, 5, "#f472b6", 8, true, true);

    const subtitle = this.add
      .text(480, 578, "Hypno mode starts after the splash.", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "20px",
        fontStyle: "800",
        color: "#dbeafe",
        stroke: "#111827",
        strokeThickness: 4
      })
      .setOrigin(0.5);

    this.rageOverlay = this.add
      .container(0, 0, [backdrop, burst, screenshot, frame, title, subtitle])
      .setDepth(5000)
      .setAlpha(0);

    this.tweens.add({
      targets: this.rageOverlay,
      alpha: 1,
      duration: 120,
      ease: "Quad.easeOut"
    });
    this.tweens.add({
      targets: [screenshot, frame],
      alpha: 0,
      delay: 720,
      duration: 1900,
      ease: "Sine.easeInOut"
    });
    this.tweens.add({
      targets: burst,
      angle: 90,
      alpha: 0,
      scale: 1.1,
      duration: BRAZY_RAGE_SPLASH_DURATION_MS,
      ease: "Sine.easeOut"
    });
    this.tweens.add({
      targets: title,
      scale: 1.08,
      y: 92,
      yoyo: true,
      repeat: 1,
      duration: 260,
      ease: "Back.easeOut"
    });
    this.tweens.add({
      targets: [title, subtitle, backdrop],
      alpha: 0,
      delay: 2250,
      duration: 650,
      ease: "Sine.easeIn"
    });

    this.rageOverlayResumeEvent = this.time.delayedCall(BRAZY_RAGE_SPLASH_DURATION_MS, () => {
      this.clearRageOverlay();
      if (!this.ended) {
        this.pausedAfterHit = wasPaused;
        this.hypnoRainbowUntilMs = Math.max(
          this.hypnoRainbowUntilMs,
          this.time.now + WRONG_WAY_HYPNO_DURATION_MS
        );
        this.hud.message.setText("Wrong hit saved. Hypno rainbow for 5 seconds!");
      }
    });
  }

  private clearRageOverlay(): void {
    this.rageOverlayResumeEvent?.remove(false);
    this.rageOverlayResumeEvent = undefined;

    if (!this.rageOverlay) {
      return;
    }

    this.tweens.killTweensOf(this.rageOverlay.getAll());
    this.tweens.killTweensOf(this.rageOverlay);
    this.rageOverlay.destroy(true);
    this.rageOverlay = undefined;
  }

  private checkCollisions(): void {
    const playerCenter = {
      x: this.player.container.x,
      y: this.player.container.y
    };
    this.ghosts.forEach((ghost) => {
      if (ghost.mood === "eaten") {
        return;
      }

      const ghostCenter = {
        x: ghost.container.x,
        y: ghost.container.y
      };
      const dx = playerCenter.x - ghostCenter.x;
      const dy = playerCenter.y - ghostCenter.y;
      if (dx * dx + dy * dy > COLLISION_RADIUS_SQUARED) {
        return;
      }

      if (this.isGhostVulnerable(ghost)) {
        this.flashPendingPowerHitRage();
        this.eatGhost(ghost);
        return;
      }

      if (this.isRearGhostContact(playerCenter, ghostCenter, ghost)) {
        this.flashPendingPowerHitRage();
        this.eatGhost(ghost, "rear");
        return;
      }

      if (this.canTriggerWrongWaySave()) {
        this.powerHitRagePending = false;
        this.triggerHypnoRainbow();
        this.eatGhost(ghost);
        return;
      }

      this.loseLife();
    });
  }

  private isRearGhostContact(
    playerCenter: GridPoint,
    ghostCenter: GridPoint,
    ghost: GhostEntity
  ): boolean {
    return isRearContact({
      attacker: playerCenter,
      target: ghostCenter,
      targetFacing: ghost.lastFacing
    });
  }

  private eatGhost(ghost: GhostEntity, hitType: "normal" | "rear" = "normal"): void {
    this.ghostCombo += 1;
    this.score += 200 * this.ghostCombo;
    ghost.mood = "eaten";
    ghost.direction = "none";
    ghost.progress = 1;
    this.ghostEatsThisRound += 1;
    this.eatenGhostIds.add(ghost.config.id);
    this.soundFx.play(hitType === "rear" ? "rearGhost" : "ghost");
    const eatenCount = Math.min(this.eatenGhostIds.size, this.ghosts.length);
    this.hud.message.setText(
      hitType === "rear"
        ? `${ghost.config.name} got rear-chomped. Unique sweep ${eatenCount}/${this.ghosts.length}. Eats ${this.ghostEatsThisRound}.`
        : `${ghost.config.name} got sent home. Unique sweep ${eatenCount}/${this.ghosts.length}. Eats ${this.ghostEatsThisRound}.`
    );
    this.checkGhostSweepWin();
  }

  private checkGhostSweepWin(): void {
    if (this.levelAdvanceEvent || this.ended) {
      return;
    }

    if (this.ghosts.length === 0) {
      return;
    }

    if (
      hasCompletedGhostSweep(
        this.eatenGhostIds,
        this.ghosts.map((ghost) => ghost.config.id)
      )
    ) {
      this.advanceLevel("Ghost sweep. Round won!");
    }
  }

  private loseLife(): void {
    this.lives -= 1;
    this.pausedAfterHit = true;
    this.cameras.main.shake(180, 0.006);
    this.hud.message.setText(this.lives > 0 ? "Caught. Resetting positions." : "Game over.");

    if (this.lives <= 0) {
      this.endGame(false);
      return;
    }

    this.soundFx.play("death");
    this.lifeResetEvent?.remove(false);
    this.lifeResetEvent = this.time.delayedCall(900, () => {
      this.lifeResetEvent = undefined;
      this.resetPositions();
      this.pausedAfterHit = false;
    });
  }

  private resetPositions(): void {
    this.player.tile = this.maze.playerStart;
    this.player.fromTile = this.maze.playerStart;
    this.player.toTile = this.maze.playerStart;
    this.player.direction = "none";
    this.player.progress = 1;
    this.player.lastFacing = "right";
    this.player.chompTimeMs = 0;
    this.player.lastFrameIndex = 5;
    this.player.sprite.setFrame(5);
    this.player.faceDetailKey = "";
    this.player.mouthKey = "";
    this.player.hypnoRenderKey = "";
    this.player.faceDetails.clear();
    this.player.faceDetails.setPosition(0, -2);
    this.player.faceDetails.setAngle(0);
    this.player.mouth.clear();
    this.player.mouth.setPosition(0, 0);
    this.player.mouth.setAngle(0);
    this.player.sprite.clearTint();
    this.player.container.setScale(1);
    this.placeEntity(this.player, this.player.tile);

    this.ghosts.forEach((ghost) => {
      const start = this.maze.ghostStarts[ghost.config.id];
      ghost.tile = start;
      ghost.fromTile = start;
      ghost.toTile = start;
      ghost.direction = "left";
      ghost.progress = 1;
      ghost.released = false;
      ghost.mood = "normal";
      ghost.renderFacing = "";
      ghost.renderStyleKey = "";
      this.placeEntity(ghost, start);
      this.updateGhostAppearance(ghost);
    });
    this.frightenedUntilMs = 0;
    this.hypnoRainbowUntilMs = 0;
    this.soundFx.stopPowerMode();
  }

  private advanceLevel(message = "Level clear."): void {
    if (this.levelAdvanceEvent || this.ended) {
      return;
    }

    this.score += 500 + this.level.id * 50;
    this.pausedAfterHit = true;
    if (this.levelIndex >= LEVELS.length - 1) {
      this.endGame(true);
      return;
    }

    this.soundFx.play("levelClear");
    this.hud.message.setText(message);
    this.levelAdvanceEvent = this.time.delayedCall(900, () => {
      this.levelAdvanceEvent = undefined;
      this.startLevel(this.levelIndex + 1);
    });
  }

  private endGame(won: boolean): void {
    this.ended = true;
    this.soundFx.stopPowerMode();
    this.soundFx.stopBackgroundMusic();
    this.soundFx.play(won ? "win" : "gameOver");
    this.showRestartPrompt();
    this.publishFinalScore(won);
    this.hud.message.setText(
      won
        ? "PacBecca cleared all 10 levels."
        : "Game over."
    );
  }

  private showRestartPrompt(): void {
    this.clearRestartPrompt();

    const back = this.add
      .rectangle(480, 334, 380, 74, 0x111827, 0.92)
      .setStrokeStyle(4, 0xfacc15, 0.95);
    const text = this.add
      .text(480, 334, "Enter Restarts", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "42px",
        fontStyle: "900",
        color: "#fef08a",
        stroke: "#111827",
        strokeThickness: 8
      })
      .setOrigin(0.5);

    this.restartPrompt = this.add
      .container(0, 0, [back, text])
      .setDepth(4700)
      .setAlpha(0.42);

    this.tweens.add({
      targets: this.restartPrompt,
      alpha: 1,
      scale: 1.05,
      duration: 560,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1
    });
  }

  private clearRestartPrompt(): void {
    if (!this.restartPrompt) {
      return;
    }

    this.tweens.killTweensOf(this.restartPrompt);
    this.restartPrompt.destroy(true);
    this.restartPrompt = undefined;
  }

  private publishFinalScore(won: boolean): void {
    window.dispatchEvent(
      new CustomEvent("pacbecca:final-score", {
        detail: {
          score: this.score,
          level: this.level.id,
          won
        }
      })
    );
  }

  private restartGame(): void {
    this.resetRunState();
    this.soundFx.play("ui");
    this.startLevel(0);
    window.dispatchEvent(new CustomEvent("pacbecca:game-reset"));
  }

  private startDiagnosticLevel(levelIndex: number): void {
    this.resetRunState();
    this.soundFx.play("ui");
    this.startLevel(levelIndex);
    window.dispatchEvent(new CustomEvent("pacbecca:game-reset"));
  }

  private resetRunState(): void {
    this.score = 0;
    this.lives = 3;
    this.burstMeter = 0;
    this.powerCansCollected = 0;
    this.powerHitRagePending = false;
    this.wrongWaySaveUsed = false;
    this.hypnoRainbowUntilMs = 0;
    this.secretHypnoUsedThisSession = false;
    this.secretHypnoLevelIndex = null;
    this.secretClickTimesMs = [];
  }

  private updateGhostAppearance(ghost: GhostEntity): void {
    this.updateGhostFacing(ghost);
    const styleKey =
      ghost.mood === "eaten"
        ? "eaten"
        : this.isGhostVulnerable(ghost)
          ? "vulnerable"
          : "normal";

    if (styleKey === ghost.renderStyleKey) {
      return;
    }

    ghost.renderStyleKey = styleKey;
    const {
      body,
      shine,
      leftEye,
      rightEye,
      leftPupil,
      rightPupil,
      facingMarker,
      nameTagBack,
      nameLabel
    } = ghost.face;

    if (styleKey === "eaten") {
      body.setFillStyle(0x111827, 0.25);
      shine.setFillStyle(0xf8fafc, 0.95);
      leftEye.setAlpha(1);
      rightEye.setAlpha(1);
      leftPupil.setAlpha(1);
      rightPupil.setAlpha(1);
      facingMarker.setAlpha(1);
      nameTagBack.setAlpha(0.7);
      nameTagBack.setFillStyle(0x050712, 0.7);
      nameTagBack.setStrokeStyle(1, 0xdbeafe, 0.65);
      nameLabel.setAlpha(0.82);
      nameLabel.setColor("#dbeafe");
      return;
    }

    if (styleKey === "vulnerable") {
      body.setFillStyle(0x6d28d9, 1);
      shine.setFillStyle(0xc4b5fd, 0.95);
      leftEye.setAlpha(1);
      rightEye.setAlpha(1);
      leftPupil.setAlpha(1);
      rightPupil.setAlpha(1);
      facingMarker.setAlpha(1);
      nameTagBack.setAlpha(0.98);
      nameTagBack.setFillStyle(0x23164a, 0.88);
      nameTagBack.setStrokeStyle(1, 0xfef08a, 0.95);
      nameLabel.setAlpha(1);
      nameLabel.setColor("#fef08a");
      return;
    }

    body.setFillStyle(ghost.config.color, 1);
    shine.setFillStyle(ghost.config.accent, 0.9);
    leftEye.setAlpha(1);
    rightEye.setAlpha(1);
    leftPupil.setAlpha(1);
    rightPupil.setAlpha(1);
    facingMarker.setAlpha(1);
    nameTagBack.setAlpha(0.92);
    nameTagBack.setFillStyle(0x050712, 0.78);
    nameTagBack.setStrokeStyle(1, ghost.config.accent, 0.88);
    nameLabel.setAlpha(0.95);
    nameLabel.setColor("#f8fafc");
  }

  private updateGhostFacing(ghost: GhostEntity): void {
    if (ghost.direction !== "none") {
      ghost.lastFacing = ghost.direction;
    }

    const facing = ghost.lastFacing;
    if (facing === ghost.renderFacing) {
      return;
    }

    ghost.renderFacing = facing;
    const vector = GHOST_FACING_VECTORS[facing];

    const { leftEye, rightEye, leftPupil, rightPupil, facingMarker } = ghost.face;
    const eyeYOffset = vector.y * 2 - 1;
    leftEye.setPosition(-4, eyeYOffset);
    rightEye.setPosition(5, eyeYOffset);
    leftPupil.setPosition(-4 + vector.x * 2.3, eyeYOffset + vector.y * 2.3);
    rightPupil.setPosition(5 + vector.x * 2.3, eyeYOffset + vector.y * 2.3);
    facingMarker.setText(vector.marker);
    facingMarker.setPosition(vector.x * 7, vector.y * 7);
  }

  private updateHud(): void {
    const level = this.level;
    this.setHudText("score", `Score ${this.score.toLocaleString()}`);
    this.setHudText("level", `Level ${level.id}/10  ${level.title}`);
    this.setHudText("lives", `Lives ${"●".repeat(this.lives)}${"○".repeat(Math.max(0, 3 - this.lives))}`);
    const mode = this.isHypnoRainbowActive()
      ? "hypno rainbow"
      : this.time.now < this.frightenedUntilMs
        ? "vulnerable"
        : this.globalMode;
    this.setHudText("mode", `Ghost mode ${mode}`);

    const meterWidth = Math.round(220 * (this.burstMeter / BURST_METER_MAX));
    if (meterWidth !== this.hudCache.meterWidth) {
      this.hudCache.meterWidth = meterWidth;
      this.hud.meterBar.width = meterWidth;
    }

    this.setHudText(
      "burst",
      this.burstMeter >= BURST_METER_MAX ? "Becca Burst ready" : "Becca Burst"
    );
    this.setHudText("ghostList", this.ghostListText);
  }

  private setHudText(
    key: Exclude<keyof HudRenderCache, "meterWidth">,
    value: string
  ): void {
    if (this.hudCache[key] === value) {
      return;
    }

    this.hudCache[key] = value;
    this.hud[key].setText(value);
  }
}
