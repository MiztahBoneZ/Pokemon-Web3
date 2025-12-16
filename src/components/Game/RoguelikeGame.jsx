import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../../Core/firebase";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import Battle from "./Battle";
import "./RoguelikeGame.css";

export default function RoguelikeGame() {
  const location = useLocation();
  const selectedTeam = location.state?.selectedTeam || [];
  const [gameState, setGameState] = useState("start");
  const [currentFloor, setCurrentFloor] = useState(1);
  const [team, setTeam] = useState([]);
  const [battleKey, setBattleKey] = useState(0);
  const [runStats, setRunStats] = useState({
    battlesWon: 0,
    pokemonCaptured: 0,
    floorsCleared: 0,
    startTime: new Date().toISOString(),
  });
  const navigate = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    console.log("RoguelikeGame received selectedTeam:", selectedTeam);
    console.log("First pokemon:", selectedTeam[0]);
    console.log("First pokemon types:", selectedTeam[0]?.types);
  }, []);

  const startRun = () => {
    const initializedTeam = selectedTeam.map((pokemon) => ({
      ...pokemon,
      sessionLevel: 1,
      currentHP: pokemon.stats.hp,
      maxHP: pokemon.stats.hp,
      currentStats: { ...pokemon.stats },
      expGained: 0,
    }));

    console.log("Initialized team:", initializedTeam);
    console.log("First initialized pokemon:", initializedTeam[0]);
    console.log("First initialized pokemon types:", initializedTeam[0]?.types);

    setTeam(initializedTeam);
    setCurrentFloor(1);
    setRunStats({
      battlesWon: 0,
      pokemonCaptured: 0,
      floorsCleared: 0,
      startTime: new Date().toISOString(),
    });
    setGameState("battle");
  };

  const handleBattleEnd = async (updatedTeam, victory) => {
    setTeam(updatedTeam);

    if (victory) {
      setRunStats((prev) => ({
        ...prev,
        battlesWon: prev.battlesWon + 1,
        floorsCleared: currentFloor,
      }));

      const allFainted = updatedTeam.every((p) => p.currentHP <= 0);
      if (allFainted) {
        endRun(false);
        return;
      }

      setCurrentFloor((prev) => prev + 1);

      setBattleKey((prev) => prev + 1);

      setTimeout(() => {
        setGameState("battle");
      }, 500);
    } else {
      endRun(false);
    }
  };

  const handleCapture = () => {
    setRunStats((prev) => ({
      ...prev,
      pokemonCaptured: prev.pokemonCaptured + 1,
    }));
  };

  const endRun = async (victory) => {
    setGameState("gameOver");

    try {
      const user = auth.currentUser;
      if (user) {
        const runId = crypto.randomUUID();
        const runRef = doc(db, "users", user.uid, "runs", runId);

        await setDoc(runRef, {
          ...runStats,
          endTime: new Date().toISOString(),
          finalFloor: currentFloor,
          outcome: victory ? "victory" : "defeat",
          teamUsed: team.map((p) => ({
            nftTokenId: p.nftTokenId,
            pokemonId: p.pokemonId,
            name: p.name,
            startLevel: 1,
            endLevel: p.sessionLevel,
            expGained: p.expGained,
          })),
        });
      }
    } catch (error) {
      console.error("Failed to save run:", error);
    }
  };

  if (gameState === "start") {
    return (
      <div className="game-start-container">
        <div className="start-card">
          <h1>Adventure Mode</h1>
          <p className="subtitle">Battle through floors and capture Pokémon!</p>

          <div className="team-preview">
            <h3>Your Team ({selectedTeam.length}/6)</h3>
            <div className="team-grid">
              {selectedTeam.map((pokemon) => (
                <div key={pokemon.id} className="team-member">
                  <img src={pokemon.sprite} alt={pokemon.name} />
                  <p>{pokemon.name.toUpperCase()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rules-section">
            <h4>How to Play:</h4>
            <ul>
              <li>Battle wild Pokémon in random biomes</li>
              <li>Capture defeated Pokémon to mint as NFTs</li>
              <li>Level up during run (resets after)</li>
              <li>Survive as long as possible</li>
              <li>All Pokémon faint = Game Over</li>
            </ul>
          </div>

          <button className="start-run-btn" onClick={startRun}>
            Start Run
          </button>
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back to Team Select
          </button>
        </div>
      </div>
    );
  }

  if (gameState === "battle") {
    return (
      <Battle
        key={battleKey}
        team={team}
        floor={currentFloor}
        onBattleEnd={handleBattleEnd}
        onCapture={handleCapture}
      />
    );
  }

  if (gameState === "gameOver") {
    return (
      <div className="game-over-container">
        <div className="game-over-card">
          <h1>Run Complete!</h1>

          <div className="stats-summary">
            <h3>Run Statistics</h3>
            <div className="stat-row">
              <span>Floors Cleared:</span>
              <span className="stat-value">{runStats.floorsCleared}</span>
            </div>
            <div className="stat-row">
              <span>Battles Won:</span>
              <span className="stat-value">{runStats.battlesWon}</span>
            </div>
            <div className="stat-row">
              <span>Pokémon Captured:</span>
              <span className="stat-value">{runStats.pokemonCaptured}</span>
            </div>
            <div className="stat-row">
              <span>Highest Level:</span>
              <span className="stat-value">
                {Math.max(...team.map((p) => p.sessionLevel))}
              </span>
            </div>
          </div>

          <div className="team-final-state">
            <h4>Final Team State</h4>
            <div className="team-grid">
              {team.map((pokemon) => (
                <div
                  key={pokemon.id}
                  className={`team-member-final ${
                    pokemon.currentHP <= 0 ? "fainted" : ""
                  }`}
                >
                  <img src={pokemon.sprite} alt={pokemon.name} />
                  <p>{pokemon.name.toUpperCase()}</p>
                  <p className="level">Lv.{pokemon.sessionLevel}</p>
                  <p className="hp">
                    {pokemon.currentHP}/{pokemon.maxHP} HP
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="game-over-actions">
            <button className="play-again-btn" onClick={startRun}>
              Play Again
            </button>
            <button className="menu-btn" onClick={() => navigate("/game")}>
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
