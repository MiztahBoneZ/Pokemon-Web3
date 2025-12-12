import React, { useEffect, useState } from "react";
import { auth } from "../../Core/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./GamePage.css";

export default function GamePage() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [walletAddress, setWalletAddress] = useState("");

  /* ---------- MetaMask helpers ---------- */
  const getAccount = async () => {
    if (!window.ethereum) {
      console.warn("MetaMask not installed");
      setWalletAddress("");
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      setWalletAddress(accounts[0] || "");
    } catch (err) {
      console.error("Could not fetch accounts:", err);
      setWalletAddress("");
    }
  };

  useEffect(() => {
    getAccount(); // on mount

    window.ethereum?.on("accountsChanged", (accounts) => {
      setWalletAddress(accounts[0] || "");
    });

    return () => {
      window.ethereum?.removeListener("accountsChanged", getAccount);
    };
  }, []);

  /* ---------- Sign-out ---------- */
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="gamepage-container">
      <div className="user-card">
        <p className="username">{user?.email}</p>
        {walletAddress && (
          <p className="wallet-line">
            {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
          </p>
        )}
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
          <button onClick={() => navigate("/game/mint")}>
            Minting <br /> <br />
            TESTING ONLY
          </button>
          <button onClick={() => navigate("/game/marketplace")}>
            Marketplace
          </button>
          <button onClick={() => alert("Coming Soon")}>Trade</button>
        </div>
      </div>
    </div>
  );
}
