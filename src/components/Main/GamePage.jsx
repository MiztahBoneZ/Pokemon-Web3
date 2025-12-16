import React, { useEffect, useState } from "react";
import { auth } from "../../Core/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./GamePage.css";

export default function GamePage() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [walletAddress, setWalletAddress] = useState("");

  const [hoverSound] = useState(new Audio("/SFX/SFX_SWAP.wav"));
  const [clickSound] = useState(new Audio("/SFX/SFX_SWITCH.wav"));

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
    hoverSound.volume = 0.1;
    clickSound.volume = 0.4;

    getAccount();
    window.ethereum?.on("accountsChanged", (accounts) => {
      setWalletAddress(accounts[0] || "");
    });
    return () => {
      window.ethereum?.removeListener("accountsChanged", getAccount);
    };
  }, []);

  const playHoverSound = () => {
    hoverSound.currentTime = 0;
    hoverSound.play().catch((e) => console.log("Audio play failed:", e));
  };

  const playClickSound = () => {
    clickSound.currentTime = 0;
    clickSound.play().catch((e) => console.log("Audio play failed:", e));
  };

  const handleSignOut = async () => {
    playClickSound();
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleNavigation = (path) => {
    playClickSound();
    navigate(path);
  };

  const handleAlert = (message) => {
    playClickSound();
    alert(message);
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
        <button
          className="signout-btn"
          onClick={handleSignOut}
          onMouseEnter={playHoverSound}
        >
          Sign Out
        </button>
      </div>
      <h1 className="menu-title" data-text="Pokemon Dungeons">
        Pokemon <br />
        Dungeons
      </h1>
      <div className="menu-container">
        <div className="menu-buttons">
          <button
            onClick={() => handleNavigation("/game/teamselect")}
            onMouseEnter={playHoverSound}
          >
            Start Adventure
          </button>
          <button
            onClick={() => handleNavigation("/game/pokemon")}
            onMouseEnter={playHoverSound}
          >
            Pokémons
          </button>
          <button
            onClick={() => handleAlert("Coming Soon")}
            onMouseEnter={playHoverSound}
          >
            Trade
          </button>
          <button
            onClick={() => handleNavigation("/game/marketplace")}
            onMouseEnter={playHoverSound}
          >
            Marketplace
          </button>
          <button
            onClick={() => handleNavigation("/game/mint")}
            onMouseEnter={playHoverSound}
          >
            Minting <br /> <br />
            <h3>(TESTING ONLY)</h3>
          </button>
        </div>
      </div>
    </div>
  );
}
