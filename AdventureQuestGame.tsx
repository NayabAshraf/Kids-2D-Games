import React, { useCallback, useEffect, useRef, useState } from "react";

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GAME_DURATION = 60000; // 60 seconds

interface Position {
    x: number;
    y: number;
}

interface Obstacle {
    x: number;
    y: number;
    type: string;
}

interface Treasure {
    x: number;
    y: number;
    collected: boolean;
    type: string;
}

interface Challenge {
    text: string;
    answer: string;
}

interface Feedback {
    show: boolean;
    correct: boolean;
    message: string;
}

export default function AdventureQuestGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<string>("waiting");
    const [score, setScore] = useState<number>(0);
    const [timeLeft, setTimeLeft] = useState<number>(GAME_DURATION / 1000);
    const [showTutorial, setShowTutorial] = useState<boolean>(true);
    const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [difficulty, setDifficulty] = useState<number>(1);
    const [correctStreak, setCorrectStreak] = useState<number>(0);
    const [maxStreak, setMaxStreak] = useState<number>(0);
    const [feedback, setFeedback] = useState<Feedback>({ show: false, correct: false, message: "" });
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [highScores, setHighScores] = useState<number[]>([]);
    const [playerPosition, setPlayerPosition] = useState<Position>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 });
    const [obstacles, setObstacles] = useState<Obstacle[]>([]);
    const [treasures, setTreasures] = useState<Treasure[]>([]);

    const animationRef = useRef<number>(0);
    const gameStateRef = useRef<string>(gameState);
    const timeLeftRef = useRef<number>(GAME_DURATION / 1000);
    const keysPressed = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

    // Check if device is mobile
    useEffect(() => {
        const checkIsMobile = (): boolean => {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        };
        setIsMobile(checkIsMobile());
    }, []);

    // Load high scores from localStorage
    useEffect(() => {
        const savedHighScores = localStorage.getItem('adventureQuestHighScores');
        if (savedHighScores) {
            setHighScores(JSON.parse(savedHighScores));
        }
    }, []);

    // Save high score when game ends
    useEffect(() => {
        if (gameState === "gameOver" && score > 0) {
            const newHighScores = [...highScores, score]
                .sort((a, b) => b - a)
                .slice(0, 5); // Keep only top 5 scores

            setHighScores(newHighScores);
            localStorage.setItem('adventureQuestHighScores', JSON.stringify(newHighScores));
        }
    }, [gameState, score, highScores]);

    // Handle keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') keysPressed.current.left = true;
            if (e.key === 'ArrowRight') keysPressed.current.right = true;
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') keysPressed.current.left = false;
            if (e.key === 'ArrowRight') keysPressed.current.right = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Generate a new challenge (puzzle or question)
    const generateChallenge = useCallback(() => {
        let challenge: string, answer: string, optionsList: string[];

        if (difficulty === 1) {
            // Easy: Simple puzzles and patterns
            const challengeType = Math.floor(Math.random() * 3);

            if (challengeType === 0) {
                // Pattern recognition
                const patterns = ["△ □ ○", "○ △ □", "□ ○ △"];
                const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
                challenge = `Complete the pattern: ${selectedPattern}`;
                answer = "△";
                optionsList = ["△", "○", "□", "▽"];
            } else if (challengeType === 1) {
                // Simple counting
                const count = Math.floor(Math.random() * 5) + 3;
                challenge = `How many treasure chests? ${'💎'.repeat(count)}`;
                answer = count.toString();
                optionsList = [count, count + 1, count - 1, count + 2].filter(n => n > 0).map(n => n.toString());
            } else {
                // Color matching
                const colors = ["Red", "Blue", "Green", "Yellow"];
                const selectedColor = colors[Math.floor(Math.random() * colors.length)];
                challenge = `What color is the ${selectedColor.toLowerCase()} gem?`;
                answer = selectedColor;
                optionsList = [...colors];
            }
        } else if (difficulty === 2) {
            // Medium: Slightly more complex challenges
            const challengeType = Math.floor(Math.random() * 3);

            if (challengeType === 0) {
                // Simple math
                const num1 = Math.floor(Math.random() * 5) + 1;
                const num2 = Math.floor(Math.random() * 5) + 1;
                challenge = `${num1} + ${num2} = ?`;
                answer = (num1 + num2).toString();
                optionsList = [num1 + num2, num1 + num2 + 1, num1 + num2 - 1, num1 + num2 + 2].map(n => n.toString());
            } else if (challengeType === 1) {
                // Shape patterns
                const shapes = ["△", "□", "○", "☆"];
                const patternLength = 4;
                let pattern = "";
                let patternAnswer = Math.floor(Math.random() * patternLength);

                for (let i = 0; i < patternLength; i++) {
                    if (i === patternAnswer) {
                        pattern += "? ";
                    } else {
                        const shape = shapes[Math.floor(Math.random() * shapes.length)];
                        pattern += `${shape} `;
                    }
                }

                challenge = `What's missing? ${pattern}`;
                answer = shapes[Math.floor(Math.random() * shapes.length)];
                optionsList = [...shapes];
            } else {
                // Memory challenge
                const items = ["🗝️", "💎", "🔮", "👑"];
                const sequence: string[] = [];

                for (let i = 0; i < 3; i++) {
                    sequence.push(items[Math.floor(Math.random() * items.length)]);
                }

                challenge = `Remember: ${sequence.join(" ")}`;
                answer = sequence[1]; // Ask for the middle item
                optionsList = Array.from(new Set([...items, sequence[1]])).slice(0, 4);
            }
        } else {
            // Hard: More complex challenges
            const challengeType = Math.floor(Math.random() * 3);

            if (challengeType === 0) {
                // Math with larger numbers
                const num1 = Math.floor(Math.random() * 10) + 5;
                const num2 = Math.floor(Math.random() * 5) + 1;
                challenge = `${num1} - ${num2} = ?`;
                answer = (num1 - num2).toString();
                optionsList = [num1 - num2, num1 - num2 + 2, num1 - num2 - 1, num1 - num2 + 1].map(n => n.toString());
            } else if (challengeType === 1) {
                // Word puzzles
                const words = ["TREASURE", "ADVENTURE", "EXPLORE", "JOURNEY"];
                const selectedWord = words[Math.floor(Math.random() * words.length)];
                const missingIndex = Math.floor(Math.random() * selectedWord.length);
                challenge = `Complete: ${selectedWord.substring(0, missingIndex)}_${selectedWord.substring(missingIndex + 1)}`;
                answer = selectedWord[missingIndex];
                optionsList = Array.from(new Set([
                    selectedWord[missingIndex],
                    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
                    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
                    String.fromCharCode(65 + Math.floor(Math.random() * 26))
                ])).slice(0, 4);
            } else {
                // Logic puzzles
                const colors = ["Red", "Blue", "Green", "Yellow"];
                const objects = ["Key", "Crown", "Gem", "Coin"];
                const color = colors[Math.floor(Math.random() * colors.length)];
                const object = objects[Math.floor(Math.random() * objects.length)];

                challenge = `If the ${color.toLowerCase()} ${object.toLowerCase()} opens the ${color.toLowerCase()} door, what color key for the blue door?`;
                answer = "Blue";
                optionsList = [...colors];
            }
        }

        // Ensure options are unique and include the answer
        const finalOptions = [answer];
        while (finalOptions.length < 4) {
            let variant: string;
            if (typeof optionsList[0] === 'number') {
                variant = (parseInt(answer) + Math.floor(Math.random() * 5) - 2).toString();
            } else {
                // For non-numeric options, pick from the options list
                const randomOption = optionsList[Math.floor(Math.random() * optionsList.length)];
                if (!finalOptions.includes(randomOption)) {
                    variant = randomOption;
                } else {
                    continue;
                }
            }

            if (variant !== answer && !finalOptions.includes(variant)) {
                finalOptions.push(variant);
            }
        }

        // Shuffle options
        for (let i = finalOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [finalOptions[i], finalOptions[j]] = [finalOptions[j], finalOptions[i]];
        }

        setCurrentChallenge({ text: challenge, answer });
        setOptions(finalOptions);
    }, [difficulty]);

    // Initialize game
    useEffect(() => {
        if (gameState === "playing") {
            generateChallenge();
            // Initialize some obstacles and treasures
            const initialObstacles: Obstacle[] = [];
            const initialTreasures: Treasure[] = [];

            for (let i = 0; i < 5; i++) {
                initialObstacles.push({
                    x: Math.random() * (CANVAS_WIDTH - 40) + 20,
                    y: Math.random() * (CANVAS_HEIGHT - 200) + 100,
                    type: ["rock", "tree", "cactus"][Math.floor(Math.random() * 3)]
                });

                initialTreasures.push({
                    x: Math.random() * (CANVAS_WIDTH - 30) + 15,
                    y: Math.random() * (CANVAS_HEIGHT - 200) + 100,
                    collected: false,
                    type: ["gem", "coin", "key"][Math.floor(Math.random() * 3)]
                });
            }

            setObstacles(initialObstacles);
            setTreasures(initialTreasures);
        }
    }, [gameState, generateChallenge]);

    const drawAdventureElements = (ctx: CanvasRenderingContext2D) => {
        // Draw mountains in background
        ctx.fillStyle = "#6B8E23";
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_HEIGHT - 100);
        ctx.lineTo(100, CANVAS_HEIGHT - 200);
        ctx.lineTo(200, CANVAS_HEIGHT - 100);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(150, CANVAS_HEIGHT - 100);
        ctx.lineTo(250, CANVAS_HEIGHT - 250);
        ctx.lineTo(350, CANVAS_HEIGHT - 100);
        ctx.fill();

        // Draw trees
        drawTree(ctx, 50, CANVAS_HEIGHT - 150, 40);
        drawTree(ctx, 300, CANVAS_HEIGHT - 140, 35);
        drawTree(ctx, 200, CANVAS_HEIGHT - 160, 45);
    };

    const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        // Trunk
        ctx.fillStyle = "#5E3023";
        ctx.fillRect(x - size / 10, y, size / 5, size / 2);

        // Leaves
        ctx.fillStyle = "#4F772D";
        ctx.beginPath();
        ctx.arc(x, y - size / 4, size / 2, 0, Math.PI * 2);
        ctx.fill();
    };

    const drawAdventurer = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        // Body
        ctx.fillStyle = "#BC6C25";
        ctx.fillRect(x - size / 4, y - size / 2, size / 2, size);

        // Head
        ctx.fillStyle = "#FEFAE0";
        ctx.beginPath();
        ctx.arc(x, y - size, size / 3, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = "#5E3023";
        ctx.beginPath();
        ctx.arc(x - size / 8, y - size, size / 10, 0, Math.PI * 2);
        ctx.arc(x + size / 8, y - size, size / 10, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        ctx.beginPath();
        ctx.arc(x, y - size + size / 10, size / 8, 0, Math.PI);
        ctx.stroke();

        // Hat
        ctx.fillStyle = "#5E3023";
        ctx.beginPath();
        ctx.moveTo(x - size / 2, y - size - size / 6);
        ctx.lineTo(x + size / 2, y - size - size / 6);
        ctx.lineTo(x + size / 3, y - size - size / 2);
        ctx.lineTo(x - size / 3, y - size - size / 2);
        ctx.closePath();
        ctx.fill();
    };

    const drawObstacle = (ctx: CanvasRenderingContext2D, x: number, y: number, type: string) => {
        if (type === "rock") {
            ctx.fillStyle = "#6C757D";
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === "tree") {
            drawTree(ctx, x, y, 30);
        } else if (type === "cactus") {
            ctx.fillStyle = "#4F772D";
            ctx.fillRect(x - 5, y - 20, 10, 40);
            ctx.fillRect(x - 15, y - 10, 10, 5);
            ctx.fillRect(x + 5, y, 10, 5);
        }
    };

    const drawTreasure = (ctx: CanvasRenderingContext2D, x: number, y: number, type: string) => {
        if (type === "gem") {
            ctx.fillStyle = "#FF6B6B";
            ctx.beginPath();
            ctx.moveTo(x, y - 10);
            ctx.lineTo(x - 10, y);
            ctx.lineTo(x, y + 10);
            ctx.lineTo(x + 10, y);
            ctx.closePath();
            ctx.fill();
        } else if (type === "coin") {
            ctx.fillStyle = "#FFD700";
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === "key") {
            ctx.fillStyle = "#BC6C25";
            ctx.fillRect(x - 2, y - 15, 4, 20);
            ctx.beginPath();
            ctx.arc(x, y - 15, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw adventurous background
        const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        gradient.addColorStop(0, "#4F772D"); // Forest green
        gradient.addColorStop(0.3, "#90A955"); // Light green
        gradient.addColorStop(0.6, "#ECF39E"); // Sand
        gradient.addColorStop(1, "#F4A259"); // Desert sand
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw decorative elements (trees, mountains, etc.)
        drawAdventureElements(ctx);

        // Draw game board
        ctx.fillStyle = "rgba(245, 235, 200, 0.8)";
        ctx.fillRect(20, 20, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 150);
        ctx.strokeStyle = "#5E3023";
        ctx.lineWidth = 5;
        ctx.strokeRect(20, 20, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 150);

        // Draw score and time
        ctx.fillStyle = "#5E3023";
        ctx.font = "bold 24px 'Comic Sans MS', cursive, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Score: ${score}`, 30, 50);

        ctx.textAlign = "right";
        ctx.fillText(`Time: ${timeLeft}s`, CANVAS_WIDTH - 30, 50);

        // Draw streak
        if (correctStreak > 1) {
            ctx.fillStyle = "#BC6C25";
            ctx.textAlign = "center";
            ctx.font = "bold 28px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText(`Streak x${correctStreak}!`, CANVAS_WIDTH / 2, 50);
        }

        // Draw difficulty
        ctx.fillStyle = "#5E3023";
        ctx.textAlign = "center";
        ctx.font = "bold 20px 'Comic Sans MS', cursive, sans-serif";
        const difficultyText = ["Easy", "Medium", "Hard"][difficulty - 1];
        ctx.fillText(`Level: ${difficultyText}`, CANVAS_WIDTH / 2, 80);

        // Draw player character
        drawAdventurer(ctx, playerPosition.x, playerPosition.y, 30);

        // Draw obstacles
        obstacles.forEach(obstacle => {
            drawObstacle(ctx, obstacle.x, obstacle.y, obstacle.type);
        });

        // Draw treasures
        treasures.forEach(treasure => {
            if (!treasure.collected) {
                drawTreasure(ctx, treasure.x, treasure.y, treasure.type);
            }
        });

        // Draw current challenge
        if (currentChallenge) {
            ctx.fillStyle = "#5E3023";
            ctx.font = "bold 20px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";

            // Split long text into multiple lines
            const words = currentChallenge.text.split(' ');
            let line = '';
            let lines: string[] = [];
            const maxWidth = CANVAS_WIDTH - 60;

            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth && i > 0) {
                    lines.push(line);
                    line = words[i] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);

            // Draw each line
            lines.forEach((line, index) => {
                ctx.fillText(line, CANVAS_WIDTH / 2, 150 + index * 25);
            });
        }

        // Draw options
        options.forEach((option, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const x = col === 0 ? CANVAS_WIDTH / 3 : (2 * CANVAS_WIDTH) / 3;
            const y = 220 + row * 100;

            // Draw option bubble
            ctx.fillStyle = "#BC6C25";
            ctx.beginPath();
            ctx.arc(x, y, 40, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#DDA15E";
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw option text
            ctx.fillStyle = "#FEFAE0";
            ctx.font = "bold 20px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(option.toString(), x, y);
        });

        // Draw feedback
        if (feedback.show) {
            ctx.fillStyle = feedback.correct ? "rgba(46, 139, 87, 0.8)" : "rgba(178, 34, 34, 0.8)";
            ctx.font = "bold 36px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(feedback.message, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 200);
        }

        // Draw waiting screen with tap to start
        if (gameStateRef.current === "waiting") {
            ctx.fillStyle = "rgba(254, 250, 224, 0.9)";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.fillStyle = "#5E3023";
            ctx.font = "bold 28px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("ADVENTURE QUEST", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

            // Draw "Tap to start exploring" text with animation
            ctx.fillStyle = "#BC6C25";
            ctx.font = "bold 24px 'Comic Sans MS', cursive, sans-serif";
            const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
            ctx.setTransform(scale, 0, 0, scale, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
            ctx.fillText("Tap to start exploring", 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Game over screen
        if (gameStateRef.current === "gameOver") {
            ctx.fillStyle = "rgba(254, 250, 224, 0.9)";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.fillStyle = "#BC6C25";
            ctx.font = "36px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("ADVENTURE COMPLETE!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

            ctx.fillStyle = "#5E3023";
            ctx.font = "28px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText(`Treasure Collected: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

            ctx.fillStyle = "#4F772D";
            ctx.fillText(`Max Streak: ${maxStreak}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

            ctx.fillStyle = "#BC6C25";
            ctx.font = "20px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText("Tap anywhere to explore again", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
        }
    }, [score, timeLeft, currentChallenge, options, correctStreak, maxStreak, difficulty, feedback, gameState, playerPosition, obstacles, treasures]);

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

        // Move player based on keys pressed
        setPlayerPosition(prev => {
            let newX = prev.x;
            let newY = prev.y;

            if (keysPressed.current.left) newX -= 5;
            if (keysPressed.current.right) newX += 5;

            // Keep player within bounds
            newX = Math.max(30, Math.min(CANVAS_WIDTH - 30, newX));

            return { x: newX, y: newY };
        });

        // Check for treasure collection
        setTreasures(prev => {
            return prev.map(treasure => {
                if (!treasure.collected) {
                    const distance = Math.sqrt(
                        Math.pow(playerPosition.x - treasure.x, 2) +
                        Math.pow(playerPosition.y - treasure.y, 2)
                    );

                    if (distance < 30) {
                        // Treasure collected!
                        setScore(s => s + difficulty * 10);
                        setCorrectStreak(cs => {
                            const newStreak = cs + 1;
                            if (newStreak > maxStreak) setMaxStreak(newStreak);
                            return newStreak;
                        });

                        setFeedback({
                            show: true,
                            correct: true,
                            message: ["Treasure!", "Found it!", "Awesome!", "Great find!"][Math.floor(Math.random() * 4)]
                        });

                        // Generate a new challenge
                        generateChallenge();

                        return { ...treasure, collected: true };
                    }
                }
                return treasure;
            });
        });

        // Increase difficulty based on score
        if (score >= 30 && difficulty < 3) {
            setDifficulty(3);
        } else if (score >= 15 && difficulty < 2) {
            setDifficulty(2);
        }
    }, [score, difficulty, playerPosition, maxStreak, generateChallenge]);

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

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

        // Check if click is on an option
        options.forEach((option, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const x = col === 0 ? CANVAS_WIDTH / 3 : (2 * CANVAS_WIDTH) / 3;
            const y = 220 + row * 100;

            // Calculate distance from option center
            const distance = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));

            if (distance <= 40) { // Option was clicked
                checkAnswer(option);
            }
        });
    };

    const checkAnswer = (selectedAnswer: string) => {
        if (!currentChallenge) return;

        if (selectedAnswer === currentChallenge.answer) {
            // Correct answer
            const points = difficulty * 5;
            setScore(prev => prev + points);
            setCorrectStreak(prev => {
                const newStreak = prev + 1;
                if (newStreak > maxStreak) setMaxStreak(newStreak);
                return newStreak;
            });

            setFeedback({
                show: true,
                correct: true,
                message: ["Great!", "Awesome!", "Correct!", "Well done!"][Math.floor(Math.random() * 4)]
            });
        } else {
            // Wrong answer
            setCorrectStreak(0);
            setFeedback({
                show: true,
                correct: false,
                message: "Try again!"
            });
        }

        // Hide feedback after a delay and generate new challenge
        setTimeout(() => {
            setFeedback({ show: false, correct: false, message: "" });
            generateChallenge();
        }, 1000);
    };

    const startGame = () => {
        setScore(0);
        setCorrectStreak(0);
        setMaxStreak(0);
        setDifficulty(1);
        setTimeLeft(GAME_DURATION / 1000);
        timeLeftRef.current = GAME_DURATION / 1000;
        setGameState("playing");
        gameStateRef.current = "playing";
        setPlayerPosition({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 });
        setShowTutorial(false);
        setObstacles([]);
        setTreasures([]);
    };

    const resetHighScores = () => {
        setHighScores([]);
        localStorage.removeItem('adventureQuestHighScores');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-400 via-yellow-300 to-orange-300 flex flex-col items-center justify-center p-4 overflow-hidden">
            {/* Animated floating elements in background */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-4 h-4 rounded-full opacity-30"
                        style={{
                            left: `${5 + (i * 7)}%`,
                            top: `${10 + (i * 6)}%`,
                            background: ["#4F772D", "#90A955", "#BC6C25", "#5E3023", "#DDA15E"][i % 5],
                            animation: `float ${15 + i * 2}s infinite ease-in-out`,
                            animationDelay: `${i * 0.5}s`
                        }}
                    />
                ))}
            </div>

            <div className="flex flex-col items-center space-y-6 p-8 rounded-3xl bg-white bg-opacity-90 backdrop-blur-md border-4 border-green-300 shadow-2xl max-w-md w-full relative z-10">
                {/* Game Title */}
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-yellow-500 to-orange-500 animate-pulse">
                    Adventure Quest
                </h1>

                {/* Canvas */}
                <div className="relative rounded-2xl overflow-hidden border-4 border-green-400 shadow-inner">
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="block cursor-pointer"
                        onClick={handleCanvasClick}
                    />
                </div>

                {/* Controls */}
                <div className="flex gap-4 flex-wrap justify-center">
                    {gameState === "playing" && (
                        <button
                            onClick={startGame}
                            className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium rounded-xl shadow-md transition-all transform hover:scale-105"
                        >
                            🔄 New Adventure
                        </button>
                    )}

                    <button
                        onClick={() => setShowTutorial(true)}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-yellow-500 text-white font-medium rounded-xl shadow-md transition-all transform hover:scale-105"
                    >
                        ❓ How to Play
                    </button>
                </div>

                {/* High Scores */}
                {highScores.length > 0 && (
                    <div className="text-center text-green-800 bg-yellow-100 bg-opacity-80 p-4 rounded-2xl border-2 border-green-300 w-full">
                        <h3 className="text-xl font-bold mb-2">🏆 High Scores</h3>
                        <div className="flex justify-center gap-6 flex-wrap">
                            {highScores.map((highScore, index) => (
                                <div key={index} className="text-lg font-semibold">
                                    #{index + 1}: {highScore}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={resetHighScores}
                            className="mt-3 px-4 py-2 bg-gradient-to-r from-red-400 to-orange-400 text-white text-sm rounded-lg shadow-md transition-all transform hover:scale-105"
                        >
                            Clear Scores
                        </button>
                    </div>
                )}

                {/* Instructions */}
                {gameState === "playing" && (
                    <div className="text-center text-lg text-green-800 bg-yellow-100 bg-opacity-80 p-4 rounded-2xl border-2 border-green-300">
                        <p className="mb-2">Use arrow keys to move and find treasures!</p>
                        <p>Solve puzzles to earn extra points.</p>
                    </div>
                )}

                {/* Tutorial Overlay */}
                {showTutorial && (
                    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20">
                        <div className="bg-gradient-to-br from-green-200 to-yellow-200 p-8 rounded-2xl border-4 border-orange-400 max-w-md text-center shadow-2xl">
                            <h2 className="text-3xl font-bold text-green-700 mb-4">How to Play</h2>
                            <p className="text-green-800 text-lg mb-2">1. Use arrow keys to explore</p>
                            <p className="text-green-800 text-lg mb-2">2. Find treasures hidden around</p>
                            <p className="text-green-800 text-lg mb-2">3. Solve puzzles to earn points</p>
                            <p className="text-green-800 text-lg mb-2">4. Difficulty increases as you find more</p>
                            <p className="text-green-800 text-lg mb-4">5. Get streaks for solving puzzles correctly!</p>
                            <button
                                onClick={() => setShowTutorial(false)}
                                className="px-6 py-3 bg-gradient-to-r from-green-500 to-yellow-500 text-white font-bold rounded-xl shadow-lg hover:from-green-600 hover:to-yellow-600 transition-all transform hover:scale-105"
                            >
                                Start Adventure!
                            </button>
                        </div>
                    </div>
                )}
            </div>



        </div>
    );
}