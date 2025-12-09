import React, { useState } from "react";
import "./PokemonStatsModal.css";

export default function PokemonStatsModal({ mon, close }) {
  const [moveDetails, setMoveDetails] = useState(null);

  if (!mon) return null;

  const typeColors = {
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

  const getExplorerURL = () => {
    if (!mon.nftTxHash) return null;

    const chain = mon.blockchain?.toLowerCase();

    if (chain === "ethereum") return `https://etherscan.io/tx/${mon.nftTxHash}`;
    if (chain === "polygon")
      return `https://polygonscan.com/tx/${mon.nftTxHash}`;
    if (chain === "bsc") return `https://bscscan.com/tx/${mon.nftTxHash}`;
    if (chain === "avalanche")
      return `https://snowtrace.io/tx/${mon.nftTxHash}`;

    return null;
  };

  const explorerURL = getExplorerURL();

  const formatName = () => {
    if (mon.nickname && mon.nickname.trim().length) {
      return mon.nickname.charAt(0).toUpperCase() + mon.nickname.slice(1);
    }
    return mon.name.toUpperCase();
  };

  const safeTypes = Array.isArray(mon.types) ? mon.types : ["normal"];

  const fetchMoveDetails = async (moveName) => {
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/move/${moveName}`);
      const data = await res.json();
      setMoveDetails(data);
    } catch (err) {
      console.error("Failed to fetch move:", err);
    }
  };

  return (
    <div className="stats-overlay" onClick={close}>
      <div className="stats-box" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={close}>
          X
        </button>

        <h2 className="stats-title">{formatName()}</h2>
        <img src={mon.sprite} alt={mon.name} className="stats-img" />

        <div className="stats-types">
          {safeTypes.map((t) => (
            <span
              className="stats-type-tag"
              key={t}
              style={{ background: typeColors[t] || "#777" }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* --- NFT INFO SECTION --- */}
        {mon.onChain && (
          <div className="stats-section nft-section">
            <h3>NFT DATA</h3>

            <div className="nft-info-row">
              <strong>Status:</strong> <span>On-chain</span>
            </div>

            {mon.blockchain && (
              <div className="nft-info-row">
                <strong>Blockchain:</strong> <span>{mon.blockchain}</span>
              </div>
            )}

            {mon.nftTokenId && (
              <div className="nft-info-row">
                <strong>Token ID:</strong> <span>{mon.nftTokenId}</span>
              </div>
            )}

            {mon.contractAddress && (
              <div className="nft-info-row">
                <strong>Contract:</strong> <span>{mon.contractAddress}</span>
              </div>
            )}

            {explorerURL && (
              <div className="nft-explorer">
                <a
                  href={explorerURL}
                  target="_blank"
                  rel="noreferrer"
                  className="explorer-btn"
                >
                  VIEW ON BLOCK EXPLORER
                </a>
              </div>
            )}
          </div>
        )}

        {/* --- BASE STATS --- */}
        <div className="stats-section">
          <h3>BASE STATS</h3>
          <div className="stats-list">
            {Object.entries(mon.stats).map(([key, val]) => (
              <div key={key} className="stats-row">
                <span>{key.toUpperCase()}</span>
                <span>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* --- MOVES --- */}
        <div className="stats-section">
          <h3>MOVES</h3>
          <div className="moves-grid">
            {mon.moves.map((m) => (
              <div
                key={m}
                className="move-card"
                onClick={() => fetchMoveDetails(m)}
                style={{
                  background: "#306230",
                  cursor: "pointer",
                }}
              >
                {m.toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        {/* --- MOVE DETAILS POPUP --- */}
        {moveDetails && (
          <div
            className="move-details-overlay"
            onClick={() => setMoveDetails(null)}
          >
            <div
              className="move-details-box"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="close-btn"
                onClick={() => setMoveDetails(null)}
              >
                X
              </button>
              <h3>{moveDetails.name.toUpperCase()}</h3>
              <p>Type: {moveDetails.type?.name}</p>
              <p>Power: {moveDetails.power ?? "—"}</p>
              <p>Accuracy: {moveDetails.accuracy ?? "—"}</p>
              <p>PP: {moveDetails.pp}</p>
              <p>
                Effect:{" "}
                {moveDetails.effect_entries?.[0]?.short_effect ||
                  "No effect info"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
