import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { auth } from "../../Core/firebase";
import {
  getFirestore,
  collection,
  query,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import PokemonNFTABI from "./PokemonNFT.json";
import "./Marketplace.css";

const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS_FROM_REMIX";

export default function Marketplace() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterRarity, setFilterRarity] = useState("all");
  const db = getFirestore();

  useEffect(() => {
    checkWalletConnection();
    loadMarketplace();
  }, []);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setWalletAddress(address);
        }
      } catch (error) {
        console.error("Error checking wallet:", error);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
    } catch (error) {
      console.error("Wallet connection failed:", error);
      alert("Failed to connect wallet");
    }
  };

  const loadMarketplace = async () => {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        PokemonNFTABI.abi,
        provider
      );

      const listedTokenIds = await contract.getAllListings();
      console.log("Listed tokens:", listedTokenIds);

      const listingsData = [];

      for (const tokenId of listedTokenIds) {
        try {
          const listing = await contract.getListing(tokenId);
          if (!listing.isActive) continue;

          const pokemonData = await contract.getPokemonData(tokenId);
          const owner = await contract.ownerOf(tokenId);

          // Get Firebase data
          let firebaseData = null;
          try {
            const usersSnapshot = await getDocs(collection(db, "users"));

            for (const userDoc of usersSnapshot.docs) {
              const inventorySnapshot = await getDocs(
                collection(db, "users", userDoc.id, "inventory")
              );

              const found = inventorySnapshot.docs.find(
                (doc) => doc.data().nftTokenId === tokenId.toString()
              );

              if (found) {
                firebaseData = found.data();
                break;
              }
            }
          } catch (fbError) {
            console.log(
              "Firebase data not found for token",
              tokenId.toString()
            );
          }

          listingsData.push({
            tokenId: tokenId.toString(),
            price: listing.price.toString(),
            seller: listing.seller,
            owner: owner,
            pokemon: {
              pokemonId: Number(pokemonData.pokemonId),
              name: pokemonData.name,
              nickname: pokemonData.nickname,
              rarity: pokemonData.rarity,
              isShiny: pokemonData.isShiny,
              createdAt: Number(pokemonData.createdAt),
              sprite:
                firebaseData?.sprite ||
                `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonData.pokemonId}.png`,
              types: firebaseData?.types || [],
              stats: firebaseData?.stats || {},
              moves: firebaseData?.moves || [],
            },
            firebaseData: firebaseData, // Keep full data for transfer
          });
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
        }
      }

      console.log("Loaded listings:", listingsData);
      setListings(listingsData);
    } catch (error) {
      console.error("Error loading marketplace:", error);
      alert("Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  };

  const removePokemonFromSeller = async (tokenId, sellerAddress) => {
    try {
      console.log("Removing Pokemon from seller's Firebase...");

      const usersSnapshot = await getDocs(collection(db, "users"));
      let sellerUid = null;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (
          userData.wallet &&
          userData.wallet.toLowerCase() === sellerAddress.toLowerCase()
        ) {
          sellerUid = userDoc.id;
          break;
        }
      }

      if (!sellerUid) {
        console.log("Seller user not found in Firebase");
        return;
      }

      const inventorySnapshot = await getDocs(
        collection(db, "users", sellerUid, "inventory")
      );

      const pokemonDoc = inventorySnapshot.docs.find(
        (doc) => doc.data().nftTokenId === tokenId
      );

      if (pokemonDoc) {
        await deleteDoc(
          doc(db, "users", sellerUid, "inventory", pokemonDoc.id)
        );
        console.log("Removed Pokemon from seller's inventory");
      } else {
        console.log("Pokemon not found in seller's inventory");
      }
    } catch (error) {
      console.error("Error removing Pokemon from seller:", error);
    }
  };

  const addPokemonToBuyer = async (listing) => {
    try {
      console.log("Adding Pokemon to buyer's Firebase...");

      const user = auth.currentUser;
      if (!user) {
        console.log("User not logged in");
        return;
      }

      const pokemonData = listing.firebaseData || {
        pokemonId: listing.pokemon.pokemonId,
        name: listing.pokemon.name,
        nickname: listing.pokemon.nickname,
        sprite: listing.pokemon.sprite,
        types: listing.pokemon.types,
        stats: listing.pokemon.stats,
        moves: listing.pokemon.moves,
        rarity: listing.pokemon.rarity,
        isShiny: listing.pokemon.isShiny,
        createdAt: new Date(listing.pokemon.createdAt * 1000).toISOString(),
      };

      const pokemonFirebaseId = crypto.randomUUID();
      const inventoryRef = doc(
        db,
        "users",
        user.uid,
        "inventory",
        pokemonFirebaseId
      );

      await setDoc(inventoryRef, {
        ...pokemonData,
        nftTokenId: listing.tokenId,
        nftTxHash: listing.firebaseData?.nftTxHash || "",
        contractAddress: CONTRACT_ADDRESS,
        onChain: true,
        blockchain: "sepolia",
        purchasedAt: new Date().toISOString(),
        purchasePrice: ethers.formatEther(listing.price),
      });

      console.log("Added Pokemon to buyer's inventory");
    } catch (error) {
      console.error("Error adding Pokemon to buyer:", error);
    }
  };

  const buyNFT = async (listing) => {
    if (!walletAddress) {
      alert("Please connect your wallet first!");
      return;
    }

    if (listing.seller.toLowerCase() === walletAddress.toLowerCase()) {
      alert("You cannot buy your own NFT!");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to purchase!");
      return;
    }

    try {
      setBuying(listing.tokenId);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        PokemonNFTABI.abi,
        signer
      );

      console.log(
        "Buying NFT:",
        listing.tokenId,
        "for",
        ethers.formatEther(listing.price),
        "ETH"
      );

      const tx = await contract.buyNFT(listing.tokenId, {
        value: listing.price,
      });

      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Purchase complete on blockchain!");

      console.log("Syncing with Firebase...");

      await removePokemonFromSeller(listing.tokenId, listing.seller);

      await addPokemonToBuyer(listing);

      console.log("Firebase sync complete!");
      alert("Purchase successful! Check your collection! 🎉");

      // Reload marketplace
      await loadMarketplace();
    } catch (error) {
      console.error("Purchase failed:", error);
      if (error.code === "ACTION_REJECTED") {
        alert("Transaction cancelled");
      } else {
        alert(`Purchase failed: ${error.message}`);
      }
    } finally {
      setBuying(null);
    }
  };

  const getRarityColor = (rarity) => {
    const colors = {
      Legendary: "#FFD700",
      Epic: "#9D4EDD",
      Rare: "#4CC9F0",
      Uncommon: "#06D6A0",
      Common: "#CCC",
    };
    return colors[rarity] || "#CCC";
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

  // Filter and sort listings
  const filteredListings = listings
    .filter((listing) => {
      if (filterRarity === "all") return true;
      return listing.pokemon.rarity === filterRarity;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return Number(a.price) - Number(b.price);
      if (sortBy === "price-high") return Number(b.price) - Number(a.price);
      if (sortBy === "rarity") {
        const rarityOrder = {
          Legendary: 5,
          Epic: 4,
          Rare: 3,
          Uncommon: 2,
          Common: 1,
        };
        return (
          (rarityOrder[b.pokemon.rarity] || 0) -
          (rarityOrder[a.pokemon.rarity] || 0)
        );
      }
      return b.pokemon.createdAt - a.pokemon.createdAt; // newest first
    });

  return (
    <div className="marketplace-container">
      <header className="marketplace-header">
        <h1>🏪 Pokémon Marketplace</h1>
        <p className="subtitle">Buy and sell Pokémon NFTs</p>

        {!walletAddress ? (
          <button className="connect-wallet-btn" onClick={connectWallet}>
            Connect Wallet to Buy
          </button>
        ) : (
          <div className="wallet-info">
            <span className="wallet-badge">
              ✓ {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          </div>
        )}
      </header>

      <div className="marketplace-controls">
        <div className="filter-group">
          <label>Filter by Rarity:</label>
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value)}
          >
            <option value="all">All Rarities</option>
            <option value="Legendary">Legendary</option>
            <option value="Epic">Epic</option>
            <option value="Rare">Rare</option>
            <option value="Uncommon">Uncommon</option>
            <option value="Common">Common</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rarity">Rarity</option>
          </select>
        </div>

        <button
          className="refresh-btn"
          onClick={loadMarketplace}
          disabled={loading}
        >
          {loading ? "Loading..." : "🔄 Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading marketplace...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="empty-state">
          <h2>No Pokémon Listed Yet</h2>
          <p>Be the first to list a Pokémon for sale!</p>
        </div>
      ) : (
        <div className="marketplace-grid">
          {filteredListings.map((listing) => (
            <div
              key={listing.tokenId}
              className="marketplace-card"
              style={{ borderColor: getRarityColor(listing.pokemon.rarity) }}
            >
              <div className="card-badges">
                {listing.pokemon.isShiny && (
                  <span className="shiny-badge">✨ SHINY</span>
                )}
                <span
                  className="rarity-badge"
                  style={{
                    backgroundColor: getRarityColor(listing.pokemon.rarity),
                  }}
                >
                  {listing.pokemon.rarity}
                </span>
              </div>

              <img
                src={listing.pokemon.sprite}
                alt={listing.pokemon.name}
                className={`pokemon-image ${
                  listing.pokemon.isShiny ? "shiny" : ""
                }`}
              />

              <div className="card-content">
                <h3 className="pokemon-name">
                  {listing.pokemon.nickname ||
                    listing.pokemon.name.toUpperCase()}
                  {listing.pokemon.nickname && (
                    <span className="original-name">
                      ({listing.pokemon.name})
                    </span>
                  )}
                </h3>

                {listing.pokemon.types.length > 0 && (
                  <div className="pokemon-types">
                    {listing.pokemon.types.map((type) => (
                      <span
                        key={type}
                        className="type-badge"
                        style={{ backgroundColor: getTypeColor(type) }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                )}

                <div className="listing-info">
                  <div className="price-section">
                    <span className="price-label">Price</span>
                    <span className="price">
                      {ethers.formatEther(listing.price)} ETH
                    </span>
                  </div>

                  <div className="seller-info">
                    <span className="seller-label">Seller</span>
                    <span className="seller-address">
                      {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                    </span>
                  </div>
                </div>

                <button
                  className="buy-btn"
                  onClick={() => buyNFT(listing)}
                  disabled={
                    buying === listing.tokenId ||
                    !walletAddress ||
                    listing.seller.toLowerCase() === walletAddress.toLowerCase()
                  }
                >
                  {buying === listing.tokenId ? (
                    <>
                      <span className="spinner-small"></span> Buying...
                    </>
                  ) : listing.seller.toLowerCase() ===
                    walletAddress.toLowerCase() ? (
                    "Your Listing"
                  ) : !walletAddress ? (
                    "Connect Wallet"
                  ) : (
                    "Buy Now"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
