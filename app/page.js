"use client";
import { useEffect, useRef, useState } from "react";

export default function Game() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState("START"); // START, PLAYING, WON, LOST
  const [hp, setHp] = useState(3);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);

  // References to keep game values synchronized across frames
  const stateRef = useRef({
    tom: { x: 200, y: 530, width: 40, height: 50 },
    keys: { a: false, d: false, space: false },
    lasers: [],
    enemies: [],
    explosions: [],
    spawnTimer: 0,
    distanceTraveled: 0,
    scoreValue: 0,
    hpValue: 3,
    lastShotTime: 0
  });

  const TARGET_DISTANCE = 1000;
  const CANVAS_WIDTH = 500;
  const CANVAS_HEIGHT = 600;

  // Handle game restarts
  const startGame = () => {
    stateRef.current = {
      tom: { x: 220, y: 530, width: 40, height: 50 },
      keys: { a: false, d: false, space: false },
      lasers: [],
      enemies: [],
      explosions: [],
      spawnTimer: 0,
      distanceTraveled: 0,
      scoreValue: 0,
      hpValue: 3,
      lastShotTime: 0
    };
    setHp(3);
    setScore(0);
    setDistance(0);
    setGameState("PLAYING");
  };

  useEffect(() => {
    if (gameState !== "PLAYING") return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Track inputs
    const handleKeyDown = (e) => {
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") stateRef.current.keys.a = true;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") stateRef.current.keys.d = true;
      if (e.key === " ") stateRef.current.keys.space = true;
    };

    const handleKeyUp = (e) => {
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") stateRef.current.keys.a = false;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") stateRef.current.keys.d = false;
      if (e.key === " ") stateRef.current.keys.space = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Main Game Loop Engine
    const gameLoop = () => {
      const state = stateRef.current;

      // 1. Progress Distance / Win Condition
      state.distanceTraveled += 0.5;
      setDistance(Math.floor(state.distanceTraveled));
      if (state.distanceTraveled >= TARGET_DISTANCE) {
        setGameState("WON");
        return;
      }

      // 2. Move Tom (Keyboard mechanics)
      if (state.keys.a && state.tom.x > 0) state.tom.x -= 5;
      if (state.keys.d && state.tom.x < CANVAS_WIDTH - state.tom.width) state.tom.x += 5;

      // 3. Handle Weapon Cooldown and Shooting
      const now = Date.now();
      if (state.keys.space && now - state.lastShotTime > 250) {
        state.lasers.push({ x: state.tom.x + state.tom.width / 2 - 3, y: state.tom.y, width: 6, height: 15 });
        state.lastShotTime = now;
      }

      // 4. Move Lasers
      state.lasers.forEach((laser, idx) => {
        laser.y -= 8;
        if (laser.y < 0) state.lasers.splice(idx, 1);
      });

      // 5. Spawn Red Army Clones
      state.spawnTimer++;
      if (state.spawnTimer % 40 === 0) {
        state.enemies.push({
          x: Math.random() * (CANVAS_WIDTH - 40),
          y: -40,
          width: 35,
          height: 45,
          speed: 2 + Math.random() * 2
        });
      }

      // 6. Move Enemies & Handle Collision with Tom
      state.enemies.forEach((enemy, idx) => {
        enemy.y += enemy.speed;

        // Collision Check: Enemy hits Tom
        if (
          enemy.x < state.tom.x + state.tom.width &&
          enemy.x + enemy.width > state.tom.x &&
          enemy.y < state.tom.y + state.tom.height &&
          enemy.y + enemy.height > state.tom.y
        ) {
          state.hpValue -= 1;
          setHp(state.hpValue);
          state.explosions.push({ x: enemy.x, y: enemy.y, radius: 10, maxRadius: 30 });
          state.enemies.splice(idx, 1);

          if (state.hpValue <= 0) {
            setGameState("LOST");
            // Auto close window simulation / stop loop
            setTimeout(() => { window.close(); }, 2000);
            return;
          }
        }

        // Clean up out of bounds enemies
        if (enemy.y > CANVAS_HEIGHT) state.enemies.splice(idx, 1);
      });

      // 7. Collision Check: Laser hits Enemy
      state.lasers.forEach((laser, lIdx) => {
        state.enemies.forEach((enemy, eIdx) => {
          if (
            laser.x < enemy.x + enemy.width &&
            laser.x + laser.width > enemy.x &&
            laser.y < enemy.y + enemy.height &&
            laser.y + laser.height > enemy.y
          ) {
            state.explosions.push({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2, radius: 5, maxRadius: 25 });
            state.enemies.splice(eIdx, 1);
            state.lasers.splice(lIdx, 1);
            state.scoreValue += 100;
            setScore(state.scoreValue);
          }
        });
      });

      // 8. Update Explosion animations
      state.explosions.forEach((exp, idx) => {
        exp.radius += 2;
        if (exp.radius >= exp.maxRadius) state.explosions.splice(idx, 1);
      });

      // --- RENDERING CANVAS VISUALS ---
      ctx.fillStyle = "#1e1e24"; // Dark background
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Grid Lines (Sci-fi road effect)
      ctx.strokeStyle = "#2a2b36";
      for (let i = 0; i < CANVAS_WIDTH; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // Draw Tom (Blue Hoodie / Black Eyes look)
      ctx.fillStyle = "#3b82f6"; // Blue Hoodie
      ctx.fillRect(state.tom.x, state.tom.y, state.tom.width, state.tom.height);
      ctx.fillStyle = "#111827"; // Visor / Eyes
      ctx.fillRect(state.tom.x + 8, state.tom.y + 10, 24, 12);

      // Draw Lasers
      ctx.fillStyle = "#22c55e"; // Green plasma lasers
      state.lasers.forEach((l) => ctx.fillRect(l.x, l.y, l.width, l.height));

      // Draw Red Army Clones
      state.enemies.forEach((e) => {
        ctx.fillStyle = "#ef4444"; // Red Army Coats
        ctx.fillRect(e.x, e.y, e.width, e.height);
        ctx.fillStyle = "#facc15"; // Yellow Tord-style hair accent
        ctx.fillRect(e.x + 5, e.y, e.width - 10, 10);
      });

      // Draw Explosions
      ctx.strokeStyle = "#f97316";
      state.explosions.forEach((exp) => {
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-mono select-none">
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-bold text-blue-500 tracking-wider">WTFUTURE: TOM'S ESCAPE</h1>
        <p className="text-gray-400 text-sm">Controls: A/D or Left/Right to Move | Spacebar to Shoot</p>
      </div>

      {gameState === "PLAYING" && (
        <div className="w-[500px] flex justify-between bg-zinc-900 p-3 rounded-t-lg border-x border-t border-zinc-700">
          <div>HP: <span className="text-red-500">{"❤️".repeat(hp)}</span></div>
          <div>Score: <span className="text-yellow-400">{score}</span></div>
          <div className="w-1/3 bg-zinc-800 rounded h-6 relative overflow-hidden">
            <div className="bg-red-600 h-full transition-all duration-100" style={{ width: `${(distance / TARGET_DISTANCE) * 100}%` }}></div>
            <span className="absolute inset-0 text-xs flex items-center justify-center text-white">Base Progress</span>
          </div>
        </div>
      )}

      <div className="relative border-4 border-zinc-700 rounded-b-lg shadow-2xl shadow-blue-900/30">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="block" />

        {gameState === "START" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-2xl text-blue-400 font-bold mb-2">Help Tom reach the Red Army Base!</h2>
            <p className="text-gray-400 text-sm max-w-sm mb-6">Avoid getting shot or rammed by Tord's Red Army clones. 3 hits and you lose.</p>
            <button onClick={startGame} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-lg font-bold transition">START MISSION</button>
          </div>
        )}

        {gameState === "WON" && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center">
            <h2 className="text-4xl text-green-500 font-bold mb-2">MISSION SUCCESS</h2>
            <p className="text-xl mb-6">Tom made it safely to the Base!</p>
            <p className="text-gray-400 mb-6">Final Score: {score}</p>
            <button onClick={startGame} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 px-6 py-2 rounded">Play Again</button>
          </div>
        )}

        {gameState === "LOST" && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-center">
            <h2 className="text-4xl text-red-600 font-bold mb-2">TOM WAS DEFEATED</h2>
            <p className="text-gray-400 text-sm max-w-xs mb-6">The app will now close due to system damage.</p>
            <span className="text-xs text-zinc-600 animate-pulse">Closing window...</span>
          </div>
        )}
      </div>
    </div>
  );
}
