import React, { useState } from "react";
import BalloonPopGame from "./components/BalloonPopGame";
import RainbowPainterGame from "./components/RainbowPainterGame";
import MathMasterGame from "./components/MathMasterGame";
import AdventureQuestGame from "./components/AdventureQuestGame";

// Define type for game names
type GameName = "rainbow" | "balloon" | "math" | "adventure";

function App() {
  const [currentGame, setCurrentGame] = useState<GameName>("rainbow");

  return (
    <div className="App">
      <div className="game-selector">
        <button
          onClick={() => setCurrentGame("rainbow")}
          className={currentGame === "rainbow" ? "active" : ""}
        >
          Rainbow Painter
        </button>
        <button
          onClick={() => setCurrentGame("balloon")}
          className={currentGame === "balloon" ? "active" : ""}
        >
          Balloon Pop
        </button>
        <button
          onClick={() => setCurrentGame("math")}
          className={currentGame === "math" ? "active" : ""}
        >
          Math Master
        </button>
        <button
          onClick={() => setCurrentGame("adventure")}
          className={currentGame === "adventure" ? "active" : ""}
        >
          Adventure Quest
        </button>
      </div>

      {currentGame === "rainbow" && <RainbowPainterGame />}
      {currentGame === "balloon" && <BalloonPopGame />}
      {currentGame === "math" && <MathMasterGame />}
      {currentGame === "adventure" && <AdventureQuestGame />}
    </div>
  );
}

export default App;