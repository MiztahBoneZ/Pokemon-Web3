import React, { useEffect, useState } from "react";
import { auth } from "../../Core/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./GamePage.css";

export default function GamePage() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="gamepage-container">
      <div className="user-card">
        <p className="username">{user?.email}</p>
        <button className="signout-btn" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
      <h1 className="menu-title">Pokemon</h1>
      <div className="menu-container">
        <div className="menu-buttons">
          <button>Start</button>
          <button onClick={() => navigate("/game/teamselect")}>
            Current Team
          </button>
          <button onClick={() => navigate("/game/pokemon")}>Pokémons</button>
          <button onClick={() => navigate("/game/marketplace")}>
            Marketplace
          </button>
          <button onClick={() => alert("Coming Soon")}>Trade</button>
        </div>
      </div>
    </div>
  );
}
