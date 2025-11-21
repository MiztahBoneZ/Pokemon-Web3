import React, { useEffect, useState } from "react";
import { auth } from "../../Core/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import Phaser from "phaser";
import gameConfig from "../game/main";
import "./GamePage.css";

export default function GamePage() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [showGame, setShowGame] = useState(false);
  const [phaserGame, setPhaserGame] = useState(null);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleStartGame = () => {
    setShowGame(true);
  };

  // initialize Phaser only when showGame becomes true
  useEffect(() => {
    if (showGame && !phaserGame) {
      const game = new Phaser.Game(gameConfig);
      setPhaserGame(game);

      return () => {
        game.destroy(true);
      };
    }
  }, [showGame]);

  return (
    <div className="gamepage-container">
      {/* User Info Card */}
      <div className="user-card">
        <p className="username">{user?.email}</p>
        <button className="signout-btn" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>

      {/* Show Phaser Game or Main Menu */}
      {!showGame ? (
        <div className="menu-container">
          <h1 className="menu-title">Pokémon Roguelike</h1>
          <div className="menu-buttons">
            <button onClick={handleStartGame}>Start</button>
            <button>Current Team</button>
            <button onClick={() => navigate("/game/pokemon")}>Pokémons</button>
            <button>Trade</button>
          </div>
        </div>
      ) : (
        <div
          id="phaser-container"
          style={{
            width: "800px",
            height: "600px",
            margin: "0 auto",
            border: "2px solid #fff",
          }}
        />
      )}
    </div>
  );
}
