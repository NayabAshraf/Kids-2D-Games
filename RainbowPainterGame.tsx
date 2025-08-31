import React, { useCallback, useEffect, useRef, useState } from "react";

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 60;
const PAINT_BLOB_SIZE = 30;
const PAINT_SPEED = 3;
const PAINT_SPAWN_INTERVAL = 1200;
const PLAYER_SPEED = 6;
const GAME_DURATION = 60000; // 60 seconds

const paintColors = [
    "#FF6B6B", "#4ECDC4", "#FFE66D", "#FF9F1C",
    "#C44569", "#5B6DEC", "#F368E0", "#00D2D3"
];

const colorNames: Record<string, string> = {
    "#FF6B6B": "Red",
    "#4ECDC4": "Teal",
    "#FFE66D": "Yellow",
    "#FF9F1C": "Orange",
    "#C44569": "Pink",
    "#5B6DEC": "Blue",
    "#F368E0": "Magenta",
    "#00D2D3": "Cyan"
};

interface PaintSplat {
    x: number;
    y: number;
    color: string;
    size: number;
}

interface PaintBlob {
    x: number;
    y: number;
    color: string;
    collected: boolean;
    special: boolean;
}

interface SpecialEffect {
    x: number;
    y: number;
    color: string;
    size: number;
    alpha: number;
}

interface Position {
    x: number;
    y: number;
}

export default function RainbowPainterGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<string>("waiting");
    const [score, setScore] = useState<number>(0);
    const [currentColor, setCurrentColor] = useState<string | null>(null);
    const [paintSplats, setPaintSplats] = useState<PaintSplat[]>([]);
    const [showTutorial, setShowTutorial] = useState<boolean>(true);
    const [timeLeft, setTimeLeft] = useState<number>(GAME_DURATION / 1000);
    const [targetColor, setTargetColor] = useState<string | null>(null);
    const [combo, setCombo] = useState<number>(0);
    const [maxCombo, setMaxCombo] = useState<number>(0);
    const [specialEffects, setSpecialEffects] = useState<SpecialEffect[]>([]);
    const [isMobile, setIsMobile] = useState<boolean>(false);

    const playerRef = useRef<Position>({ x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - PLAYER_SIZE - 10 });
    const paintBlobsRef = useRef<PaintBlob[]>([]);
    const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
    const animationRef = useRef<number>(0);
    const gameStateRef = useRef<string>(gameState);
    const timeLeftRef = useRef<number>(GAME_DURATION / 1000);
    const targetColorRef = useRef<string | null>(null);
    const touchStartX = useRef<number>(0);
    const touchStartTime = useRef<number>(0);

    // Check if device is mobile
    useEffect(() => {
        const checkIsMobile = (): boolean => {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        };
        setIsMobile(checkIsMobile());
    }, []);

    // Initialize game
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") keysRef.current.left = true;
            if (e.key === "ArrowRight") keysRef.current.right = true;
            if (e.key === " ") {
                if (gameStateRef.current === "playing" && currentColor) {
                    firePaintball();
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") keysRef.current.left = false;
            if (e.key === "ArrowRight") keysRef.current.right = false;
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [currentColor]);

    // Handle touch events for mobile
    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (gameStateRef.current !== "playing") return;

        const touch = e.touches[0];
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        // Check if touch is on the canvas area for painting
        if (touchX > 50 && touchX < CANVAS_WIDTH - 50 && touchY > 50 && touchY < 350) {
            if (currentColor) {
                handleCanvasClick({ clientX: touch.clientX, clientY: touch.clientY });
            }
            return;
        }

        // Otherwise, treat as movement control
        touchStartX.current = touch.clientX;
        touchStartTime.current = Date.now();
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (gameStateRef.current !== "playing") return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX.current;

        // Move player based on touch movement
        const player = playerRef.current;
        player.x += deltaX * 0.8;

        // Keep player within bounds
        if (player.x < 0) player.x = 0;
        if (player.x > CANVAS_WIDTH - PLAYER_SIZE) player.x = CANVAS_WIDTH - PLAYER_SIZE;

        touchStartX.current = touch.clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (gameStateRef.current !== "playing") return;

        // Check if it was a tap (short duration) for firing paintball
        const tapDuration = Date.now() - touchStartTime.current;
        if (tapDuration < 300 && currentColor) {
            firePaintball();
        }
    };

    // Helper function to draw a star
    const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    };

    // Helper function to draw a heart
    const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(
            x, y - size / 2,
            x - size, y - size / 2,
            x - size, y
        );
        ctx.bezierCurveTo(
            x - size, y + size / 2,
            x, y + size,
            x, y
        );
        ctx.bezierCurveTo(
            x, y + size,
            x + size, y + size / 2,
            x + size, y
        );
        ctx.bezierCurveTo(
            x + size, y - size / 2,
            x, y - size / 2,
            x, y
        );
        ctx.fill();
    };

    // Helper function to draw unicorn
    const drawUnicorn = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string | null) => {
        // Body
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.ellipse(x + size / 2, y + size / 2, size / 2, size / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 3, size / 3, 0, Math.PI * 2);
        ctx.fill();

        // Horn
        if (color) {
            ctx.fillStyle = color;
        } else {
            ctx.fillStyle = "#FFD700";
        }
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y + size / 4);
        ctx.lineTo(x + size / 2 - 5, y + size / 6);
        ctx.lineTo(x + size / 2 + 5, y + size / 6);
        ctx.closePath();
        ctx.fill();

        // Legs
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(x + size / 4, y + size / 1.5, size / 10, size / 3);
        ctx.fillRect(x + size / 1.5, y + size / 1.5, size / 10, size / 3);

        // Eye
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(x + size / 1.8, y + size / 3, size / 20, 0, Math.PI * 2);
        ctx.fill();

        // Eye sparkle
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(x + size / 1.85, y + size / 3.1, size / 40, 0, Math.PI * 2);
        ctx.fill();

        // Mane and tail
        if (color) {
            ctx.fillStyle = color;
        } else {
            ctx.fillStyle = "#FFC0CB";
        }
        ctx.beginPath();
        ctx.arc(x + size / 3, y + size / 3, size / 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x + size / 1.2, y + size / 1.3, size / 8, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + size / 1.7, y + size / 2.5, size / 10, 0, Math.PI);
        ctx.stroke();
    };

    // Helper function to draw colorful shapes
    const drawColorfulShapes = (ctx: CanvasRenderingContext2D) => {
        // Draw stars
        ctx.fillStyle = "#FFE66D";
        drawStar(ctx, 50, 80, 5, 10, 5);
        drawStar(ctx, 350, 120, 5, 8, 4);
        drawStar(ctx, 150, 180, 5, 12, 6);

        // Draw hearts
        ctx.fillStyle = "#FF6B6B";
        drawHeart(ctx, 300, 200, 15);
        drawHeart(ctx, 100, 250, 12);

        // Draw circles
        ctx.fillStyle = "#5B6DEC";
        ctx.beginPath();
        ctx.arc(250, 80, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#F368E0";
        ctx.beginPath();
        ctx.arc(180, 130, 12, 0, Math.PI * 2);
        ctx.fill();
    };

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // New vibrant background with gradient
        const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        gradient.addColorStop(0, "#FF9EAA"); // Soft pink
        gradient.addColorStop(0.3, "#A2D2FF"); // Light blue
        gradient.addColorStop(0.6, "#BDE0FE"); // Pale blue
        gradient.addColorStop(1, "#FFAFCC"); // Pink
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw decorative elements - colorful shapes instead of clouds
        drawColorfulShapes(ctx);

        // Draw canvas background with frame
        ctx.fillStyle = "#F0D9B5";
        ctx.fillRect(40, 40, CANVAS_WIDTH - 80, 320);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(50, 50, CANVAS_WIDTH - 100, 300);
        ctx.strokeStyle = "#8B4513";
        ctx.lineWidth = 5;
        ctx.strokeRect(45, 45, CANVAS_WIDTH - 90, 310);

        // Draw paint splats on canvas
        paintSplats.forEach(splat => {
            ctx.fillStyle = splat.color;
            ctx.beginPath();
            ctx.arc(splat.x, splat.y, splat.size, 0, Math.PI * 2);
            ctx.fill();

            // Add some texture to the paint
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.beginPath();
            ctx.arc(splat.x - splat.size / 3, splat.y - splat.size / 3, splat.size / 4, 0, Math.PI * 2);
            ctx.fill();

            // Add splatter effect
            ctx.fillStyle = splat.color;
            for (let i = 0; i < 3; i++) {
                const angle = Math.PI * 2 * (i / 3);
                const dist = splat.size * 0.7;
                ctx.beginPath();
                ctx.arc(
                    splat.x + Math.cos(angle) * dist,
                    splat.y + Math.sin(angle) * dist,
                    splat.size / 3,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        });

        // Draw falling paint blobs with trail effect
        paintBlobsRef.current.forEach(blob => {
            // Draw trail
            for (let i = 0; i < 3; i++) {
                const alpha = 0.3 - (i * 0.1);
                ctx.fillStyle = blob.color.replace(")", `, ${alpha})`).replace("rgb", "rgba");
                ctx.beginPath();
                ctx.arc(blob.x, blob.y + (i * 5), PAINT_BLOB_SIZE * (1 - i * 0.2), 0, Math.PI * 2);
                ctx.fill();
            }

            // Main blob
            ctx.fillStyle = blob.color;
            ctx.beginPath();
            ctx.arc(blob.x, blob.y, PAINT_BLOB_SIZE, 0, Math.PI * 2);
            ctx.fill();

            // Add highlight to paint blob
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.beginPath();
            ctx.arc(blob.x - PAINT_BLOB_SIZE / 3, blob.y - PAINT_BLOB_SIZE / 3, PAINT_BLOB_SIZE / 3, 0, Math.PI * 2);
            ctx.fill();

            // Draw paint type indicator
            if (blob.special) {
                ctx.fillStyle = "#FFD700";
                ctx.beginPath();
                ctx.arc(blob.x, blob.y - PAINT_BLOB_SIZE - 5, 8, 0, Math.PI * 2);
                ctx.fill();

                // Add sparkle effect to special paints
                ctx.fillStyle = "#FFFFFF";
                ctx.beginPath();
                ctx.arc(blob.x + 10, blob.y - PAINT_BLOB_SIZE - 10, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Draw player (unicorn)
        const player = playerRef.current;
        drawUnicorn(ctx, player.x, player.y, PLAYER_SIZE, currentColor);

        // Draw current color indicator
        if (currentColor) {
            ctx.fillStyle = currentColor;
            ctx.beginPath();
            ctx.arc(player.x + PLAYER_SIZE / 2, player.y - 25, 18, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw paint brush
            ctx.fillStyle = "#8B4513";
            ctx.fillRect(player.x + PLAYER_SIZE / 2 - 2, player.y - 45, 4, 25);
            ctx.fillStyle = "#C4C4C4";
            ctx.fillRect(player.x + PLAYER_SIZE / 2 - 5, player.y - 50, 10, 5);
        }

        // Draw special effects
        specialEffects.forEach(effect => {
            ctx.globalAlpha = effect.alpha;
            ctx.fillStyle = effect.color;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        // Draw score and time
        ctx.fillStyle = "#5E17EB";
        ctx.font = "bold 24px 'Comic Sans MS', cursive, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Score: ${score}`, 20, CANVAS_HEIGHT - 20);

        ctx.textAlign = "right";
        ctx.fillText(`Time: ${timeLeft}s`, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);

        // Draw combo
        if (combo > 1) {
            ctx.fillStyle = "#FFD700";
            ctx.textAlign = "center";
            ctx.font = "bold 28px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText(`Combo x${combo}!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
        }

        // Draw target color if active
        if (targetColor) {
            ctx.fillStyle = "#5E17EB";
            ctx.font = "bold 20px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`Paint with: ${colorNames[targetColor]}`, CANVAS_WIDTH / 2, 35);

            ctx.fillStyle = targetColor;
            ctx.beginPath();
            ctx.arc(CANVAS_WIDTH / 2, 20, 10, 0, Math.PI * 2);
            ctx.fill();

            // Add pulsing effect to target indicator
            ctx.strokeStyle = targetColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(CANVAS_WIDTH / 2, 20, 12 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw mobile controls if on mobile
        if (isMobile && gameStateRef.current === "playing") {
            // Draw left and right touch areas
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = "#4ECDC4";
            ctx.fillRect(0, CANVAS_HEIGHT - 100, 100, 100);

            ctx.fillStyle = "#FF6B6B";
            ctx.fillRect(CANVAS_WIDTH - 100, CANVAS_HEIGHT - 100, 100, 100);

            ctx.globalAlpha = 1;
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 16px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("←", 50, CANVAS_HEIGHT - 50);
            ctx.fillText("→", CANVAS_WIDTH - 50, CANVAS_HEIGHT - 50);
        }

        // Draw waiting screen with tap to start
        if (gameStateRef.current === "waiting") {
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.fillStyle = "#5E17EB";
            ctx.font = "bold 28px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("ASH TECH Game Space", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

            // Draw "Tap to start playing" text with animation
            ctx.fillStyle = "#FF6B6B";
            ctx.font = "bold 24px 'Comic Sans MS', cursive, sans-serif";
            const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
            ctx.setTransform(scale, 0, 0, scale, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
            ctx.fillText("Tap to start playing", 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Game over screen
        if (gameStateRef.current === "gameOver") {
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.fillStyle = "#FF6B6B";
            ctx.font = "36px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("ART MASTERPIECE COMPLETE!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

            ctx.fillStyle = "#5E17EB";
            ctx.font = "28px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

            ctx.fillStyle = "#FF9F1C";
            ctx.fillText(`Max Combo: x${maxCombo}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

            ctx.fillStyle = "#4ECDC4";
            ctx.font = "20px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText("Tap anywhere to play again", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
        }
    }, [paintSplats, score, currentColor, timeLeft, targetColor, combo, maxCombo, specialEffects, isMobile, gameState]);

    const update = useCallback(() => {
        if (gameStateRef.current !== "playing") return;

        // Update time
        timeLeftRef.current -= 1 / 60; // Assuming 60fps
        setTimeLeft(Math.ceil(timeLeftRef.current));

        if (timeLeftRef.current <= 0) {
            setGameState("gameOver");
            gameStateRef.current = "gameOver";
            return;
        }

        // Update special effects
        setSpecialEffects(prev =>
            prev.filter(effect => effect.alpha > 0.1)
                .map(effect => ({ ...effect, alpha: effect.alpha * 0.95, size: effect.size * 1.05 }))
        );

        // Move player based on keyboard input
        const player = playerRef.current;
        if (keysRef.current.left && player.x > 0) {
            player.x -= PLAYER_SPEED;
        }
        if (keysRef.current.right && player.x < CANVAS_WIDTH - PLAYER_SIZE) {
            player.x += PLAYER_SPEED;
        }

        // Move paint blobs downward
        paintBlobsRef.current.forEach(blob => {
            blob.y += PAINT_SPEED;
        });

        // Check for collisions between player and paint blobs
        paintBlobsRef.current.forEach(blob => {
            const player = playerRef.current;
            if (
                blob.y + PAINT_BLOB_SIZE > player.y &&
                blob.y - PAINT_BLOB_SIZE < player.y + PLAYER_SIZE &&
                blob.x + PAINT_BLOB_SIZE > player.x &&
                blob.x - PAINT_BLOB_SIZE < player.x + PLAYER_SIZE
            ) {
                blob.collected = true;
                setCurrentColor(blob.color);

                // Add special effect
                setSpecialEffects(prev => [
                    ...prev,
                    { x: blob.x, y: blob.y, color: blob.color, size: 10, alpha: 1 }
                ]);

                // Score points
                let points = 5;
                if (blob.special) points = 15;
                if (targetColorRef.current === blob.color) points *= 2;

                setScore(prev => prev + points);

                // Handle combo
                if (blob.special) {
                    setCombo(prev => {
                        const newCombo = prev + 1;
                        if (newCombo > maxCombo) setMaxCombo(newCombo);
                        return newCombo;
                    });
                } else {
                    setCombo(0);
                }
            }
        });

        // Remove collected or off-screen paint blobs
        paintBlobsRef.current = paintBlobsRef.current.filter(
            blob => !blob.collected && blob.y - PAINT_BLOB_SIZE < CANVAS_HEIGHT
        );

        // Occasionally set a target color
        if (Math.random() < 0.01 && !targetColorRef.current) {
            const newTarget = paintColors[Math.floor(Math.random() * paintColors.length)];
            setTargetColor(newTarget);
            targetColorRef.current = newTarget;

            // Clear target after some time
            setTimeout(() => {
                setTargetColor(null);
                targetColorRef.current = null;
            }, 5000);
        }
    }, [maxCombo]);

    const gameLoop = useCallback(() => {
        update();
        draw();
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [update, draw]);

    useEffect(() => {
        animationRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationRef.current);
    }, [gameLoop]);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Spawn paint blobs while playing
    useEffect(() => {
        if (gameState !== "playing") return;

        const spawnPaint = () => {
            const x = Math.random() * (CANVAS_WIDTH - PAINT_BLOB_SIZE * 2) + PAINT_BLOB_SIZE;
            const color = paintColors[Math.floor(Math.random() * paintColors.length)];
            const special = Math.random() < 0.2; // 20% chance for special paint

            paintBlobsRef.current.push({
                x,
                y: -PAINT_BLOB_SIZE,
                color,
                collected: false,
                special
            });
        };

        const spawnInterval = setInterval(spawnPaint, PAINT_SPAWN_INTERVAL);
        return () => clearInterval(spawnInterval);
    }, [gameState]);

    const firePaintball = () => {
        if (!currentColor) return;

        const player = playerRef.current;
        const targetX = 50 + Math.random() * (CANVAS_WIDTH - 100);
        const targetY = 50 + Math.random() * 300;

        setPaintSplats(prev => [
            ...prev,
            {
                x: targetX,
                y: targetY,
                color: currentColor,
                size: 15 + Math.random() * 15
            }
        ]);

        // Score points
        let points = 10;
        if (targetColorRef.current === currentColor) points = 25;

        setScore(prev => prev + points);
        setCurrentColor(null);
    };

    const handleCanvasClick = (e: { clientX: number; clientY: number }) => {
        if (gameStateRef.current === "waiting") {
            startGame();
            return;
        }

        if (gameStateRef.current === "gameOver") {
            startGame();
            return;
        }

        if (gameStateRef.current !== "playing" || !currentColor) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if click is on the canvas area
        if (mouseX > 50 && mouseX < CANVAS_WIDTH - 50 &&
            mouseY > 50 && mouseY < 350) {
            setPaintSplats(prev => [
                ...prev,
                {
                    x: mouseX,
                    y: mouseY,
                    color: currentColor,
                    size: 15 + Math.random() * 15
                }
            ]);

            // Add splatter effect
            for (let i = 0; i < 5; i++) {
                const angle = Math.PI * 2 * (i / 5);
                const dist = 20 + Math.random() * 15;
                setPaintSplats(prev => [
                    ...prev,
                    {
                        x: mouseX + Math.cos(angle) * dist,
                        y: mouseY + Math.sin(angle) * dist,
                        color: currentColor,
                        size: 5 + Math.random() * 8
                    }
                ]);
            }

            // Score points
            let points = 10;
            if (targetColorRef.current === currentColor) points = 25;

            setScore(prev => prev + points);
            setCurrentColor(null);
        }
    };

    const startGame = () => {
        playerRef.current = { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - PLAYER_SIZE - 10 };
        paintBlobsRef.current = [];
        setPaintSplats([]);
        setCurrentColor(null);
        setScore(0);
        setCombo(0);
        setMaxCombo(0);
        setTargetColor(null);
        targetColorRef.current = null;
        setTimeLeft(GAME_DURATION / 1000);
        timeLeftRef.current = GAME_DURATION / 1000;
        setGameState("playing");
        gameStateRef.current = "playing";
        setShowTutorial(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-300 to-blue-300 flex flex-col items-center justify-center p-4 overflow-hidden">
            {/* Animated floating elements in background */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-4 h-4 rounded-full opacity-30"
                        style={{
                            left: `${5 + (i * 7)}%`,
                            top: `${10 + (i * 6)}%`,
                            background: paintColors[i % paintColors.length],
                            animation: `float ${15 + i * 2}s infinite ease-in-out`,
                            animationDelay: `${i * 0.5}s`
                        }}
                    />
                ))}
            </div>

            <div className="flex flex-col items-center space-y-6 p-8 rounded-3xl bg-white bg-opacity-90 backdrop-blur-md border-4 border-purple-300 shadow-2xl max-w-md w-full relative z-10">
                {/* Game Title */}
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 animate-pulse">
                    Rainbow Painter
                </h1>

                {/* Canvas */}
                <div className="relative rounded-2xl overflow-hidden border-4 border-purple-400 shadow-inner">
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="block cursor-crosshair"
                        onClick={(e) => handleCanvasClick(e)}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    />
                </div>

                {/* Controls */}
                <div className="flex gap-4 flex-wrap justify-center">
                    {gameState === "playing" && !isMobile && (
                        <button
                            onClick={() => firePaintball()}
                            disabled={!currentColor}
                            className={`px-6 py-4 text-white font-medium rounded-xl shadow-md transition-all transform hover:scale-105 text-lg ${currentColor
                                ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                                : "bg-gray-400 cursor-not-allowed"
                                }`}
                        >
                            🎨 Splat Random Color
                        </button>
                    )}
                </div>

                {/* Instructions - different for mobile and PC */}
                {gameState === "playing" && (
                    <div className="text-center text-lg text-purple-800 bg-pink-100 bg-opacity-80 p-4 rounded-2xl border-2 border-purple-300">
                        {isMobile ? (
                            <>
                                <p className="mb-2">Swipe left/right to move unicorn</p>
                                <p className="mb-2">Tap canvas to splat your current color</p>
                                <p>Special sparkly paints give combo points!</p>
                            </>
                        ) : (
                            <>
                                <p className="mb-2">← → Move unicorn to catch paint colors</p>
                                <p className="mb-2">Click on canvas to splat your current color</p>
                                <p>Special sparkly paints give combo points!</p>
                            </>
                        )}
                    </div>
                )}

                {/* Tutorial Overlay */}
                {showTutorial && (
                    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20">
                        <div className="bg-gradient-to-br from-pink-200 to-purple-200 p-8 rounded-2xl border-4 border-yellow-400 max-w-md text-center shadow-2xl">
                            <h2 className="text-3xl font-bold text-purple-700 mb-4">How to Play</h2>
                            {isMobile ? (
                                <>
                                    <p className="text-purple-800 text-lg mb-2">1. Swipe to move the unicorn</p>
                                    <p className="text-purple-800 text-lg mb-2">2. Catch falling paint colors</p>
                                    <p className="text-purple-800 text-lg mb-2">3. Tap the canvas to paint</p>
                                    <p className="text-purple-800 text-lg mb-2">4. Sparkly paints give combo points!</p>
                                    <p className="text-purple-800 text-lg mb-4">5. Paint with the target color for bonus points</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-purple-800 text-lg mb-2">1. Move the unicorn with arrow keys ← →</p>
                                    <p className="text-purple-800 text-lg mb-2">2. Catch falling paint colors</p>
                                    <p className="text-purple-800 text-lg mb-2">3. Click on the canvas to paint</p>
                                    <p className="text-purple-800 text-lg mb-2">4. Sparkly paints give combo points!</p>
                                    <p className="text-purple-800 text-lg mb-4">5. Paint with the target color for bonus points</p>
                                </>
                            )}
                            <button
                                onClick={() => setShowTutorial(false)}
                                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105"
                            >
                                Got It!
                            </button>
                        </div>
                    </div>
                )}
            </div>



        </div>
    );
}