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
import { targetForGhost } from "./ghostAi";
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
  Direction,
  GhostConfig,
  GhostMood,
  GlobalGhostMode,
  GridPoint,
  LevelConfig,
  MazeModel,
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
  mouth: Phaser.GameObjects.Graphics;
  gloss: Phaser.GameObjects.Arc;
  chompTimeMs: number;
  lastFacing: Exclude<Direction, "none">;
}

interface GhostFaceParts {
  body: Phaser.GameObjects.Arc;
  shine: Phaser.GameObjects.Arc;
  leftEye: Phaser.GameObjects.Arc;
  rightEye: Phaser.GameObjects.Arc;
  leftPupil: Phaser.GameObjects.Arc;
  rightPupil: Phaser.GameObjects.Arc;
  facingMarker: Phaser.GameObjects.Text;
  nameLabel: Phaser.GameObjects.Text;
}

interface GhostEntity extends MovingEntity {
  config: GhostConfig;
  mood: GhostMood;
  released: boolean;
  eatenUntilMs: number;
  face: GhostFaceParts;
  lastFacing: Exclude<Direction, "none">;
}

export class PacBeccaScene extends Phaser.Scene {
  private levelIndex = 0;
  private score = 0;
  private lives = 3;
  private burstMeter = 0;
  private powerCansCollected = 0;
  private wrongWaySaveUsed = false;
  private hypnoRainbowUntilMs = 0;
  private secretHypnoUsedThisSession = false;
  private secretHypnoLevelIndex: number | null = null;
  private secretClickTimesMs: number[] = [];
  private ghostCombo = 0;
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
  private wallLayer!: Phaser.GameObjects.Graphics;
  private floorLayer!: Phaser.GameObjects.Graphics;
  private globalMode: GlobalGhostMode = "scatter";
  private modeCursor = 0;
  private modeRemainingMs = 0;
  private frightenedUntilMs = 0;
  private pausedAfterHit = false;
  private rageOverlay?: Phaser.GameObjects.Container;
  private rageOverlayResumeEvent?: Phaser.Time.TimerEvent;
  private ended = false;

  constructor() {
    super("pacbecca");
  }

  preload(): void {
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

    this.createHud();
    this.startLevel(0);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handleSecretPlayerClick, this);
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

    if (!this.isTypingInTextField()) {
      this.readControls();
    }
    this.updateMode(delta);
    this.updatePlayer(delta);
    this.updateGhosts(delta);
    this.checkCollisions();
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
  }

  private clearLevelObjects(): void {
    this.clearRageOverlay();
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
    const gloss = this.add.circle(-6, -9, 5, 0xffffff, 0.2).setScale(1.55, 0.7);
    const mouth = this.add.graphics();
    const container = this.add.container(world.x, world.y, [
      shadow,
      ring,
      sprite,
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
      mouth,
      gloss,
      chompTimeMs: 0,
      lastFacing: "right"
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
      const nameLabel = this.add
        .text(0, 15, config.name, {
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "7px",
          fontStyle: "900",
          color: "#f8fafc",
          align: "center",
          stroke: "#111827",
          strokeThickness: 3
        })
        .setOrigin(0.5, 0);
      const container = this.add.container(world.x, world.y, [
        body,
        shine,
        leftEye,
        rightEye,
        leftPupil,
        rightPupil,
        facingMarker,
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
          nameLabel
        },
        lastFacing: "left",
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
    const from = toWorld(entity.fromTile, BOARD_OFFSET);
    const to = toWorld(entity.toTile, BOARD_OFFSET);
    const x = Phaser.Math.Linear(from.x, to.x, entity.progress);
    const y = Phaser.Math.Linear(from.y, to.y, entity.progress);
    entity.container.setPosition(x, y);
  }

  private placeEntity(entity: MovingEntity, tile: GridPoint): void {
    const world = toWorld(tile, BOARD_OFFSET);
    entity.container.setPosition(world.x, world.y);
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

    const frameSequence = [5, 2, 1, 0, 4, 3, 4, 0, 1, 2];
    const frameIndex = moving
      ? frameSequence[
          Math.floor(this.player.chompTimeMs / 95) % frameSequence.length
        ] % AVATAR_FRAME_COUNT
      : 5;
    this.player.sprite.setFrame(frameIndex);

    const phase = (this.player.chompTimeMs % 300) / 300;
    const openAmount = moving ? Math.sin(phase * Math.PI) : 0;
    const bob = moving ? Math.sin(this.player.chompTimeMs / 72) * 1.2 : 0;
    const lean = {
      up: 0,
      down: 0,
      left: -8,
      right: 8
    }[this.player.lastFacing];

    this.player.sprite.setPosition(0, -2 + bob);
    this.player.sprite.setAngle(lean);
    this.player.gloss.setPosition(-6, -10 + bob * 0.45);
    this.player.ring.setScale(1 + openAmount * 0.035, 1 - openAmount * 0.02);
    this.player.shadow.setScale(1 + openAmount * 0.18, 0.92 - openAmount * 0.04);
    this.player.shadow.setAlpha(0.34 + openAmount * 0.16);
    this.updateHypnoRainbowAppearance();
    this.drawPlayerMouth(openAmount);
  }

  private updateHypnoRainbowAppearance(): void {
    if (!this.isHypnoRainbowActive()) {
      this.player.sprite.clearTint();
      this.player.ring.setStrokeStyle(3, 0xf9a8d4, 0.95);
      this.player.gloss.setFillStyle(0xffffff, 0.2);
      this.player.container.setScale(1);
      return;
    }

    const phase = ((this.time.now % 650) / 650);
    const tint = Phaser.Display.Color.HSVToRGB(phase, 0.9, 1).color;
    const accent = Phaser.Display.Color.HSVToRGB((phase + 0.33) % 1, 0.85, 1).color;
    this.player.sprite.setTint(tint);
    this.player.ring.setStrokeStyle(5, accent, 1);
    this.player.gloss.setFillStyle(0xffffff, 0.45);
    this.player.container.setScale(1.08 + Math.sin(this.time.now / 60) * 0.05);
  }

  private drawPlayerMouth(openAmount: number): void {
    this.player.mouth.clear();
    if (openAmount <= 0.06) {
      return;
    }

    const directionAngle = {
      right: 0,
      down: Math.PI / 2,
      left: Math.PI,
      up: -Math.PI / 2
    }[this.player.lastFacing];
    const radius = 21;
    const halfAngle = 0.12 + openAmount * 0.72;

    this.player.mouth.fillStyle(0x070711, 0.96);
    this.player.mouth.beginPath();
    this.player.mouth.moveTo(0, -2);
    this.player.mouth.arc(
      0,
      -2,
      radius,
      directionAngle - halfAngle,
      directionAngle + halfAngle,
      false
    );
    this.player.mouth.closePath();
    this.player.mouth.fillPath();

    this.player.mouth.lineStyle(2, 0xf9a8d4, 0.75);
    this.player.mouth.beginPath();
    this.player.mouth.moveTo(0, -2);
    this.player.mouth.arc(
      0,
      -2,
      radius,
      directionAngle - halfAngle,
      directionAngle + halfAngle,
      false
    );
    this.player.mouth.closePath();
    this.player.mouth.strokePath();
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
    } else if (pickup === "power") {
      this.score += 50;
      this.addBurst(18);
      this.powerCansCollected += 1;
      this.showPowerPickupBurst();
      this.frightenGhosts(this.level.frightenedDurationMs);
    } else {
      this.score += 125;
      this.addBurst(28);
    }

    if (this.maze.pickups.size === 0) {
      this.advanceLevel();
    }
  }

  private frightenGhosts(durationMs: number): void {
    this.frightenedUntilMs = Math.max(this.frightenedUntilMs, this.time.now + durationMs);
    this.ghostCombo = 0;
    this.reverseGhosts();
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
    this.cameras.main.flash(180, 255, 0, 210);
    this.cameras.main.shake(160, 0.004);
    this.hud.message.setText("BRAZY BECCA RAGE!");
    this.showBrazyRageSplash();
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
      .text(480, 106, "BRAZY BECCA RAGE!", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "58px",
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
    const playerBounds = this.player.container.getBounds();
    this.ghosts.forEach((ghost) => {
      const ghostBounds = ghost.container.getBounds();
      const distance = Phaser.Math.Distance.Between(
        playerBounds.centerX,
        playerBounds.centerY,
        ghostBounds.centerX,
        ghostBounds.centerY
      );
      if (distance > 16 || ghost.mood === "eaten") {
        return;
      }

      if (this.isGhostVulnerable(ghost)) {
        this.eatGhost(ghost);
        return;
      }

      if (this.canTriggerWrongWaySave()) {
        this.triggerHypnoRainbow();
        this.eatGhost(ghost);
        return;
      }

      this.loseLife();
    });
  }

  private eatGhost(ghost: GhostEntity): void {
    this.ghostCombo += 1;
    this.score += 200 * this.ghostCombo;
    ghost.mood = "eaten";
    ghost.direction = "none";
    ghost.progress = 1;
    this.hud.message.setText(`${ghost.config.name} got sent home.`);
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

    this.time.delayedCall(900, () => {
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
    this.player.sprite.setFrame(5);
    this.player.mouth.clear();
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
      this.placeEntity(ghost, start);
      this.updateGhostAppearance(ghost);
    });
    this.frightenedUntilMs = 0;
    this.hypnoRainbowUntilMs = 0;
  }

  private advanceLevel(): void {
    this.score += 500 + this.level.id * 50;
    if (this.levelIndex >= LEVELS.length - 1) {
      this.endGame(true);
      return;
    }

    this.hud.message.setText("Level clear.");
    this.time.delayedCall(900, () => this.startLevel(this.levelIndex + 1));
  }

  private endGame(won: boolean): void {
    this.ended = true;
    this.publishFinalScore(won);
    this.hud.message.setText(
      won
        ? "PacBecca cleared all 10 levels. Enter restarts."
        : "Game over. Enter restarts."
    );
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
    this.score = 0;
    this.lives = 3;
    this.burstMeter = 0;
    this.powerCansCollected = 0;
    this.wrongWaySaveUsed = false;
    this.hypnoRainbowUntilMs = 0;
    this.startLevel(0);
  }

  private updateGhostAppearance(ghost: GhostEntity): void {
    this.updateGhostFacing(ghost);
    const { body, shine, leftEye, rightEye, leftPupil, rightPupil, facingMarker, nameLabel } =
      ghost.face;

    if (ghost.mood === "eaten") {
      body.setFillStyle(0x111827, 0.25);
      shine.setFillStyle(0xf8fafc, 0.95);
      leftEye.setAlpha(1);
      rightEye.setAlpha(1);
      leftPupil.setAlpha(1);
      rightPupil.setAlpha(1);
      facingMarker.setAlpha(1);
      nameLabel.setAlpha(0.82);
      nameLabel.setColor("#dbeafe");
      return;
    }

    if (this.isGhostVulnerable(ghost)) {
      body.setFillStyle(0x6d28d9, 1);
      shine.setFillStyle(0xc4b5fd, 0.95);
      leftEye.setAlpha(1);
      rightEye.setAlpha(1);
      leftPupil.setAlpha(1);
      rightPupil.setAlpha(1);
      facingMarker.setAlpha(1);
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
    nameLabel.setAlpha(0.95);
    nameLabel.setColor("#f8fafc");
  }

  private updateGhostFacing(ghost: GhostEntity): void {
    if (ghost.direction !== "none") {
      ghost.lastFacing = ghost.direction;
    }

    const facing = ghost.lastFacing;
    const vector = {
      up: { x: 0, y: -1, marker: "^" },
      down: { x: 0, y: 1, marker: "v" },
      left: { x: -1, y: 0, marker: "<" },
      right: { x: 1, y: 0, marker: ">" }
    }[facing];

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
    this.hud.score.setText(`Score ${this.score.toLocaleString()}`);
    this.hud.level.setText(`Level ${level.id}/10  ${level.title}`);
    this.hud.lives.setText(`Lives ${"●".repeat(this.lives)}${"○".repeat(Math.max(0, 3 - this.lives))}`);
    const mode = this.isHypnoRainbowActive()
      ? "hypno rainbow"
      : this.time.now < this.frightenedUntilMs
        ? "vulnerable"
        : this.globalMode;
    this.hud.mode.setText(`Ghost mode ${mode}`);
    this.hud.meterBar.width = 220 * (this.burstMeter / BURST_METER_MAX);
    this.hud.burst.setText(
      this.burstMeter >= BURST_METER_MAX ? "Becca Burst ready" : "Becca Burst"
    );
    this.hud.ghostList.setText(
      this.ghosts
        .map((ghost) => `${ghost.config.name}: ${ghost.config.personality}`)
        .join("\n")
    );
  }
}
