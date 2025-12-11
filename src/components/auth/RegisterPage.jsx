import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../Core/firebase";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import "./AuthPageStyle.css";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Registration successful!");

      await connectWallet();

      navigate("/onboarding");
    } catch (err) {
      setError(err.message);
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask not detected. Please install MetaMask to continue.");
        return;
      }

      setIsConnecting(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      setWalletAddress(address);
      alert(`Wallet connected: ${address}`);

      setIsConnecting(false);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setIsConnecting(false);
      setError("Failed to connect wallet. Please try again.");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <h1>Register</h1>
        <h2>Create Account</h2>
        <form onSubmit={handleRegister}>
          {error && <p className="error">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={isConnecting}>
            {isConnecting
              ? "Connecting Wallet..."
              : "Register & Connect Wallet"}
          </button>

          {walletAddress && (
            <p style={{ color: "green" }}>Wallet: {walletAddress}</p>
          )}

          <button
            type="button"
            onClick={() => navigate("/")}
            style={{ backgroundColor: "#2a75bb", color: "white" }}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
