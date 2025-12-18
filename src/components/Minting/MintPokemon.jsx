import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import { auth } from "../../Core/firebase";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import PokemonNFTABI from "../../Core/PokemonNFT.json";
import "./MintPokemon.css";

const CONTRACT_ADDRESS = "0xF3E7AE62f5a8DBE879e70e94Acfa10E4D12354D7";

export default function MintPokemon() {
  const [walletAddress, setWalletAddress] = useState("");
  const [pokemon, setPokemon] = useState(null);
  const [isHatching, setIsHatching] = useState(false);
  const [showEggAnimation, setShowEggAnimation] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [nftTokenId, setNftTokenId] = useState(null);
  const [mintingStatus, setMintingStatus] = useState("");
  const [mintCount, setMintCount] = useState(0);
  const navigate = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    if (!window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();

      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        // Check network
        const network = await provider.getNetwork();
        if (network.chainId === 11155111n) {
          setWalletAddress(address);
        }
      }
    } catch (error) {
      console.error("Error checking wallet:", error);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected. Please install MetaMask extension.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Ensure on Sepolia
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) {
        alert("Please switch to Sepolia test network in MetaMask!");
        return;
      }

      setWalletAddress(address);
    } catch (err) {
      console.error(err);
      alert("Failed to connect wallet.");
    }
  };

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

    const user = auth.currentUser;
    if (!user) {
      alert("Please log in first!");
      return;
    }

    setIsHatching(true);
    setShowEggAnimation(true);
    setPokemon(null);
    setNftTokenId(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));

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

      setShowEggAnimation(false);
      setPokemon(hatchedPokemon);
      setShowConfetti(true);

      setTimeout(() => setShowConfetti(false), 3000);

      const { tokenId, txHash } = await mintNFT(hatchedPokemon);

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

      setMintCount((prev) => prev + 1);
      console.log("Saved to Firebase successfully!");
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

  const mintAnother = () => {
    setPokemon(null);
    setNftTokenId(null);
    setShowConfetti(false);
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
    <div className="mint-page-wrapper">
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

      <div className="mint-container">
        <div className="mint-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className="mint-title">Hatch New Pokémon</h1>
          {mintCount > 0 && (
            <div className="mint-counter">Minted this session: {mintCount}</div>
          )}
        </div>

        {!walletAddress ? (
          <div className="connect-section">
            <div className="connect-card">
              <h2>Connect Your Wallet</h2>
              <p>Connect MetaMask to start hatching Pokémon NFTs</p>
              <button className="connect-wallet-btn" onClick={connectWallet}>
                Connect Wallet
              </button>
            </div>
          </div>
        ) : !pokemon ? (
          <div className="hatch-section">
            <div className="wallet-connected">
              <span className="checkmark">✓</span>
              <span>
                Connected: {walletAddress.slice(0, 6)}...
                {walletAddress.slice(-4)}
              </span>
            </div>

            <div className="hatch-card">
              <h2>Hatch a Random Pokémon</h2>
              <p className="hatch-description">
                Each hatch gives you a unique Pokémon NFT with randomized stats!
              </p>
              <p className="hatch-info">
                • Random Gen 1 Pokémon (1-151)
                <br />
                • 1% chance for Shiny ✨<br />
                • Unique randomized stats
                <br />
                • 4 random moves
                <br />• Minted as NFT on Sepolia
              </p>

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
          </div>
        ) : (
          <div className="reveal-section">
            <div className="reveal-card">
              <h2 className="reveal-title">
                {pokemon.isShiny && (
                  <span className="shiny-badge">✨ SHINY!</span>
                )}
                Congratulations!
              </h2>

              {nftTokenId && (
                <div className="nft-badge">
                  🎫 NFT Token ID: #{nftTokenId}
                  <a
                    href={`https://testnets.opensea.io/assets/sepolia/${CONTRACT_ADDRESS}/${nftTokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opensea-link"
                  >
                    View on OpenSea ↗
                  </a>
                </div>
              )}

              <div
                className="pokemon-card"
                style={{
                  borderColor: getRarity(pokemon.stats).color,
                  boxShadow: `0 0 40px ${getRarity(pokemon.stats).glow}`,
                }}
              >
                <div className="card-header">
                  <h3 className="pokemon-name">{pokemon.name.toUpperCase()}</h3>
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
              </div>

              <div className="action-buttons">
                <button
                  className="view-collection-btn"
                  onClick={() => navigate(-1)}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
