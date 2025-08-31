import React, { useCallback, useEffect, useRef, useState } from "react";

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GAME_DURATION = 60000; // 60 seconds

interface Problem {
    text: string;
    answer: number;
}

interface Feedback {
    show: boolean;
    correct: boolean;
    message: string;
}

export default function MathMasterGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<string>("waiting");
    const [score, setScore] = useState<number>(0);
    const [timeLeft, setTimeLeft] = useState<number>(GAME_DURATION / 1000);
    const [showTutorial, setShowTutorial] = useState<boolean>(true);
    const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
    const [options, setOptions] = useState<number[]>([]);
    const [difficulty, setDifficulty] = useState<number>(1);
    const [correctStreak, setCorrectStreak] = useState<number>(0);
    const [maxStreak, setMaxStreak] = useState<number>(0);
    const [feedback, setFeedback] = useState<Feedback>({ show: false, correct: false, message: "" });
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [highScores, setHighScores] = useState<number[]>([]);

    const animationRef = useRef<number>(0);
    const gameStateRef = useRef<string>(gameState);
    const timeLeftRef = useRef<number>(GAME_DURATION / 1000);

    // Check if device is mobile
    useEffect(() => {
        const checkIsMobile = (): boolean => {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        };
        setIsMobile(checkIsMobile());
    }, []);

    // Load high scores from localStorage
    useEffect(() => {
        const savedHighScores = localStorage.getItem('mathMasterHighScores');
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
            localStorage.setItem('mathMasterHighScores', JSON.stringify(newHighScores));
        }
    }, [gameState, score, highScores]);

    // Generate a new math problem
    const generateProblem = useCallback(() => {
        let num1: number, num2: number, answer: number, operator: string, problemText: string;

        if (difficulty === 1) {
            // Easy: Addition and subtraction with numbers 1-10
            num1 = Math.floor(Math.random() * 10) + 1;
            num2 = Math.floor(Math.random() * 10) + 1;
            operator = Math.random() > 0.5 ? '+' : '-';

            if (operator === '+') {
                answer = num1 + num2;
                problemText = `${num1} + ${num2} = ?`;
            } else {
                // Ensure no negative answers for easy level
                if (num1 < num2) [num1, num2] = [num2, num1];
                answer = num1 - num2;
                problemText = `${num1} - ${num2} = ?`;
            }
        } else if (difficulty === 2) {
            // Medium: Addition and subtraction with numbers 1-20, multiplication with 1-5
            const operationType = Math.floor(Math.random() * 3);

            if (operationType === 0) { // Addition
                num1 = Math.floor(Math.random() * 20) + 1;
                num2 = Math.floor(Math.random() * 20) + 1;
                operator = '+';
                answer = num1 + num2;
                problemText = `${num1} + ${num2} = ?`;
            } else if (operationType === 1) { // Subtraction
                num1 = Math.floor(Math.random() * 20) + 1;
                num2 = Math.floor(Math.random() * num1) + 1;
                operator = '-';
                answer = num1 - num2;
                problemText = `${num1} - ${num2} = ?`;
            } else { // Multiplication
                num1 = Math.floor(Math.random() * 5) + 1;
                num2 = Math.floor(Math.random() * 5) + 1;
                operator = '×';
                answer = num1 * num2;
                problemText = `${num1} × ${num2} = ?`;
            }
        } else {
            // Hard: All operations with larger numbers
            const operationType = Math.floor(Math.random() * 4);

            if (operationType === 0) { // Addition
                num1 = Math.floor(Math.random() * 50) + 1;
                num2 = Math.floor(Math.random() * 50) + 1;
                operator = '+';
                answer = num1 + num2;
                problemText = `${num1} + ${num2} = ?`;
            } else if (operationType === 1) { // Subtraction
                num1 = Math.floor(Math.random() * 50) + 1;
                num2 = Math.floor(Math.random() * num1) + 1;
                operator = '-';
                answer = num1 - num2;
                problemText = `${num1} - ${num2} = ?`;
            } else if (operationType === 2) { // Multiplication
                num1 = Math.floor(Math.random() * 10) + 1;
                num2 = Math.floor(Math.random() * 10) + 1;
                operator = '×';
                answer = num1 * num2;
                problemText = `${num1} × ${num2} = ?`;
            } else { // Division
                num2 = Math.floor(Math.random() * 10) + 1;
                answer = Math.floor(Math.random() * 10) + 1;
                num1 = num2 * answer;
                operator = '÷';
                problemText = `${num1} ÷ ${num2} = ?`;
            }
        }

        // Generate options
        const optionsList = [answer];
        while (optionsList.length < 4) {
            let variant: number;
            if (difficulty === 1) {
                variant = answer + Math.floor(Math.random() * 5) - 2;
            } else if (difficulty === 2) {
                variant = answer + Math.floor(Math.random() * 8) - 4;
            } else {
                variant = answer + Math.floor(Math.random() * 10) - 5;
            }

            // Ensure variants are positive and not duplicates
            if (variant > 0 && !optionsList.includes(variant)) {
                optionsList.push(variant);
            }
        }

        // Shuffle options
        for (let i = optionsList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [optionsList[i], optionsList[j]] = [optionsList[j], optionsList[i]];
        }

        setCurrentProblem({ text: problemText, answer });
        setOptions(optionsList);
    }, [difficulty]);

    // Initialize game
    useEffect(() => {
        if (gameState === "playing") {
            generateProblem();
        }
    }, [gameState, generateProblem]);

    // Helper function to draw math characters
    const drawMathCharacters = (ctx: CanvasRenderingContext2D) => {
        // Draw calculator character
        drawCalculator(ctx, 50, 500, 60);

        // Draw ruler character
        drawRuler(ctx, 150, 480, 70);

        // Draw math book character
        drawMathBook(ctx, 250, 490, 65);

        // Draw abacus character
        drawAbacus(ctx, 350, 500, 60);
    };

    const drawCalculator = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        // Body
        ctx.fillStyle = "#FF6B6B";
        ctx.fillRect(x, y, size, size * 0.8);

        // Screen
        ctx.fillStyle = "#4ECDC4";
        ctx.fillRect(x + 5, y + 5, size - 10, size * 0.2);

        // Buttons
        ctx.fillStyle = "#FFE66D";
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                ctx.beginPath();
                ctx.arc(x + 15 + j * 20, y + 40 + i * 20, 7, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Face
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(x + 15, y + 10, 2, 0, Math.PI * 2); // Eye
        ctx.arc(x + size - 15, y + 10, 2, 0, Math.PI * 2); // Eye
        ctx.fill();

        // Smile
        ctx.beginPath();
        ctx.arc(x + size / 2, y + 15, 8, 0, Math.PI);
        ctx.stroke();
    };

    const drawRuler = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        // Body
        ctx.fillStyle = "#FFE66D";
        ctx.fillRect(x, y, size, size * 0.2);

        // Markings
        ctx.fillStyle = "#000000";
        for (let i = 0; i < 6; i++) {
            ctx.fillRect(x + i * 12, y, 2, i % 2 === 0 ? 10 : 5);
        }

        // Face
        ctx.beginPath();
        ctx.arc(x + 15, y + 5, 2, 0, Math.PI * 2); // Eye
        ctx.arc(x + size - 15, y + 5, 2, 0, Math.PI * 2); // Eye
        ctx.fill();

        // Smile
        ctx.beginPath();
        ctx.arc(x + size / 2, y + 3, 6, 0, Math.PI);
        ctx.stroke();
    };

    const drawMathBook = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        // Cover
        ctx.fillStyle = "#5B6DEC";
        ctx.fillRect(x, y, size, size * 0.7);

        // Binding
        ctx.fillStyle = "#FF9F1C";
        ctx.fillRect(x, y, size * 0.1, size * 0.7);

        // Title
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 12px Arial";
        ctx.fillText("MATH", x + 15, y + 20);
        ctx.fillText("FUN", x + 17, y + 35);

        // Face
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(x + 40, y + 15, 2, 0, Math.PI * 2); // Eye
        ctx.arc(x + 55, y + 15, 2, 0, Math.PI * 2); // Eye
        ctx.fill();

        // Smile
        ctx.beginPath();
        ctx.arc(x + 47.5, y + 20, 5, 0, Math.PI);
        ctx.stroke();
    };

    const drawAbacus = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        // Frame
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(x, y, size, size * 0.6);

        // Beads
        ctx.fillStyle = "#FF6B6B";
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 5; j++) {
                ctx.beginPath();
                ctx.arc(x + 15 + j * 10, y + 15 + i * 15, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Face
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(x + 15, y + 5, 2, 0, Math.PI * 2); // Eye
        ctx.arc(x + size - 15, y + 5, 2, 0, Math.PI * 2); // Eye
        ctx.fill();

        // Smile
        ctx.beginPath();
        ctx.arc(x + size / 2, y + 5, 6, 0, Math.PI);
        ctx.stroke();
    };

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw vibrant background with gradient
        const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        gradient.addColorStop(0, "#FF9EAA"); // Soft pink
        gradient.addColorStop(0.3, "#A2D2FF"); // Light blue
        gradient.addColorStop(0.6, "#BDE0FE"); // Pale blue
        gradient.addColorStop(1, "#FFAFCC"); // Pink
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw decorative elements
        drawMathCharacters(ctx);

        // Draw game board
        ctx.fillStyle = "#F0D9B5";
        ctx.fillRect(20, 20, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 150);
        ctx.strokeStyle = "#8B4513";
        ctx.lineWidth = 5;
        ctx.strokeRect(20, 20, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 150);

        // Draw score and time
        ctx.fillStyle = "#5E17EB";
        ctx.font = "bold 24px 'Comic Sans MS', cursive, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Score: ${score}`, 30, 50);

        ctx.textAlign = "right";
        ctx.fillText(`Time: ${timeLeft}s`, CANVAS_WIDTH - 30, 50);

        // Draw streak
        if (correctStreak > 1) {
            ctx.fillStyle = "#FFD700";
            ctx.textAlign = "center";
            ctx.font = "bold 28px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText(`Streak x${correctStreak}!`, CANVAS_WIDTH / 2, 50);
        }

        // Draw difficulty
        ctx.fillStyle = "#FF6B6B";
        ctx.textAlign = "center";
        ctx.font = "bold 20px 'Comic Sans MS', cursive, sans-serif";
        const difficultyText = ["Easy", "Medium", "Hard"][difficulty - 1];
        ctx.fillText(`Level: ${difficultyText}`, CANVAS_WIDTH / 2, 80);

        // Draw current problem
        if (currentProblem) {
            ctx.fillStyle = "#5E17EB";
            ctx.font = "bold 32px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(currentProblem.text, CANVAS_WIDTH / 2, 150);
        }

        // Draw options
        options.forEach((option, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const x = col === 0 ? CANVAS_WIDTH / 3 : (2 * CANVAS_WIDTH) / 3;
            const y = 220 + row * 100;

            // Draw option bubble
            ctx.fillStyle = "#4ECDC4";
            ctx.beginPath();
            ctx.arc(x, y, 40, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw option number
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 28px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(option.toString(), x, y);
        });

        // Draw feedback
        if (feedback.show) {
            ctx.fillStyle = feedback.correct ? "rgba(0, 200, 0, 0.8)" : "rgba(255, 0, 0, 0.8)";
            ctx.font = "bold 36px 'Comic Sans MS', cursive, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(feedback.message, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 200);
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
            ctx.fillText("QUIZ COMPLETE!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

            ctx.fillStyle = "#5E17EB";
            ctx.font = "28px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

            ctx.fillStyle = "#FF9F1C";
            ctx.fillText(`Max Streak: ${maxStreak}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

            ctx.fillStyle = "#4ECDC4";
            ctx.font = "20px 'Comic Sans MS', cursive, sans-serif";
            ctx.fillText("Tap anywhere to play again", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
        }
    }, [score, timeLeft, currentProblem, options, correctStreak, maxStreak, difficulty, feedback, gameState]);

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

        // Increase difficulty based on score
        if (score >= 30 && difficulty < 3) {
            setDifficulty(3);
        } else if (score >= 15 && difficulty < 2) {
            setDifficulty(2);
        }
    }, [score, difficulty]);

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

    const checkAnswer = (selectedAnswer: number) => {
        if (!currentProblem) return;

        if (selectedAnswer === currentProblem.answer) {
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

        // Hide feedback after a delay and generate new problem
        setTimeout(() => {
            setFeedback({ show: false, correct: false, message: "" });
            generateProblem();
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
        setShowTutorial(false);
    };

    const resetHighScores = () => {
        setHighScores([]);
        localStorage.removeItem('mathMasterHighScores');
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
                            background: ["#a00606ff", "#9a143eff", "#b10e83ff", "#106118ff", "#5B6DEC"][i % 5],
                            animation: `float ${15 + i * 2}s infinite ease-in-out`,
                            animationDelay: `${i * 0.5}s`
                        }}
                    />
                ))}
            </div>

            <div className="flex flex-col items-center space-y-6 p-8 rounded-3xl bg-white bg-opacity-90 backdrop-blur-md border-4 border-purple-300 shadow-2xl max-w-md w-full relative z-10">
                {/* Game Title */}
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 animate-pulse">
                    Math Master
                </h1>

                {/* Canvas */}
                <div className="relative rounded-2xl overflow-hidden border-4 border-purple-400 shadow-inner">
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
                            🔄 Reset Game
                        </button>
                    )}

                    <button
                        onClick={() => setShowTutorial(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-xl shadow-md transition-all transform hover:scale-105"
                    >
                        ❓ How to Play
                    </button>
                </div>

                {/* High Scores */}
                {highScores.length > 0 && (
                    <div className="text-center text-purple-800 bg-pink-100 bg-opacity-80 p-4 rounded-2xl border-2 border-purple-300 w-full">
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
                    <div className="text-center text-lg text-purple-800 bg-pink-100 bg-opacity-80 p-4 rounded-2xl border-2 border-purple-300">
                        <p className="mb-2">Click the correct answer to earn points!</p>
                        <p>Higher levels give more points per question.</p>
                    </div>
                )}

                {/* Tutorial Overlay */}
                {showTutorial && (
                    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20">
                        <div className="bg-gradient-to-br from-pink-200 to-purple-200 p-8 rounded-2xl border-4 border-yellow-400 max-w-md text-center shadow-2xl">
                            <h2 className="text-3xl font-bold text-purple-700 mb-4">How to Play</h2>
                            <p className="text-purple-800 text-lg mb-2">1. Solve the math problems</p>
                            <p className="text-purple-800 text-lg mb-2">2. Click the correct answer</p>
                            <p className="text-purple-800 text-lg mb-2">3. Earn points for correct answers</p>
                            <p className="text-purple-800 text-lg mb-2">4. Difficulty increases as you score more</p>
                            <p className="text-purple-800 text-lg mb-4">5. Get streaks for consecutive correct answers!</p>
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