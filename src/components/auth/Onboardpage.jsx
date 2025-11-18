import React, { useState } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import { auth } from "../../Core/firebase";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import "./OnboardingStyle.css";

export default function OnboardingPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [pokemon, setPokemon] = useState(null);
  const [isHatching, setIsHatching] = useState(false);
  const [showEggAnimation, setShowEggAnimation] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [pokemonNickname, setPokemonNickname] = useState("");
  const [showNicknameInput, setShowNicknameInput] = useState(false);
  const navigate = useNavigate();
  const db = getFirestore();

  const getRarity = (stats) => {
    const total = Object.values(stats).reduce((sum, val) => sum + val, 0);
    if (total >= 600)
      return { tier: "Legendary", color: "#FFD700", glow: "#FFA500" };
    if (total >= 500)
      return { tier: "Epic", color: "#9D4EDD", glow: "#C77DFF" };
    if (total >= 450)
      return { tier: "Rare", color: "#4CC9F0", glow: "#7209B7" };
    if (total >= 400)
      return { tier: "Uncommon", color: "#06D6A0", glow: "#118AB2" };
    return { tier: "Common", color: "#CCC", glow: "#888" };
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected. Please install MetaMask.");
      return;
    }
    try {
      setIsConnecting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
      setIsConnecting(false);
      setCurrentStep(2);
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
      alert("Failed to connect wallet.");
    }
  };

  const hatchPokemon = async () => {
    if (!walletAddress) {
      alert("Connect wallet first.");
      return;
    }

    setIsHatching(true);
    setShowEggAnimation(true);

    try {
      // Simulate egg shaking animation
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const randomId = Math.floor(Math.random() * 151) + 1;
      const isShiny = Math.random() < 0.01; // 1% shiny chance

      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${randomId}`
      );
      const data = await response.json();

      const name = data.name;
      const sprite = isShiny
        ? data.sprites.other?.["official-artwork"]?.front_shiny ||
          data.sprites.front_shiny
        : data.sprites.other?.["official-artwork"]?.front_default ||
          data.sprites.front_default;

      const types = data.types.map((t) => t.type.name);

      const baseStats = data.stats.reduce((acc, s) => {
        acc[s.stat.name] = s.base_stat;
        return acc;
      }, {});

      const randomizedStats = {};
      for (const statName in baseStats) {
        const base = baseStats[statName];
        const variation = Math.floor(base * 0.2 * (Math.random() - 0.5));
        randomizedStats[statName] = base + variation;
      }

      const allMoves = data.moves.map((m) => m.move.name);
      const selectedMoves = allMoves
        .sort(() => 0.5 - Math.random())
        .slice(0, 4);

      const rarity = getRarity(randomizedStats);

      const hatchedPokemon = {
        pokemonId: randomId,
        name,
        nickname: "",
        sprite,
        types,
        stats: randomizedStats,
        moves: selectedMoves,
        rarity: rarity.tier,
        isShiny,
        createdAt: new Date().toISOString(),
      };

      setShowEggAnimation(false);
      setPokemon(hatchedPokemon);
      setShowConfetti(true);
      setCurrentStep(3);

      // Hide confetti after 3 seconds
      setTimeout(() => setShowConfetti(false), 3000);

      const user = auth.currentUser;

      if (user) {
        const userRef = doc(db, "users", user.uid);
        await setDoc(
          userRef,
          {
            wallet: walletAddress,
            hasCompletedOnboarding: true,
            UserFirebaseID: user.uid,
          },
          { merge: true }
        );

        // Save Pokémon data
        const pokemonId = crypto.randomUUID();
        const inventoryRef = doc(db, "users", user.uid, "inventory", pokemonId);

        await setDoc(inventoryRef, hatchedPokemon);
      }
    } catch (error) {
      console.error("Hatching failed:", error);
      alert("Hatching failed. Please try again.");
      setShowEggAnimation(false);
    } finally {
      setIsHatching(false);
    }
  };

  const saveNickname = async () => {
    if (!pokemonNickname.trim()) {
      alert("Please enter a nickname!");
      return;
    }

    const updatedPokemon = { ...pokemon, nickname: pokemonNickname };
    setPokemon(updatedPokemon);

    const user = auth.currentUser;
    if (user) {
      const inventoryRef = doc(
        db,
        "users",
        user.uid,
        "inventory",
        pokemon.pokemonId
      );
      await setDoc(inventoryRef, updatedPokemon, { merge: true });
    }

    setShowNicknameInput(false);
  };

  const getTypeColor = (type) => {
    const colors = {
      normal: "#A8A878",
      fire: "#F08030",
      water: "#6890F0",
      electric: "#F8D030",
      grass: "#78C850",
      ice: "#98D8D8",
      fighting: "#C03028",
      poison: "#A040A0",
      ground: "#E0C068",
      flying: "#A890F0",
      psychic: "#F85888",
      bug: "#A8B820",
      rock: "#B8A038",
      ghost: "#705898",
      dragon: "#7038F8",
      dark: "#705848",
      steel: "#B8B8D0",
      fairy: "#EE99AC",
    };
    return colors[type] || "#777";
  };

  // ... imports and state remain the same ...

  return (
    <div className="onboarding-wrapper">
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="onboarding-container">
        <h1 className="main-title">🎮 Trainer Onboarding</h1>

        <div className="progress-steps">
          <div
            className={`step ${currentStep >= 1 ? "active" : ""} ${
              currentStep > 1 ? "completed" : ""
            }`}
          >
            <div className="step-circle">1</div>
            <span>Connect Wallet</span>
          </div>
          <div className="step-line"></div>
          <div
            className={`step ${currentStep >= 2 ? "active" : ""} ${
              currentStep > 2 ? "completed" : ""
            }`}
          >
            <div className="step-circle">2</div>
            <span>Hatch Pokémon</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${currentStep >= 3 ? "active" : ""}`}>
            <div className="step-circle">3</div>
            <span>Start Adventure</span>
          </div>
        </div>

        {!walletAddress ? (
          <div className="step-content">
            <h2>🔗 Connect Your Wallet</h2>
            <p className="step-description">
              Connect your MetaMask wallet to begin your journey
            </p>
            <button
              className="primary-button"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <span className="spinner"></span> Connecting…
                </>
              ) : (
                "Connect Wallet"
              )}
            </button>
          </div>
        ) : !pokemon ? (
          <div className="egg-section">
            <div className="egg-content">
              <div className="wallet-connected">
                <span className="checkmark">✓</span>
                <span>Wallet Connected</span>
                <p className="wallet-address">
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                </p>
              </div>

              <h2>🥚 Hatch Your Starter</h2>
              <p className="step-description">
                Click the egg to hatch your random starter Pokémon! Every
                trainer gets a unique Pokémon to start their adventure.
              </p>
            </div>

            <div className="egg-display">
              {showEggAnimation ? (
                <div className="egg-hatching-container">
                  <div className="egg-wrapper">
                    <div className="egg shaking">
                      <div className="egg-shell"></div>
                      <div className="crack crack-1"></div>
                      <div className="crack crack-2"></div>
                      <div className="crack crack-3"></div>
                    </div>
                    <div className="egg-glow"></div>
                  </div>
                  <p className="hatching-text">Your egg is hatching...</p>
                </div>
              ) : (
                <div className="egg-container">
                  <button
                    className="egg-button"
                    onClick={hatchPokemon}
                    disabled={isHatching}
                  >
                    <div className="egg idle">
                      <div className="egg-shell"></div>
                    </div>
                  </button>
                  <p className="hint-text">Click the egg to hatch!</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="pokemon-reveal-section">
            <div className="reveal-animation">
              <h2 className="reveal-title">
                {pokemon.isShiny && (
                  <span className="shiny-badge">✨ SHINY!</span>
                )}
                Congratulations!
              </h2>
              {/* Pokémon card remains the same but now uses the new grid layout */}
              // Replace the pokemon-card div section with this complete code:
              <div
                className="pokemon-card"
                style={{
                  borderColor: getRarity(pokemon.stats).color,
                  boxShadow: `0 0 40px ${getRarity(pokemon.stats).glow}`,
                }}
              >
                <div className="card-header">
                  <h3 className="pokemon-name">
                    {pokemon.nickname || pokemon.name.toUpperCase()}
                    {pokemon.nickname && (
                      <span className="original-name">({pokemon.name})</span>
                    )}
                  </h3>
                  <span
                    className="rarity-badge"
                    style={{
                      backgroundColor: getRarity(pokemon.stats).color,
                    }}
                  >
                    {pokemon.rarity}
                  </span>
                </div>

                <div className="pokemon-image-container">
                  {pokemon.sprite && (
                    <img
                      src={pokemon.sprite}
                      alt={pokemon.name}
                      className={`pokemon-sprite ${
                        pokemon.isShiny ? "shiny-glow" : ""
                      }`}
                    />
                  )}
                </div>

                <div className="pokemon-types">
                  {pokemon.types.map((type) => (
                    <span
                      key={type}
                      className="type-badge"
                      style={{ backgroundColor: getTypeColor(type) }}
                    >
                      {type.toUpperCase()}
                    </span>
                  ))}
                </div>

                <div className="pokemon-stats">
                  <h4>Stats</h4>
                  <div className="stats-grid">
                    {Object.entries(pokemon.stats).map(([statName, value]) => (
                      <div key={statName} className="stat-bar">
                        <div className="stat-label">
                          {statName.replace("special-", "sp. ").toUpperCase()}
                        </div>
                        <div className="stat-value-container">
                          <div
                            className="stat-fill"
                            style={{
                              width: `${(value / 255) * 100}%`,
                              backgroundColor:
                                value >= 100
                                  ? "#4ade80"
                                  : value >= 70
                                  ? "#fbbf24"
                                  : "#ef4444",
                            }}
                          ></div>
                          <span className="stat-number">{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pokemon-moves">
                  <h4>Moves</h4>
                  <div className="moves-grid">
                    {pokemon.moves.map((move, idx) => (
                      <span key={idx} className="move-badge">
                        {move.replace("-", " ")}
                      </span>
                    ))}
                  </div>
                </div>

                {!showNicknameInput ? (
                  <button
                    className="secondary-button"
                    onClick={() => setShowNicknameInput(true)}
                  >
                    Give Nickname
                  </button>
                ) : (
                  <div className="nickname-input-container">
                    <input
                      type="text"
                      value={pokemonNickname}
                      onChange={(e) => setPokemonNickname(e.target.value)}
                      placeholder="Enter nickname..."
                      maxLength={12}
                      className="nickname-input"
                    />
                    <button className="small-button" onClick={saveNickname}>
                      Save
                    </button>
                    <button
                      className="small-button cancel"
                      onClick={() => setShowNicknameInput(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <button
                className="primary-button large"
                onClick={() => navigate("/game")}
              >
                🎮 Start Your Adventure!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
