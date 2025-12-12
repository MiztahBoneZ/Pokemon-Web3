import React, { useState } from "react";
import { ethers } from "ethers";
import PokemonNFTABI from "../../Core/PokemonNFT.json";
import "./PokemonStatsModal.css";

const CONTRACT_ADDRESS = "0xF3E7AE62f5a8DBE879e70e94Acfa10E4D12354D7";

export default function PokemonStatsModal({ mon, close, onListingChange }) {
  const [moveDetails, setMoveDetails] = useState(null);
  const [showListingModal, setShowListingModal] = useState(false);
  const [listPrice, setListPrice] = useState("");
  const [processing, setProcessing] = useState(false);
  const [listingInfo, setListingInfo] = useState(null);

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

  // Check if NFT is listed on mount
  React.useEffect(() => {
    if (mon.onChain && mon.nftTokenId) {
      checkListing();
    }
  }, [mon]);

  const checkListing = async () => {
    try {
      if (!window.ethereum) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        PokemonNFTABI.abi,
        provider
      );

      const listing = await contract.getListing(mon.nftTokenId);

      if (listing.isActive) {
        setListingInfo({
          price: listing.price.toString(),
          seller: listing.seller,
        });
      }
    } catch (error) {
      console.error("Error checking listing:", error);
    }
  };

  const getExplorerURL = () => {
    if (!mon.nftTxHash) return null;

    const chain = mon.blockchain?.toLowerCase();

    if (chain === "sepolia")
      return `https://sepolia.etherscan.io/tx/${mon.nftTxHash}`;
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

  const handleListForSale = () => {
    setShowListingModal(true);
  };

  const confirmListing = async () => {
    if (!listPrice || parseFloat(listPrice) <= 0) {
      alert("Please enter a valid price!");
      return;
    }

    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      setProcessing(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        PokemonNFTABI.abi,
        signer
      );

      // Convert price to wei
      const priceInWei = ethers.parseEther(listPrice);

      console.log("Listing NFT:", mon.nftTokenId, "for", listPrice, "ETH");

      // Check if contract is approved
      const userAddress = await signer.getAddress();
      const approved = await contract.getApproved(mon.nftTokenId);
      const isApprovedForAll = await contract.isApprovedForAll(
        userAddress,
        CONTRACT_ADDRESS
      );

      if (approved !== CONTRACT_ADDRESS && !isApprovedForAll) {
        console.log("Approving contract...");
        const approveTx = await contract.approve(
          CONTRACT_ADDRESS,
          mon.nftTokenId
        );
        await approveTx.wait();
        console.log("Approved!");
      }

      // List the NFT
      const tx = await contract.listNFT(mon.nftTokenId, priceInWei);
      console.log("Transaction sent:", tx.hash);

      await tx.wait();
      console.log("Listed successfully!");

      alert("Listed for sale! 🎉");

      // Update listing info
      setListingInfo({
        price: priceInWei.toString(),
        seller: userAddress,
      });

      setShowListingModal(false);
      setListPrice("");

      // Notify parent component
      if (onListingChange) onListingChange();
    } catch (error) {
      console.error("Listing failed:", error);
      if (error.code === "ACTION_REJECTED") {
        alert("Transaction cancelled");
      } else {
        alert(`Listing failed: ${error.message}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const cancelListing = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      setProcessing(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        PokemonNFTABI.abi,
        signer
      );

      console.log("Cancelling listing for token:", mon.nftTokenId);

      const tx = await contract.cancelListing(mon.nftTokenId);
      console.log("Transaction sent:", tx.hash);

      await tx.wait();
      console.log("Listing cancelled!");

      alert("Listing cancelled!");
      setListingInfo(null);

      // Notify parent component
      if (onListingChange) onListingChange();
    } catch (error) {
      console.error("Cancel failed:", error);
      if (error.code === "ACTION_REJECTED") {
        alert("Transaction cancelled");
      } else {
        alert(`Failed to cancel: ${error.message}`);
      }
    } finally {
      setProcessing(false);
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
              <strong>Status:</strong>
              <span>{listingInfo ? "🏷️ Listed for Sale" : "On-chain"}</span>
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
                <strong>Contract:</strong>
                <span className="contract-address">
                  {mon.contractAddress.slice(0, 6)}...
                  {mon.contractAddress.slice(-4)}
                </span>
              </div>
            )}

            {listingInfo && (
              <div className="nft-info-row listing-price-row">
                <strong>Listed Price:</strong>
                <span className="listing-price">
                  {ethers.formatEther(listingInfo.price)} ETH
                </span>
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

            {/* Marketplace Actions */}
            <div className="marketplace-actions">
              {listingInfo ? (
                <button
                  className="cancel-listing-btn"
                  onClick={cancelListing}
                  disabled={processing}
                >
                  {processing ? "Processing..." : "Cancel Listing"}
                </button>
              ) : (
                <button
                  className="list-for-sale-btn"
                  onClick={handleListForSale}
                  disabled={processing}
                >
                  List for Sale
                </button>
              )}
            </div>
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

        {/* --- LISTING PRICE MODAL --- */}
        {showListingModal && (
          <div
            className="listing-modal-overlay"
            onClick={() => setShowListingModal(false)}
          >
            <div
              className="listing-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>List {formatName()} for Sale</h3>

              <div className="listing-modal-pokemon">
                <img src={mon.sprite} alt={mon.name} />
              </div>

              <div className="price-input-group">
                <label>Price (ETH)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.0"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  autoFocus
                />
                <small>Minimum: 0.001 ETH</small>
              </div>

              <div className="listing-modal-actions">
                <button
                  className="confirm-listing-btn"
                  onClick={confirmListing}
                  disabled={
                    processing || !listPrice || parseFloat(listPrice) <= 0
                  }
                >
                  {processing ? "Processing..." : "Confirm Listing"}
                </button>
                <button
                  className="cancel-modal-btn"
                  onClick={() => setShowListingModal(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
