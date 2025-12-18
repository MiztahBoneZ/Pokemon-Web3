import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import { auth } from "../../Core/firebase";
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  getDoc,
} from "firebase/firestore";
import "./OnboardingStyle.css";

import PokemonNFTABI from "../../Core/PokemonNFT.json";
const CONTRACT_ADDRESS = "0xF3E7AE62f5a8DBE879e70e94Acfa10E4D12354D7";

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
  const [isMinting, setIsMinting] = useState(false);
  const [nftTokenId, setNftTokenId] = useState(null);
  const [mintingStatus, setMintingStatus] = useState("");
  const navigate = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    const checkUser = async () => {
      const user = auth.currentUser;

      if (!user) {
        alert("Please login first!");
        navigate("/");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists() && userDoc.data().hasCompletedOnboarding) {
        navigate("/game");
      }
    };

    checkUser();
  }, [navigate, db]);

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
      alert("MetaMask not detected. Please install MetaMask extension.");
      return;
    }

    if (!auth.currentUser) {
      alert("Please login first!");
      navigate("/");
      return;
    }

    try {
      setIsConnecting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) {
        alert("Wrong Chain! Connect to a TestNet.");
        setIsConnecting(false);
        return;
      }

      setWalletAddress(address);
      setIsConnecting(false);
      setCurrentStep(2);
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
      alert("Failed to connect wallet.");
    }
  };

  const createMetadataURI = (metadata) => {
    const nftMetadata = {
      name: `${metadata.name.charAt(0).toUpperCase() + metadata.name.slice(1)}${
        metadata.isShiny ? " ✨" : ""
      }`,
      description: `A ${metadata.rarity} ${
        metadata.isShiny ? "Shiny " : ""
      }Pokémon! Hatched with unique stats and moves.`,
      image: metadata.sprite,
      external_url: `https://pokeapi.co/api/v2/pokemon/${metadata.pokemonId}`,
      attributes: [
        { trait_type: "Pokemon ID", value: metadata.pokemonId },
        { trait_type: "Rarity", value: metadata.rarity },
        { trait_type: "Shiny", value: metadata.isShiny ? "Yes" : "No" },
        { trait_type: "Types", value: metadata.types.join(", ") },
        { trait_type: "HP", value: metadata.stats.hp },
        { trait_type: "Attack", value: metadata.stats.attack },
        { trait_type: "Defense", value: metadata.stats.defense },
        {
          trait_type: "Special Attack",
          value: metadata.stats["special-attack"],
        },
        {
          trait_type: "Special Defense",
          value: metadata.stats["special-defense"],
        },
        { trait_type: "Speed", value: metadata.stats.speed },
        ...metadata.moves.map((move, idx) => ({
          trait_type: `Move ${idx + 1}`,
          value: move.replace("-", " "),
        })),
      ],
    };

    const jsonString = JSON.stringify(nftMetadata);
    const base64 = btoa(unescape(encodeURIComponent(jsonString)));
    return `data:application/json;base64,${base64}`;
  };

  const mintNFT = async (pokemonData) => {
    try {
      setIsMinting(true);
      setMintingStatus("Preparing metadata...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        PokemonNFTABI.abi,
        signer
      );

      setMintingStatus("Creating token URI...");
      const tokenURI = createMetadataURI(pokemonData);

      setMintingStatus("Sending transaction to blockchain...");
      console.log("Minting NFT with data:", {
        to: walletAddress,
        pokemonId: pokemonData.pokemonId,
        name: pokemonData.name,
        rarity: pokemonData.rarity,
        isShiny: pokemonData.isShiny,
      });

      const tx = await contract.mintPokemon(
        walletAddress,
        tokenURI,
        pokemonData.pokemonId,
        pokemonData.name,
        pokemonData.nickname || "",
        pokemonData.rarity,
        pokemonData.isShiny
      );

      console.log("Transaction sent:", tx.hash);
      setMintingStatus("Waiting for confirmation...");

      const receipt = await tx.wait();
      console.log("Transaction confirmed!", receipt);

      setMintingStatus("Extracting token ID...");

      let tokenId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === "PokemonMinted") {
            tokenId = parsed.args.tokenId.toString();
            console.log("Found NFT Token ID:", tokenId);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (tokenId !== null) {
        setNftTokenId(tokenId);
      }

      setMintingStatus("Success!");
      setIsMinting(false);

      return { tokenId, txHash: tx.hash };
    } catch (error) {
      console.error("NFT minting failed:", error);
      setIsMinting(false);
      setMintingStatus("");

      if (error.code === "ACTION_REJECTED") {
        throw new Error("You rejected the transaction in MetaMask");
      } else if (error.message.includes("insufficient funds")) {
        throw new Error("Insufficient Funds");
      } else if (error.message.includes("wrong network")) {
        throw new Error("Please switch to Sepolia test network in MetaMask");
      } else {
        throw new Error(error.reason || error.message || "Minting failed");
      }
    }
  };

  const hatchPokemon = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first!");
      return;
    }

    setIsHatching(true);
    setShowEggAnimation(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log("Generating random Pokémon...");

      const randomId = Math.floor(Math.random() * 151) + 1;
      const isShiny = Math.random() < 0.01;

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

      console.log(
        "Pokémon generated:",
        hatchedPokemon.name,
        "Rarity:",
        hatchedPokemon.rarity
      );

      setShowEggAnimation(false);
      setPokemon(hatchedPokemon);
      setShowConfetti(true);
      setCurrentStep(3);

      setTimeout(() => setShowConfetti(false), 3000);

      console.log("Starting blockchain mint...");
      const { tokenId, txHash } = await mintNFT(hatchedPokemon);
      console.log("NFT minted! Token ID:", tokenId, "Tx:", txHash);

      const user = auth.currentUser;
      if (user) {
        console.log("Saving to Firebase...");

        const userRef = doc(db, "users", user.uid);
        await setDoc(
          userRef,
          {
            wallet: walletAddress.toLowerCase(), // Store in lowercase for comparison
            hasCompletedOnboarding: true,
            UserFirebaseID: user.uid,
          },
          { merge: true }
        );

        const pokemonFirebaseId = crypto.randomUUID();
        const inventoryRef = doc(
          db,
          "users",
          user.uid,
          "inventory",
          pokemonFirebaseId
        );

        await setDoc(inventoryRef, {
          ...hatchedPokemon,
          nftTokenId: tokenId,
          nftTxHash: txHash,
          contractAddress: CONTRACT_ADDRESS,
          onChain: true,
          blockchain: "sepolia",
        });

        console.log("Saved to Firebase successfully!");
      }
    } catch (error) {
      console.error("Hatching/Minting failed:", error);
      alert(`Failed to hatch Pokémon: ${error.message}`);
      setShowEggAnimation(false);
      setPokemon(null);
      setShowConfetti(false);
    } finally {
      setIsHatching(false);
      setMintingStatus("");
    }
  };

  const saveNickname = async () => {
    if (!pokemonNickname.trim()) {
      alert("Please enter a nickname!");
      return;
    }

    try {
      setIsMinting(true);
      setMintingStatus("Updating nickname on blockchain...");

      if (nftTokenId) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          PokemonNFTABI.abi,
          signer
        );

        console.log(
          "Updating nickname for token",
          nftTokenId,
          "to",
          pokemonNickname
        );
        const tx = await contract.updateNickname(nftTokenId, pokemonNickname);

        setMintingStatus("Waiting for confirmation...");
        await tx.wait();

        console.log("Nickname updated on-chain!");
      }

      const updatedPokemon = { ...pokemon, nickname: pokemonNickname };
      setPokemon(updatedPokemon);

      const user = auth.currentUser;
      if (user) {
        const inventorySnapshot = await getDocs(
          collection(db, "users", user.uid, "inventory")
        );
        const pokemonDoc = inventorySnapshot.docs.find(
          (doc) => doc.data().nftTokenId === nftTokenId
        );

        if (pokemonDoc) {
          await setDoc(
            doc(db, "users", user.uid, "inventory", pokemonDoc.id),
            { nickname: pokemonNickname },
            { merge: true }
          );
          console.log("Nickname updated in Firebase");
        }
      }

      setShowNicknameInput(false);
      setIsMinting(false);
      setMintingStatus("");
    } catch (error) {
      console.error("Failed to save nickname:", error);
      setIsMinting(false);
      setMintingStatus("");

      if (error.code === "ACTION_REJECTED") {
        alert("You cancelled the transaction");
      } else {
        alert(`Failed to update nickname: ${error.message}`);
      }
    }
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

      {isMinting && (
        <div className="minting-overlay">
          <div className="minting-modal">
            <div className="spinner"></div>
            <h3>{mintingStatus || "Processing..."}</h3>
            <p>Please confirm the transaction in MetaMask</p>
            <p className="minting-note">This may take 15-30 seconds</p>
          </div>
        </div>
      )}

      <div className="onboarding-container">
        <h1 className="main-title">Trainer Onboarding</h1>

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
            <span>Hatch NFT</span>
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
              Connect your MetaMask wallet to complete registration
            </p>
            <p className="wallet-lock-notice">
              ⚠️ This wallet will be permanently linked to your account
            </p>
            <p className="network-warning">
              Make sure you're on Sepolia test network
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

              <h2>Hatch Your Starter NFT</h2>
              <p className="step-description">
                Click the egg to hatch your random starter Pokémon! Onboarding
                is limited to only Generation 1 Pokemons.
              </p>
              <p className="network-warning">
                Requires testnet ETH for gas. Get free ETH from faucets if
                needed!
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
                    disabled={isMinting}
                  >
                    Give Nickname (Updates Blockchain)
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
                    <button
                      className="small-button"
                      onClick={saveNickname}
                      disabled={isMinting}
                    >
                      {isMinting ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="small-button cancel"
                      onClick={() => setShowNicknameInput(false)}
                      disabled={isMinting}
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
                Start Your Adventure!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
