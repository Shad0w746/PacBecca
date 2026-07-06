import Phaser from "phaser";
import {
  AVATAR_ASSET_PATH,
  BOARD_OFFSET,
  BURST_METER_MAX,
  GAME_TITLE,
  GHOSTS,
  LEVELS
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

interface GhostFaceParts {
  body: Phaser.GameObjects.Arc;
  shine: Phaser.GameObjects.Arc;
  leftEye: Phaser.GameObjects.Arc;
  rightEye: Phaser.GameObjects.Arc;
  leftPupil: Phaser.GameObjects.Arc;
  rightPupil: Phaser.GameObjects.Arc;
  facingMarker: Phaser.GameObjects.Text;
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
  private ghostCombo = 0;
  private maze!: MazeModel;
  private level!: LevelConfig;
  private player!: MovingEntity;
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
  private ended = false;

  constructor() {
    super("pacbecca");
  }

  preload(): void {
    this.load.image("becca-head", AVATAR_ASSET_PATH);
  }

  create(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,SPACE,ENTER") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.createHud();
    this.startLevel(0);
  }

  update(_time: number, delta: number): void {
    if (this.ended) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
        this.restartGame();
      }
      return;
    }

    if (this.pausedAfterHit) {
      return;
    }

    this.readControls();
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
    body.fillStyle(0xfacc15, 1);
    body.fillRoundedRect(-9, -7, 18, 14, 4);
    body.lineStyle(2, 0xfef08a, 0.9);
    body.strokeRoundedRect(-9, -7, 18, 14, 4);
    body.fillStyle(0xfef08a, 0.8);
    body.fillRoundedRect(-7, -4, 14, 8, 3);
    body.lineStyle(1, 0x0f3a8a, 0.8);
    body.strokeRoundedRect(-9, -7, 18, 14, 4);

    const label = this.add
      .text(0, 0, "BB", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "7px",
        fontStyle: "900",
        color: "#1d4ed8"
      })
      .setOrigin(0.5);

    const shine = this.add.rectangle(-4, -5, 7, 2, 0xffffff, 0.45);
    return this.add.container(world.x, world.y, [body, shine, label]);
  }

  private createPlayer(): MovingEntity {
    const start = this.maze.playerStart;
    const world = toWorld(start, BOARD_OFFSET);
    const sprite = this.add.image(0, 0, "becca-head").setDisplaySize(28, 28);
    const ring = this.add.circle(0, 0, 16, 0xffffff, 0).setStrokeStyle(3, 0xf9a8d4, 0.9);
    const container = this.add.container(world.x, world.y, [ring, sprite]);
    container.setDepth(20);
    return {
      tile: start,
      fromTile: start,
      toTile: start,
      direction: "none",
      progress: 1,
      container
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
      const container = this.add.container(world.x, world.y, [
        body,
        shine,
        leftEye,
        rightEye,
        leftPupil,
        rightPupil,
        facingMarker
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
          facingMarker
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
    if (this.time.now < this.frightenedUntilMs || ghost.mood === "stunned") {
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

    if (this.time.now < this.frightenedUntilMs || ghost.mood === "stunned") {
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

      if (this.time.now < this.frightenedUntilMs || ghost.mood === "stunned") {
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
    this.hud.message.setText(
      won
        ? "PacBecca cleared all 10 levels. Enter restarts."
        : "Game over. Enter restarts."
    );
  }

  private restartGame(): void {
    this.score = 0;
    this.lives = 3;
    this.burstMeter = 0;
    this.startLevel(0);
  }

  private updateGhostAppearance(ghost: GhostEntity): void {
    this.updateGhostFacing(ghost);
    const { body, shine, leftEye, rightEye, leftPupil, rightPupil, facingMarker } =
      ghost.face;

    if (ghost.mood === "eaten") {
      body.setFillStyle(0x111827, 0.25);
      shine.setFillStyle(0xf8fafc, 0.95);
      leftEye.setAlpha(1);
      rightEye.setAlpha(1);
      leftPupil.setAlpha(1);
      rightPupil.setAlpha(1);
      facingMarker.setAlpha(1);
      return;
    }

    if (this.time.now < this.frightenedUntilMs || ghost.mood === "stunned") {
      body.setFillStyle(0x6d28d9, 1);
      shine.setFillStyle(0xc4b5fd, 0.95);
      leftEye.setAlpha(1);
      rightEye.setAlpha(1);
      leftPupil.setAlpha(1);
      rightPupil.setAlpha(1);
      facingMarker.setAlpha(1);
      return;
    }

    body.setFillStyle(ghost.config.color, 1);
    shine.setFillStyle(ghost.config.accent, 0.9);
    leftEye.setAlpha(1);
    rightEye.setAlpha(1);
    leftPupil.setAlpha(1);
    rightPupil.setAlpha(1);
    facingMarker.setAlpha(1);
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
    const mode = this.time.now < this.frightenedUntilMs ? "vulnerable" : this.globalMode;
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
