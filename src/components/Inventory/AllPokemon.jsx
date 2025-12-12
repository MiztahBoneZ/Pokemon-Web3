import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { auth, frdb } from "../../Core/firebase";
import { collection, getDocs } from "firebase/firestore";
import PokemonNFTABI from "../../Core/PokemonNFT.json";
import "./AllPokemon.css";
import PokemonStatsModal from "./PokemonStatsModal.jsx";

const CONTRACT_ADDRESS = "0xF3E7AE62f5a8DBE879e70e94Acfa10E4D12354D";

export default function AllPokemon({ back }) {
  const navigate = useNavigate();
  const [monList, setMonList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMon, setSelectedMon] = useState(null);
  const [listingStatuses, setListingStatuses] = useState({});

  useEffect(() => {
    loadPokemon();
  }, []);

  const loadPokemon = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDocs(
      collection(frdb, "users", user.uid, "inventory")
    );

    const sorted = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const A = a.createdAt || "";
        const B = b.createdAt || "";
        return B.localeCompare(A);
      });

    setMonList(sorted);

    // Check listing status for NFTs
    if (window.ethereum) {
      await checkListingStatuses(sorted);
    }

    setLoading(false);
  };

  const checkListingStatuses = async (pokemon) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        PokemonNFTABI.abi,
        provider
      );

      const statuses = {};

      for (const mon of pokemon) {
        if (mon.onChain && mon.nftTokenId) {
          try {
            const listing = await contract.getListing(mon.nftTokenId);
            if (listing.isActive) {
              statuses[mon.id] = {
                isListed: true,
                price: listing.price.toString(),
              };
            }
          } catch (error) {
            console.error(
              `Error checking listing for ${mon.nftTokenId}:`,
              error
            );
          }
        }
      }

      setListingStatuses(statuses);
    } catch (error) {
      console.error("Error checking listing statuses:", error);
    }
  };

  const handleListingChange = () => {
    // Reload pokemon and their listing statuses
    loadPokemon();
  };

  const getTypeColor = (t) =>
    ({
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
    }[t] || "#777");

  const formatName = (mon) => {
    if (mon.nickname && mon.nickname.trim().length) {
      return mon.nickname.charAt(0).toUpperCase() + mon.nickname.slice(1);
    }
    return mon.name.toUpperCase();
  };

  if (loading) return <div className="poke-loading">LOADING…</div>;

  return (
    <div className="all-poke-page">
      <div className="top-header">
        <button className="top-back-btn" onClick={() => navigate(-1)}>
          GO BACK
        </button>
        <h2 className="top-title">POKéMON STORAGE</h2>
      </div>

      <div className="all-poke-wrapper">
        <div className="poke-grid">
          {monList.length ? (
            monList.map((m) => {
              const types = Array.isArray(m.types) ? m.types : ["normal"];
              const isListed = listingStatuses[m.id]?.isListed;
              const listingPrice = listingStatuses[m.id]?.price;

              return (
                <div
                  key={m.id}
                  className={`poke-card ${m.isShiny ? "shiny" : ""} ${
                    isListed ? "listed" : ""
                  }`}
                  style={{ borderColor: getTypeColor(types[0]) }}
                  onClick={() => setSelectedMon(m)}
                >
                  {/* Badges Container */}
                  <div className="badges-container">
                    {/* NFT badge */}
                    {m.onChain && <div className="nft-badge">NFT</div>}

                    {/* Listed badge */}
                    {isListed && (
                      <div className="listed-badge">
                        🏷️ {ethers.formatEther(listingPrice)} ETH
                      </div>
                    )}
                  </div>

                  <img src={m.sprite} alt={m.name} />
                  <div className="poke-name">{formatName(m)}</div>
                  <div className="poke-types">
                    {types.map((t) => (
                      <span
                        key={t}
                        className="type-tag"
                        style={{ background: getTypeColor(t) }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="poke-rarity">{m.rarity}</div>
                </div>
              );
            })
          ) : (
            <p className="empty-box">How did you get here without a Pokémon?</p>
          )}
        </div>
      </div>

      {selectedMon && (
        <PokemonStatsModal
          mon={selectedMon}
          close={() => setSelectedMon(null)}
          onListingChange={handleListingChange}
        />
      )}
    </div>
  );
}
