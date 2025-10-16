import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import "./AuthPageStyle.css";

export default function GamePage() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      alert("Signed out successfully.");
      navigate("/");
    } catch (error) {
      alert("Error signing out: " + error.message);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <h1>Pokémon Roguelike</h1>
        <h2>Trainer Dashboard</h2>
        <p>Welcome, trainer. Ready to explore?</p>
        <button onClick={handleSignOut}>Sign Out</button>
      </div>
    </div>
  );
}
