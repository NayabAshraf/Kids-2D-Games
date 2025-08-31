import React, { useCallback, useEffect, useRef, useState } from "react";

// Define types
type GameState = "waiting" | "playing" | "paused" | "gameOver";
type BalloonType = "NORMAL" | "BOMB" | "GOLDEN" | "SPEED" | "LIFE";
type Balloon = {
    x: number;
    y: number;
    color: string;
    text: string;
    popped: boolean;
    type: BalloonType;
    speed: number;
};
type PopEffect = {
    x: number;
    y: number;
    visible: boolean;
    type: BalloonType;
};
type PowerUpType = "SPEED" | null;

// Constants
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const BALLOON_RADIUS = 30;
const BALLOON_SPEED = 2;
const BALLOON_SPAWN_INTERVAL = 1500; // ms
const INITIAL_LIVES = 3;

const randomColor = (): string => {
    const colors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#FF9F1C", "#C44569", "#5B6DEC", "#F368E0", "#00D2D3"];
    return colors[Math.floor(Math.random() * colors.length)];
};

const randomLetterOrNumber = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return chars[Math.floor(Math.random() * chars.length)];
};

// Balloon types with different properties
const BALLOON_TYPES = {
    NORMAL: { probability: 0.55, score: 1, speed: BALLOON_SPEED, color: "", text: "" },
    BOMB: { probability: 0.2, score: -5, speed: BALLOON_SPEED * 1.2, color: "#333333", text: "💣" },
    GOLDEN: { probability: 0.1, score: 5, speed: BALLOON_SPEED * 0.8, color: "#FFD700", text: "💰" },
    SPEED: { probability: 0.1, score: 2, speed: BALLOON_SPEED * 1.5, color: "#FF00FF", text: "⚡" },
    LIFE: { probability: 0.05, score: 0, speed: BALLOON_SPEED, color: "#FF0000", text: "❤️" }
};

// Helper function to get random balloon type based on probabilities
const getRandomBalloonType = (): BalloonType => {
    const rand = Math.random();
    let cumulative = 0;

    for (const [type, props] of Object.entries(BALLOON_TYPES)) {
        cumulative += props.probability;
        if (rand <= cumulative) {
            return type as BalloonType;
        }
    }

    return "NORMAL"; // fallback
};

// Helper function to draw clouds
const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void => {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x + size * 1.5, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 1.2, y + size * 0.3, size * 0.9, 0, Math.PI * 2);
    ctx.fill();
};

export default function BalloonPopGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<GameState>("waiting");
    const [score, setScore] = useState<number>(0);
    const [lives, setLives] = useState<number>(INITIAL_LIVES);
    const [highScore, setHighScore] = useState<number>(() =>
        parseInt(localStorage.getItem("balloon-highScore") || "0", 10)
    );
    const [popEffect, setPopEffect] = useState<PopEffect>({ x: 0, y: 0, visible: false, type: "NORMAL" });
    const [combo, setCombo] = useState<number>(0);
    const [comboTimer, setComboTimer] = useState<number>(0);
    const [activePowerUp, setActivePowerUp] = useState<PowerUpType>(null);
    const [powerUpTimer, setPowerUpTimer] = useState<number>(0);

    const balloonsRef = useRef<Balloon[]>([]);
    const scoreRef = useRef<number>(0);
    const livesRef = useRef<number>(INITIAL_LIVES);
    const comboRef = useRef<number>(0);
    const comboTimerRef = useRef<number>(0);
    const activePowerUpRef = useRef<PowerUpType>(null);
    const powerUpTimerRef = useRef<number>(0);
    const gameStateRef = useRef<GameState>(gameState);
    const animationRef = useRef<number | null>(null);

    const spawnBalloon = useCallback((): void => {
        const x = Math.random() * (CANVAS_WIDTH - BALLOON_RADIUS * 2) + BALLOON_RADIUS;
        const type = getRandomBalloonType();
        const typeProps = BALLOON_TYPES[type];

        balloonsRef.current.push({
            x,
            y: CANVAS_HEIGHT + BALLOON_RADIUS,
            color: typeProps.color || randomColor(),
            text: typeProps.text || randomLetterOrNumber(),
            popped: false,
            type,
            speed: typeProps.speed
        });
    }, []);

    const draw = useCallback((): void => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Background with fun gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, "#1E40AF");
        gradient.addColorStop(0.5, "#7E22CE");
        gradient.addColorStop(1, "#BE185D");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw decorative clouds
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        drawCloud(ctx, 50, 80, 20);
        drawCloud(ctx, 300, 120, 25);
        drawCloud(ctx, 150, 180, 30);
        drawCloud(ctx, 350, 250, 22);

        // Balloons with glow effect
        balloonsRef.current.forEach((b) => {
            if (b.popped) return;

            // Balloon string
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y + BALLOON_RADIUS);
            ctx.lineTo(b.x, b.y + BALLOON_RADIUS + 40);
            ctx.stroke();

            // Special outline for special balloons
            if (b.type !== "NORMAL") {
                ctx.strokeStyle = "#FFFFFF";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(b.x, b.y, BALLOON_RADIUS + 2, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Balloon glow
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.fillStyle = b.color;
            ctx.arc(b.x, b.y, BALLOON_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            // Balloon highlight
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.arc(b.x - BALLOON_RADIUS / 3, b.y - BALLOON_RADIUS / 3, BALLOON_RADIUS / 3, 0, Math.PI * 2);
            ctx.fill();

            // Text inside
            ctx.fillStyle = "white";
            ctx.font = "bold 24px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(b.text, b.x, b.y);
        });

        // Pop effect animation
        if (popEffect.visible) {
            let effectColor: string;
            switch (popEffect.type) {
                case "BOMB": effectColor = "#FF0000"; break;
                case "GOLDEN": effectColor = "#FFD700"; break;
                case "SPEED": effectColor = "#00FF00"; break;
                case "LIFE": effectColor = "#FF69B4"; break;
                default: effectColor = "#FFA500";
            }

            ctx.fillStyle = effectColor;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(popEffect.x, popEffect.y, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Score display with fun style
        ctx.shadowColor = "#FFD700";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 32px 'Comic Sans MS', cursive, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`Score: ${scoreRef.current}`, CANVAS_WIDTH / 2, 40);

        // Combo display
        if (comboRef.current > 1) {
            ctx.fillStyle = "#FF69B4";
            ctx.font = "bold 24px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText(`Combo: x${comboRef.current}`, CANVAS_WIDTH / 2, 70);
        }

        // Active power-up display
        if (activePowerUpRef.current) {
            ctx.fillStyle = "#00FF00";
            ctx.font = "bold 20px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText(`${activePowerUpRef.current} Power-Up: ${Math.ceil(powerUpTimerRef.current / 1000)}s`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
        }

        ctx.shadowBlur = 0;

        // Lives display
        for (let i = 0; i < livesRef.current; i++) {
            ctx.fillStyle = "#FF0000";
            ctx.beginPath();
            ctx.arc(30 + i * 30, 40, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        // Waiting screen with ASH TECH Game Space
        if (gameStateRef.current === "waiting") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.fillStyle = "#FF9E00";
            ctx.font = "bold 28px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("ASH TECH Game Space", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

            // Draw "Tap to start playing" text with animation
            ctx.fillStyle = "#4DFF94";
            ctx.font = "bold 24px 'Comic Sans MS', cursive, sans-serif";
            const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
            ctx.setTransform(scale, 0, 0, scale, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
            ctx.fillText("Tap to start playing", 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Game over overlay
        if (gameStateRef.current === "gameOver") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.fillStyle = "#FF9E00";
            ctx.font = "36px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

            ctx.fillStyle = "#4DFF94";
            ctx.font = "24px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText(`Score: ${scoreRef.current}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

            ctx.fillStyle = "#FF6B6B";
            ctx.font = "20px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText(`High Score: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);

            // Add "Tap to play again" text
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "18px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText("Tap anywhere to play again", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 90);
        }

        // Paused overlay
        if (gameStateRef.current === "paused") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "36px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        }
    }, [popEffect, highScore]);

    const update = useCallback((): void => {
        if (gameStateRef.current !== "playing") return;

        // Update combo timer
        if (comboTimerRef.current > 0) {
            comboTimerRef.current -= 16; // approx 16ms per frame
            if (comboTimerRef.current <= 0) {
                comboRef.current = 0;
                setCombo(0);
            }
        }

        // Update power-up timer
        if (powerUpTimerRef.current > 0) {
            powerUpTimerRef.current -= 16;
            setPowerUpTimer(powerUpTimerRef.current);
            if (powerUpTimerRef.current <= 0) {
                activePowerUpRef.current = null;
                setActivePowerUp(null);
            }
        }

        // Move balloons upward
        balloonsRef.current.forEach((b) => {
            if (!b.popped) {
                // Apply speed power-up if active
                const speedMultiplier = activePowerUpRef.current === "SPEED" ? 0.5 : 1;
                b.y -= b.speed * speedMultiplier;

                // Check if balloon escaped (reached top)
                if (b.y + BALLOON_RADIUS < 0 && !b.popped) {
                    b.popped = true;
                    if (b.type !== "BOMB") {
                        livesRef.current -= 1;
                        setLives(livesRef.current);

                        if (livesRef.current <= 0) {
                            setGameState("gameOver");
                            gameStateRef.current = "gameOver";
                        }
                    }
                }
            }
        });

        // Remove off-screen or popped balloons
        balloonsRef.current = balloonsRef.current.filter(
            (b) => b.y + BALLOON_RADIUS > 0 && !b.popped
        );
    }, []);

    const gameLoop = useCallback((): void => {
        update();
        draw();
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [update, draw]);

    useEffect(() => {
        animationRef.current = requestAnimationFrame(gameLoop);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [gameLoop]);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Spawn balloons while playing
    useEffect(() => {
        if (gameState !== "playing") return;
        const spawnInterval = setInterval(spawnBalloon, BALLOON_SPAWN_INTERVAL);
        return () => clearInterval(spawnInterval);
    }, [gameState, spawnBalloon]);

    const handleBalloonPop = (balloon: Balloon, points: number): void => {
        balloon.popped = true;
        scoreRef.current += points;
        setScore(scoreRef.current);
        setPopEffect({ x: balloon.x, y: balloon.y, visible: true, type: balloon.type });

        // Update combo
        if (points > 0) {
            comboRef.current += 1;
            setCombo(comboRef.current);
            comboTimerRef.current = 2000; // 2 seconds to continue combo
            setComboTimer(2000);
        } else {
            comboRef.current = 0;
            setCombo(0);
        }

        if (scoreRef.current > highScore) {
            setHighScore(scoreRef.current);
            localStorage.setItem(
                "balloon-highScore",
                String(scoreRef.current)
            );
        }

        // Hide pop effect after a short time
        setTimeout(() => {
            setPopEffect(prev => ({ ...prev, visible: false }));
        }, 200);
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
        if (gameStateRef.current === "waiting") {
            startGame();
            return;
        }

        if (gameStateRef.current === "gameOver") {
            startGame();
            return;
        }

        if (gameStateRef.current !== "playing") return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        balloonsRef.current.forEach((b) => {
            if (!b.popped) {
                const dx = mouseX - b.x;
                const dy = mouseY - b.y;
                if (dx * dx + dy * dy <= BALLOON_RADIUS * BALLOON_RADIUS) {
                    const typeProps = BALLOON_TYPES[b.type];
                    let points = typeProps.score;

                    // Apply combo multiplier to positive points
                    if (points > 0) {
                        points *= comboRef.current > 1 ? comboRef.current : 1;
                    }

                    handleBalloonPop(b, points);

                    // Handle special balloon effects
                    if (b.type === "BOMB") {
                        // Bomb reduces lives
                        livesRef.current -= 1;
                        setLives(livesRef.current);

                        if (livesRef.current <= 0) {
                            setGameState("gameOver");
                            gameStateRef.current = "gameOver";
                        }
                    } else if (b.type === "LIFE") {
                        // Life balloon adds a life
                        livesRef.current = Math.min(livesRef.current + 1, 5);
                        setLives(livesRef.current);
                    } else if (b.type === "SPEED") {
                        // Speed power-up slows down balloons
                        activePowerUpRef.current = "SPEED";
                        setActivePowerUp("SPEED");
                        powerUpTimerRef.current = 5000; // 5 seconds
                        setPowerUpTimer(5000);
                    }
                }
            }
        });
    };

    const handleTouch = (e: React.TouchEvent<HTMLCanvasElement>): void => {
        if (gameStateRef.current !== "playing") return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        balloonsRef.current.forEach((b) => {
            if (!b.popped) {
                const dx = touchX - b.x;
                const dy = touchY - b.y;
                if (dx * dx + dy * dy <= BALLOON_RADIUS * BALLOON_RADIUS) {
                    const typeProps = BALLOON_TYPES[b.type];
                    let points = typeProps.score;

                    // Apply combo multiplier to positive points
                    if (points > 0) {
                        points *= comboRef.current > 1 ? comboRef.current : 1;
                    }

                    handleBalloonPop(b, points);

                    // Handle special balloon effects
                    if (b.type === "BOMB") {
                        // Bomb reduces lives
                        livesRef.current -= 1;
                        setLives(livesRef.current);

                        if (livesRef.current <= 0) {
                            setGameState("gameOver");
                            gameStateRef.current = "gameOver";
                        }
                    } else if (b.type === "LIFE") {
                        // Life balloon adds a life
                        livesRef.current = Math.min(livesRef.current + 1, 5);
                        setLives(livesRef.current);
                    } else if (b.type === "SPEED") {
                        // Speed power-up slows down balloons
                        activePowerUpRef.current = "SPEED";
                        setActivePowerUp("SPEED");
                        powerUpTimerRef.current = 5000; // 5 seconds
                        setPowerUpTimer(5000);
                    }
                }
            }
        });
    };

    const startGame = (): void => {
        balloonsRef.current = [];
        scoreRef.current = 0;
        livesRef.current = INITIAL_LIVES;
        comboRef.current = 0;
        comboTimerRef.current = 0;
        activePowerUpRef.current = null;
        powerUpTimerRef.current = 0;
        setScore(0);
        setLives(INITIAL_LIVES);
        setCombo(0);
        setComboTimer(0);
        setActivePowerUp(null);
        setPowerUpTimer(0);
        setGameState("playing");
        gameStateRef.current = "playing";
    };

    const togglePause = (): void => {
        if (gameState === "playing") {
            setGameState("paused");
            gameStateRef.current = "paused";
        } else if (gameState === "paused") {
            setGameState("playing");
            gameStateRef.current = "playing";
        }
    };

    const resetGame = (): void => {
        setGameState("waiting");
        gameStateRef.current = "waiting";
        balloonsRef.current = [];
        scoreRef.current = 0;
        livesRef.current = INITIAL_LIVES;
        comboRef.current = 0;
        comboTimerRef.current = 0;
        activePowerUpRef.current = null;
        powerUpTimerRef.current = 0;
        setScore(0);
        setLives(INITIAL_LIVES);
        setCombo(0);
        setComboTimer(0);
        setActivePowerUp(null);
        setPowerUpTimer(0);
        draw();
    };

    useEffect(() => {
        draw();
    }, [draw]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 flex flex-col items-center justify-center p-4 overflow-hidden">
            {/* Animated floating balloons in background */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-12 h-16 rounded-full opacity-20"
                        style={{
                            left: `${10 + (i * 12)}%`,
                            top: `${15 + (i * 5)}%`,
                            background: randomColor(),
                            animation: `float ${15 + i * 2}s infinite ease-in-out`,
                            animationDelay: `${i * 0.5}s`
                        }}
                    />
                ))}
            </div>

            <div className="flex flex-col items-center space-y-6 p-8 rounded-3xl bg-gray-900 bg-opacity-70 backdrop-blur-md border-2 border-purple-500 shadow-2xl max-w-md w-full relative z-10">
                {/* Game Title with animation */}
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-blue-400 animate-pulse">
                    Balloon Pop!
                </h1>

                {/* Canvas */}
                <div className="relative rounded-2xl overflow-hidden border-4 border-purple-400 shadow-inner">
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="block cursor-crosshair"
                        onClick={handleCanvasClick}
                        onTouchStart={handleTouch}
                    />
                </div>

                {/* Controls */}
                <div className="flex gap-4 flex-wrap justify-center">
                    {(gameState === "playing" || gameState === "paused") && (
                        <>
                            <button
                                onClick={togglePause}
                                className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 text-lg"
                            >
                                {gameState === "playing" ? "⏸️ Pause" : "▶️ Resume"}
                            </button>
                            <button
                                onClick={resetGame}
                                className="px-6 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white font-medium rounded-xl shadow-md hover:from-red-700 hover:to-pink-700 transition-all transform hover:scale-105 text-lg"
                            >
                                🔄 Reset
                            </button>
                        </>
                    )}
                </div>

                {/* Score Display at Bottom */}
                {gameState === "playing" && (
                    <div className="flex justify-between w-full text-center bg-purple-900 bg-opacity-70 p-5 rounded-2xl border-2 border-purple-400">
                        <div className="flex-1">
                            <div className="text-lg text-yellow-300 mb-2">Score</div>
                            <div className="text-4xl font-bold text-green-300 drop-shadow-md">{score}</div>
                        </div>
                        <div className="flex-1">
                            <div className="text-lg text-yellow-300 mb-2">High Score</div>
                            <div className="text-4xl font-bold text-pink-300 drop-shadow-md">{highScore}</div>
                        </div>
                        <div className="flex-1">
                            <div className="text-lg text-yellow-300 mb-2">Lives</div>
                            <div className="text-4xl font-bold text-red-300 drop-shadow-md">{lives}</div>
                        </div>
                    </div>
                )}

                {/* Combo Display */}
                {combo > 1 && (
                    <div className="text-center bg-yellow-900 bg-opacity-70 p-3 rounded-2xl border-2 border-yellow-400">
                        <div className="text-lg text-yellow-300 mb-1">Combo Multiplier</div>
                        <div className="text-3xl font-bold text-yellow-200 drop-shadow-md">x{combo}</div>
                    </div>
                )}

                {/* Active Power-up Display */}
                {activePowerUp && (
                    <div className="text-center bg-green-900 bg-opacity-70 p-3 rounded-2xl border-2 border-green-400">
                        <div className="text-lg text-green-300 mb-1">Active Power-up</div>
                        <div className="text-2xl font-bold text-green-200 drop-shadow-md">
                            {activePowerUp} ({Math.ceil(powerUpTimer / 1000)}s)
                        </div>
                    </div>
                )}

                {/* Instructions */}
                {gameState === "playing" && (
                    <div className="text-center text-lg text-yellow-200 bg-blue-900 bg-opacity-50 p-4 rounded-2xl border border-blue-400">
                        <p className="mb-2">🎈 Click or tap balloons to pop them! 🎈</p>
                        <p className="mb-2">💣 Avoid black bombs! ❤️ Collect hearts for extra lives!</p>
                        <p className="mb-2">💰 Golden balloons = 5 points! ⚡ Speed balloons = slow power-up!</p>
                        <p>🏆 Try to get the highest score! 🏆</p>
                    </div>
                )}
            </div>



        </div>
    );
}