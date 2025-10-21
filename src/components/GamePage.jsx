import React from "react";
import { auth } from "../firebase";
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
      {/* User Info Card */}
      <div className="user-card">
        <p className="username">{user?.email}</p>
        <button className="signout-btn" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>

      {/* Main Menu */}
      <div className="menu-container">
        <h1 className="menu-title">Pokémon Roguelike</h1>
        <div className="menu-buttons">
          <button>Start</button>
          <button>Current Team</button>
          <button>Pokémons</button>
          <button>Trade</button>
        </div>
      </div>
    </div>
  );
}
