import React, { useEffect, useState } from "react";
import { auth } from "../../Core/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./GamePage.css";

export default function GamePage() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [walletAddress, setWalletAddress] = useState("");

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
    getAccount();

    window.ethereum?.on("accountsChanged", (accounts) => {
      setWalletAddress(accounts[0] || "");
    });

    return () => {
      window.ethereum?.removeListener("accountsChanged", getAccount);
    };
  }, []);

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
        {walletAddress && (
          <p className="wallet-line">
            {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
          </p>
        )}
        <button className="signout-btn" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>

      <h1 className="menu-title">Pokemon Dungeons</h1>
      <div className="menu-container">
        <div className="menu-buttons">
          <button onClick={() => navigate("/game/teamselect")}>
            Start Adventure
          </button>
          <button onClick={() => navigate("/game/pokemon")}>Pokémons</button>
          <button onClick={() => alert("Coming Soon")}>Trade</button>
          <button onClick={() => navigate("/game/marketplace")}>
            Marketplace
          </button>
          <button onClick={() => navigate("/game/mint")}>
            Minting <br /> <br />
            <h3>(TESTING ONLY)</h3>
          </button>
        </div>
      </div>
    </div>
  );
}
