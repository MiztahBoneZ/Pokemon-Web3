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
  const navigate = useNavigate();
  const db = getFirestore();

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
      alert(`Wallet connected: ${address}`);
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

    try {
      const randomId = Math.floor(Math.random() * 151) + 1;
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${randomId}`
      );
      const data = await response.json();

      const name = data.name;
      const sprite =
        data.sprites.other?.["official-artwork"]?.front_default ||
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

      const hatchedPokemon = {
        pokemonId: randomId,
        name,
        sprite,
        types,
        stats: randomizedStats,
        moves: selectedMoves,
        createdAt: new Date().toISOString(),
      };

      setPokemon(hatchedPokemon);

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

      alert(`You hatched ${name.toUpperCase()}!`);
    } catch (error) {
      console.error("Hatching failed:", error);
      alert("Hatching failed. Please try again.");
    } finally {
      setIsHatching(false);
    }
  };

  return (
    <div className="onboarding-wrapper">
      <div className="onboarding-container">
        <h1>Trainer Onboarding</h1>
        <h2>Connect Wallet & Hatch Your Starter Pokémon</h2>

        {!walletAddress ? (
          <button onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </button>
        ) : (
          <p style={{ color: "green" }}>Wallet: {walletAddress}</p>
        )}

        <button onClick={hatchPokemon} disabled={!walletAddress || isHatching}>
          {isHatching ? "Hatching…" : "Hatch Pokémon"}
        </button>

        {pokemon && (
          <div className="pokemon-display">
            <h3>You hatched {pokemon.name.toUpperCase()}!</h3>
            {pokemon.sprite && <img src={pokemon.sprite} alt={pokemon.name} />}
            <p>Type: {pokemon.types.join(" / ")}</p>
            <p>Moves: {pokemon.moves.join(", ")}</p>
            <p>Stats:</p>
            <ul>
              {Object.entries(pokemon.stats).map(([statName, value]) => (
                <li key={statName}>
                  {statName.toUpperCase()}: {value}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate("/game")}>Start Adventure</button>
          </div>
        )}
      </div>
    </div>
  );
}
