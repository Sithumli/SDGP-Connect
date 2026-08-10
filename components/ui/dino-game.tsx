// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.
"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A small offline-runner game, in the spirit of Chrome's no-connection dino.
 * Shown inside <ErrorState /> so visitors have something to do while a failed
 * request retries in the background.
 *
 * Everything lives on a canvas driven by one requestAnimationFrame loop; React
 * state only tracks the coarse status so overlays stay accessible.
 */

type Status = "ready" | "running" | "paused" | "over";

interface Obstacle {
  x: number;
  /** Top edge, in world coordinates. */
  y: number;
  width: number;
  height: number;
  kind: "cactus" | "bird";
}

interface Cloud {
  x: number;
  y: number;
  scale: number;
}

interface GameState {
  status: Status;
  speed: number;
  score: number;
  /** Height above the ground; 0 means standing on it. */
  runnerY: number;
  velocity: number;
  ducking: boolean;
  obstacles: Obstacle[];
  clouds: Cloud[];
  groundOffset: number;
  distanceSinceSpawn: number;
  nextGap: number;
  legTimer: number;
  legFrame: number;
  colorTimer: number;
}

// World units. The canvas is scaled so this box always fills the container width.
const WORLD_WIDTH = 640;
const WORLD_HEIGHT = 180;
const GROUND_Y = 148;
const RUNNER_X = 48;
const RUNNER_WIDTH = 26;
const RUNNER_HEIGHT = 30;
const DUCK_WIDTH = 34;
const DUCK_HEIGHT = 16;

const GRAVITY = 0.62;
const JUMP_VELOCITY = -11.4;
const FAST_FALL = 1.1;
const START_SPEED = 5.4;
const MAX_SPEED = 12.5;
const ACCELERATION = 0.0016;
const SCORE_RATE = 0.35;
const BIRD_SCORE_THRESHOLD = 220;

const HIGH_SCORE_KEY = "sdgp:runner-high-score";

const GROUND_DASHES = Array.from({ length: 24 }, (_, i) => ({
  x: i * 34 + (i % 3) * 9,
  width: 6 + (i % 4) * 4,
  y: 4 + (i % 3) * 4,
}));

function createState(): GameState {
  return {
    status: "ready",
    speed: START_SPEED,
    score: 0,
    runnerY: 0,
    velocity: 0,
    ducking: false,
    obstacles: [],
    clouds: [
      { x: 420, y: 40, scale: 1 },
      { x: 660, y: 66, scale: 0.8 },
    ],
    groundOffset: 0,
    distanceSinceSpawn: 0,
    nextGap: 260,
    legTimer: 0,
    legFrame: 0,
    colorTimer: 0,
  };
}

function readHighScore(): number {
  if (typeof window === "undefined") return 0;
  try {
    const stored = window.localStorage.getItem(HIGH_SCORE_KEY);
    const parsed = stored ? Number.parseInt(stored, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeHighScore(score: number) {
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // Private browsing or blocked storage — the score just won't persist.
  }
}

function spawnObstacle(state: GameState): Obstacle {
  const canSpawnBird = state.score > BIRD_SCORE_THRESHOLD && Math.random() < 0.25;

  if (canSpawnBird) {
    // Two heights: one you jump over, one you duck under.
    const high = Math.random() < 0.5;
    const height = 18;
    return {
      x: WORLD_WIDTH + 20,
      y: high ? GROUND_Y - 62 : GROUND_Y - 34,
      width: 28,
      height,
      kind: "bird",
    };
  }

  const large = Math.random() < 0.4;
  const cluster = Math.random() < 0.3 ? 2 : 1;
  const unit = large ? 17 : 12;
  const height = large ? 38 : 26;
  const width = unit * cluster + (cluster - 1) * 3;

  return {
    x: WORLD_WIDTH + 20,
    y: GROUND_Y - height,
    width,
    height,
    kind: "cactus",
  };
}

function collides(state: GameState, obstacle: Obstacle): boolean {
  const width = state.ducking ? DUCK_WIDTH : RUNNER_WIDTH;
  const height = state.ducking ? DUCK_HEIGHT : RUNNER_HEIGHT;
  const runnerTop = GROUND_Y - state.runnerY - height;

  // Generous hitbox — the drawn shapes are not solid rectangles.
  const padX = 4;
  const padY = 4;

  return (
    RUNNER_X + padX < obstacle.x + obstacle.width - padX &&
    RUNNER_X + width - padX > obstacle.x + padX &&
    runnerTop + padY < obstacle.y + obstacle.height - padY &&
    runnerTop + height - padY > obstacle.y + padY
  );
}

interface DinoGameProps {
  className?: string;
  /** Rendered under the canvas; used for the "still retrying" hint. */
  footnote?: string;
}

export function DinoGame({ className, footnote }: DinoGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createState());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const colorRef = useRef<string>("#111111");
  const highScoreRef = useRef<number>(0);

  const [status, setStatus] = useState<Status>("ready");
  const [highScore, setHighScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const stored = readHighScore();
    highScoreRef.current = stored;
    setHighScore(stored);
  }, []);

  const setStatusSafe = useCallback((next: Status) => {
    stateRef.current.status = next;
    setStatus(next);
  }, []);

  /** Space / tap: start, jump, or restart depending on where we are. */
  const primaryAction = useCallback(() => {
    const state = stateRef.current;

    if (state.status === "ready" || state.status === "paused") {
      setStatusSafe("running");
      return;
    }

    if (state.status === "over") {
      const fresh = createState();
      fresh.status = "running";
      stateRef.current = fresh;
      setStatus("running");
      return;
    }

    if (state.runnerY === 0) {
      state.velocity = JUMP_VELOCITY;
      state.ducking = false;
    }
  }, [setStatusSafe]);

  const setDucking = useCallback((ducking: boolean) => {
    if (stateRef.current.status === "running") {
      stateRef.current.ducking = ducking;
    }
  }, []);

  // --- Sizing -------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const width = container.clientWidth;
      if (!width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const height = (width * WORLD_HEIGHT) / WORLD_WIDTH;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.height = `${height}px`;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // --- Game loop ----------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const update = (step: number) => {
      const state = stateRef.current;

      state.speed = Math.min(MAX_SPEED, state.speed + ACCELERATION * step);
      state.score += SCORE_RATE * step;
      state.groundOffset = (state.groundOffset + state.speed * step) % WORLD_WIDTH;

      // Runner physics.
      state.velocity += GRAVITY * step;
      if (state.ducking && state.runnerY > 0) {
        state.velocity += FAST_FALL * step;
      }
      state.runnerY -= state.velocity * step;
      if (state.runnerY <= 0) {
        state.runnerY = 0;
        state.velocity = 0;
      }

      state.legTimer += step;
      if (state.legTimer > 5) {
        state.legTimer = 0;
        state.legFrame = state.legFrame === 0 ? 1 : 0;
      }

      // Clouds drift slower than the ground for a bit of parallax.
      state.clouds.forEach((cloud) => {
        cloud.x -= state.speed * 0.25 * step;
      });
      state.clouds = state.clouds.filter((cloud) => cloud.x > -80);
      if (state.clouds.length < 3 && Math.random() < 0.004 * step) {
        state.clouds.push({
          x: WORLD_WIDTH + 40,
          y: 24 + Math.random() * 56,
          scale: 0.7 + Math.random() * 0.5,
        });
      }

      // Obstacles.
      const travelled = state.speed * step;
      state.distanceSinceSpawn += travelled;
      if (state.distanceSinceSpawn >= state.nextGap) {
        state.distanceSinceSpawn = 0;
        state.nextGap = state.speed * 22 + 80 + Math.random() * 200;
        state.obstacles.push(spawnObstacle(state));
      }

      state.obstacles.forEach((obstacle) => {
        obstacle.x -= travelled;
        if (obstacle.kind === "bird") {
          obstacle.x -= travelled * 0.2;
        }
      });
      state.obstacles = state.obstacles.filter((o) => o.x + o.width > -20);

      if (state.obstacles.some((obstacle) => collides(state, obstacle))) {
        state.status = "over";
        const score = Math.floor(state.score);
        setFinalScore(score);
        if (score > highScoreRef.current) {
          highScoreRef.current = score;
          setHighScore(score);
          writeHighScore(score);
        }
        setStatus("over");
      }
    };

    const drawRunner = (state: GameState) => {
      const bottom = GROUND_Y - state.runnerY;
      const x = RUNNER_X;

      if (state.ducking && state.runnerY === 0) {
        ctx.fillRect(x, bottom - 13, 24, 13); // body
        ctx.fillRect(x + 22, bottom - 16, 12, 10); // head
        ctx.fillRect(x + 32, bottom - 12, 4, 3); // snout
        ctx.fillRect(x - 6, bottom - 16, 8, 5); // tail
        ctx.fillRect(x + 4, bottom - 4, 5, 4); // legs
        ctx.fillRect(x + 14, bottom - 4, 5, 4);
        return;
      }

      ctx.fillRect(x, bottom - 22, 17, 15); // body
      ctx.fillRect(x + 12, bottom - 30, 13, 11); // head
      ctx.fillRect(x + 21, bottom - 22, 5, 4); // jaw
      ctx.fillRect(x - 6, bottom - 26, 8, 5); // tail
      ctx.fillRect(x + 13, bottom - 17, 6, 3); // arm

      const lift = state.status === "running" ? state.legFrame : 0;
      const airborne = state.runnerY > 0;
      if (airborne) {
        ctx.fillRect(x + 2, bottom - 8, 5, 6);
        ctx.fillRect(x + 10, bottom - 8, 5, 6);
      } else {
        ctx.fillRect(x + 2, bottom - 8, 5, lift === 0 ? 8 : 5);
        ctx.fillRect(x + 10, bottom - 8, 5, lift === 0 ? 5 : 8);
      }
    };

    const drawObstacle = (obstacle: Obstacle, state: GameState) => {
      if (obstacle.kind === "cactus") {
        const stems = obstacle.width > 20 ? 2 : 1;
        const unit = obstacle.width > 20 ? 17 : obstacle.width;
        for (let i = 0; i < stems; i += 1) {
          const sx = obstacle.x + i * (unit + 3);
          const trunkWidth = Math.max(5, Math.round(unit * 0.4));
          const trunkX = sx + (unit - trunkWidth) / 2;
          ctx.fillRect(trunkX, obstacle.y, trunkWidth, obstacle.height);
          // Arms
          const armY = obstacle.y + obstacle.height * 0.3;
          const armH = Math.max(3, Math.round(obstacle.height * 0.1));
          ctx.fillRect(sx, armY + armH, 4, obstacle.height * 0.35);
          ctx.fillRect(sx, armY, unit * 0.45, armH);
          ctx.fillRect(sx + unit - 4, armY + armH * 1.6, 4, obstacle.height * 0.3);
          ctx.fillRect(sx + unit * 0.55, armY + armH * 0.6, unit * 0.45, armH);
        }
        return;
      }

      // Bird: body plus a wing that flaps with the leg timer.
      const wingUp = state.legFrame === 0;
      ctx.fillRect(obstacle.x + 8, obstacle.y + 6, 16, 6); // body
      ctx.fillRect(obstacle.x + 22, obstacle.y + 4, 6, 4); // head
      ctx.fillRect(obstacle.x + 27, obstacle.y + 6, 4, 2); // beak
      if (wingUp) {
        ctx.fillRect(obstacle.x + 6, obstacle.y - 4, 14, 5);
        ctx.fillRect(obstacle.x + 2, obstacle.y, 8, 4);
      } else {
        ctx.fillRect(obstacle.x + 6, obstacle.y + 11, 14, 5);
        ctx.fillRect(obstacle.x + 2, obstacle.y + 8, 8, 4);
      }
    };

    const draw = () => {
      const state = stateRef.current;
      const width = canvas.width;
      const height = canvas.height;
      if (!width || !height) return;

      // Refresh the theme colour a few times a second so light/dark toggles apply.
      state.colorTimer += 1;
      if (state.colorTimer % 20 === 0 || state.colorTimer === 1) {
        colorRef.current = getComputedStyle(canvas).color || colorRef.current;
      }

      const scale = width / WORLD_WIDTH;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      ctx.fillStyle = colorRef.current;

      // Clouds
      ctx.globalAlpha = 0.18;
      state.clouds.forEach((cloud) => {
        const w = 34 * cloud.scale;
        const h = 8 * cloud.scale;
        ctx.fillRect(cloud.x, cloud.y, w, h);
        ctx.fillRect(cloud.x + w * 0.25, cloud.y - h * 0.7, w * 0.5, h * 0.7);
      });

      // Ground
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, GROUND_Y + 1, WORLD_WIDTH, 1.5);
      GROUND_DASHES.forEach((dash) => {
        let x = dash.x - state.groundOffset;
        if (x < -dash.width) x += WORLD_WIDTH;
        ctx.fillRect(x, GROUND_Y + 5 + dash.y, dash.width, 1.5);
      });

      ctx.globalAlpha = 1;
      state.obstacles.forEach((obstacle) => drawObstacle(obstacle, state));
      drawRunner(state);

      // Score
      ctx.globalAlpha = 0.7;
      ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "right";
      const current = String(Math.floor(state.score)).padStart(5, "0");
      const best = highScoreRef.current
        ? `HI ${String(highScoreRef.current).padStart(5, "0")}  `
        : "";
      ctx.fillText(`${best}${current}`, WORLD_WIDTH - 8, 22);
      ctx.globalAlpha = 1;
    };

    const loop = (time: number) => {
      const delta = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 48) : 16;
      lastTimeRef.current = time;

      if (stateRef.current.status === "running") {
        update(delta / (1000 / 60));
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    if (prefersReducedMotion) {
      // Still playable, just no idle animation before the player starts.
      draw();
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = 0;
    };
  }, []);

  // Pause when the tab is hidden so we neither burn CPU nor lose a run.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && stateRef.current.status === "running") {
        setStatusSafe("paused");
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [setStatusSafe]);

  // Keys are bound to the container, not the window, so Space keeps scrolling
  // the page until the player actually focuses the game.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "ArrowUp" || event.key === "Enter") {
      event.preventDefault();
      primaryAction();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setDucking(true);
    }
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") setDucking(false);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={containerRef}
        role="application"
        aria-label="Offline runner game. Press space or tap to jump."
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onPointerDown={(event) => {
          event.preventDefault();
          containerRef.current?.focus();
          primaryAction();
        }}
        onBlur={() => {
          if (stateRef.current.status === "running") setStatusSafe("paused");
        }}
        className={cn(
          "relative w-full select-none overflow-hidden rounded-lg border border-border/60",
          "bg-muted/30 text-foreground outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "cursor-pointer touch-none",
        )}
      >
        <canvas ref={canvasRef} className="block w-full text-foreground" />

        {status !== "running" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/70 px-4 text-center backdrop-blur-[1px]">
            {status === "over" ? (
              <>
                <p className="text-sm font-semibold text-foreground">
                  Game over — {finalScore} points
                </p>
                <p className="text-xs text-muted-foreground">
                  {highScore > 0 && `Best ${highScore} · `}Tap or press Space to play again
                </p>
              </>
            ) : status === "paused" ? (
              <p className="text-xs text-muted-foreground">Paused — tap to resume</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">
                  Tap or press Space to start
                </p>
                <p className="text-xs text-muted-foreground">
                  ↑ or Space to jump · ↓ to duck
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {footnote && (
        <p className="mt-2 text-center text-xs text-muted-foreground">{footnote}</p>
      )}
    </div>
  );
}

export default DinoGame;
