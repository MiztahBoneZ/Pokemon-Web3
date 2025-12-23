// import React, { useState, useEffect } from "react";
// import { ethers } from "ethers";
// import { auth } from "../../Core/firebase";
// import { getFirestore, doc, setDoc } from "firebase/firestore";
// import PokemonNFTABI from "../../Core/PokemonNFT.json";
// import "./Battle.css";

// const CONTRACT_ADDRESS = "0xF3E7AE62f5a8DBE879e70e94Acfa10E4D12354D7";

// const BIOMES = {
//   forest: {
//     name: "Grasslands",
//     types: ["grass", "bug", "normal"],
//     color: "#78C850",
//   },
//   ocean: {
//     name: "Ocean",
//     types: ["water"],
//     color: "#6890F0",
//   },
//   volcano: {
//     name: "Volcanic",
//     types: ["fire", "rock", "ground"],
//     color: "#F08030",
//   },
//   powerPlant: {
//     name: "Power Plant",
//     types: ["electric", "steel"],
//     color: "#F8D030",
//   },
//   hauntedTower: {
//     name: "Haunted Tower",
//     types: ["ghost", "dark", "psychic"],
//     color: "#705898",
//   },
//   iceCave: {
//     name: "Icy Caverns",
//     types: ["ice"],
//     color: "#98D8D8",
//   },
//   mountain: {
//     name: "Mountains",
//     types: ["fighting", "rock", "flying"],
//     color: "#B8A038",
//   },
//   fairy: {
//     name: "Fairy Garden",
//     types: ["fairy", "grass"],
//     color: "#EE99AC",
//   },
// };

// const TYPE_CHART = {
//   normal: { weak: ["fighting"], strong: [] },
//   fire: {
//     weak: ["water", "rock", "ground"],
//     strong: ["grass", "ice", "bug", "steel"],
//   },
//   water: { weak: ["electric", "grass"], strong: ["fire", "ground", "rock"] },
//   electric: { weak: ["ground"], strong: ["water", "flying"] },
//   grass: {
//     weak: ["fire", "ice", "bug", "flying"],
//     strong: ["water", "ground", "rock"],
//   },
//   ice: {
//     weak: ["fire", "fighting", "rock", "steel"],
//     strong: ["grass", "ground", "flying", "dragon"],
//   },
//   fighting: {
//     weak: ["flying", "psychic", "fairy"],
//     strong: ["normal", "ice", "rock", "dark", "steel"],
//   },
//   poison: { weak: ["ground", "psychic"], strong: ["grass", "fairy"] },
//   ground: {
//     weak: ["water", "grass", "ice"],
//     strong: ["fire", "electric", "poison", "rock", "steel"],
//   },
//   flying: {
//     weak: ["electric", "ice", "rock"],
//     strong: ["grass", "fighting", "bug"],
//   },
//   psychic: { weak: ["bug", "ghost", "dark"], strong: ["fighting", "poison"] },
//   bug: {
//     weak: ["fire", "flying", "rock"],
//     strong: ["grass", "psychic", "dark"],
//   },
//   rock: {
//     weak: ["water", "grass", "fighting", "ground", "steel"],
//     strong: ["fire", "ice", "flying", "bug"],
//   },
//   ghost: { weak: ["ghost", "dark"], strong: ["psychic", "ghost"] },
//   dragon: { weak: ["ice", "dragon", "fairy"], strong: ["dragon"] },
//   dark: { weak: ["fighting", "bug", "fairy"], strong: ["psychic", "ghost"] },
//   steel: {
//     weak: ["fire", "fighting", "ground"],
//     strong: ["ice", "rock", "fairy"],
//   },
//   fairy: { weak: ["poison", "steel"], strong: ["fighting", "dragon", "dark"] },
// };

// export default function Battle({ team, floor, onBattleEnd, onCapture }) {
//   const [playerTeam, setPlayerTeam] = useState([]);
//   const [activePlayerIndex, setActivePlayerIndex] = useState(0);
//   const [wildPokemon, setWildPokemon] = useState(null);
//   const [battleLog, setBattleLog] = useState([]);
//   const [isPlayerTurn, setIsPlayerTurn] = useState(true);
//   const [battlePhase, setBattlePhase] = useState("intro");
//   const [selectedMove, setSelectedMove] = useState(null);
//   const [isAnimating, setIsAnimating] = useState(false);
//   const [currentBiome, setCurrentBiome] = useState(null);
//   const [captureChance, setCaptureChance] = useState(0);
//   const [isMinting, setIsMinting] = useState(false);
//   const db = getFirestore();

//   useEffect(() => {
//     console.log("Battle received team prop:", team);
//     console.log("First pokemon in battle:", team[0]);
//     console.log("First pokemon types:", team[0]?.types);

//     if (playerTeam.length === 0 && team.length > 0) {
//       const initializedTeam = team.map((pokemon) => ({
//         ...pokemon,
//         sessionLevel: pokemon.sessionLevel || 1,
//         currentHP: pokemon.currentHP || pokemon.stats.hp,
//         maxHP: pokemon.maxHP || pokemon.stats.hp,
//         currentStats: pokemon.currentStats || { ...pokemon.stats },
//         expGained: pokemon.expGained || 0,
//       }));
//       setPlayerTeam(initializedTeam);
//     } else if (playerTeam.length > 0) {
//       initializeBattle();
//     }
//   }, [floor, team.length, playerTeam.length]);

//   const initializeBattle = async () => {
//     setBattlePhase("intro");
//     setBattleLog([]);
//     setIsPlayerTurn(true);
//     setIsAnimating(false);
//     setSelectedMove(null);

//     if (playerTeam.length > 0) {
//       const healedTeam = playerTeam.map((pokemon) => ({
//         ...pokemon,
//         currentHP: Math.min(
//           pokemon.currentHP + Math.floor(pokemon.maxHP * 0.2),
//           pokemon.maxHP
//         ),
//       }));
//       setPlayerTeam(healedTeam);

//       const firstAlive = healedTeam.findIndex((p) => p.currentHP > 0);
//       if (firstAlive !== -1) {
//         setActivePlayerIndex(firstAlive);
//       }
//     }

//     const biomeKeys = Object.keys(BIOMES);
//     const randomBiome = biomeKeys[Math.floor(Math.random() * biomeKeys.length)];
//     setCurrentBiome(BIOMES[randomBiome]);

//     const wild = await generateWildPokemon(floor, BIOMES[randomBiome]);
//     setWildPokemon(wild);

//     addLog(`A wild ${wild.name.toUpperCase()} appeared!`);
//     addLog(`Biome: ${BIOMES[randomBiome].name}`);

//     setTimeout(() => setBattlePhase("battle"), 2000);
//   };

//   const generateWildPokemon = async (floor, biome) => {
//     try {
//       const allPokemon = [];
//       for (let id = 1; id <= 649; id++) {
//         allPokemon.push(id);
//       }

//       const randomId =
//         allPokemon[Math.floor(Math.random() * allPokemon.length)];

//       const shinyChance = biome.name.includes("✨") ? 0.05 : 0.02;
//       const isShiny = Math.random() < shinyChance;

//       const response = await fetch(
//         `https://pokeapi.co/api/v2/pokemon/${randomId}`
//       );
//       const data = await response.json();

//       const name = data.name;
//       const sprite = isShiny
//         ? data.sprites.other?.["official-artwork"]?.front_shiny ||
//           data.sprites.front_shiny
//         : data.sprites.other?.["official-artwork"]?.front_default ||
//           data.sprites.front_default;

//       const types = data.types.map((t) => t.type.name);

//       const baseStats = data.stats.reduce((acc, s) => {
//         acc[s.stat.name] = s.base_stat;
//         return acc;
//       }, {});

//       const randomizedStats = {};
//       for (const statName in baseStats) {
//         const base = baseStats[statName];
//         const variation = Math.floor(base * 0.2 * (Math.random() - 0.5));
//         randomizedStats[statName] = Math.max(1, base + variation);
//       }

//       const allMoves = data.moves.map((m) => m.move.name);
//       const selectedMoves = allMoves
//         .sort(() => 0.5 - Math.random())
//         .slice(0, 4);

//       const total = Object.values(randomizedStats).reduce(
//         (sum, val) => sum + val,
//         0
//       );
//       const rarity = getRarity(total);

//       const level = Math.max(1, floor);
//       const scaledStats = {};
//       for (const statName in randomizedStats) {
//         scaledStats[statName] = Math.floor(
//           randomizedStats[statName] + level * 3
//         );
//       }

//       const maxHP = Math.floor(randomizedStats.hp + level * 5);

//       return {
//         pokemonId: randomId,
//         name,
//         nickname: "",
//         sprite,
//         types,
//         baseStats: randomizedStats,
//         stats: scaledStats,
//         moves: selectedMoves,
//         rarity: rarity.tier,
//         isShiny,
//         level,
//         currentHP: maxHP,
//         maxHP,
//         createdAt: new Date().toISOString(),
//       };
//     } catch (error) {
//       console.error("Failed to generate wild Pokémon:", error);
//       return null;
//     }
//   };

//   const getRarity = (totalStats) => {
//     if (totalStats >= 600) return { tier: "Legendary", color: "#FFD700" };
//     if (totalStats >= 500) return { tier: "Epic", color: "#9D4EDD" };
//     if (totalStats >= 450) return { tier: "Rare", color: "#4CC9F0" };
//     if (totalStats >= 400) return { tier: "Uncommon", color: "#06D6A0" };
//     return { tier: "Common", color: "#CCC" };
//   };

//   const getTypeEffectiveness = (moveType, defenderTypes) => {
//     let multiplier = 1;

//     defenderTypes.forEach((defType) => {
//       if (TYPE_CHART[moveType]?.strong?.includes(defType)) {
//         multiplier *= 2;
//       }
//       if (TYPE_CHART[moveType]?.weak?.includes(defType)) {
//         multiplier *= 0.5;
//       }
//     });

//     return multiplier;
//   };

//   const calculateDamage = (attacker, defender, moveName) => {
//     const move = { name: moveName, power: 50 };
//     const level = attacker.level || attacker.sessionLevel || 1;
//     const attack = attacker.currentStats?.attack || attacker.stats.attack;
//     const defense = defender.currentStats?.defense || defender.stats.defense;
//     const power = move.power;
//     const moveType = attacker.types[0];
//     const typeMultiplier = getTypeEffectiveness(moveType, defender.types);
//     const random = 0.85 + Math.random() * 0.15;

//     const damage = Math.floor(
//       ((((2 * level) / 5 + 2) * power * (attack / defense)) / 50 + 2) *
//         typeMultiplier *
//         random
//     );

//     return {
//       damage: Math.max(1, damage),
//       typeMultiplier,
//     };
//   };

//   const addLog = (message) => {
//     setBattleLog((prev) => [...prev, message]);
//   };

//   const playerAttack = async (moveIndex) => {
//     if (!isPlayerTurn || isAnimating) return;

//     setIsAnimating(true);
//     const activePokemon = playerTeam[activePlayerIndex];
//     const move = activePokemon.moves[moveIndex];

//     const { damage, typeMultiplier } = calculateDamage(
//       activePokemon,
//       wildPokemon,
//       move
//     );

//     setWildPokemon((prev) => ({
//       ...prev,
//       currentHP: Math.max(0, prev.currentHP - damage),
//     }));

//     let effectiveness = "";
//     if (typeMultiplier > 1) effectiveness = " It's super effective!";
//     if (typeMultiplier < 1) effectiveness = " It's not very effective...";

//     addLog(
//       `${activePokemon.name.toUpperCase()} used ${move
//         .replace("-", " ")
//         .toUpperCase()}!`
//     );
//     addLog(`Dealt ${damage} damage!${effectiveness}`);

//     setTimeout(() => {
//       if (wildPokemon.currentHP - damage <= 0) {
//         handleVictory();
//       } else {
//         enemyTurn();
//       }
//       setIsAnimating(false);
//     }, 1500);
//   };

//   const enemyTurn = () => {
//     if (!wildPokemon || wildPokemon.currentHP <= 0) return;

//     setIsPlayerTurn(false);

//     setTimeout(() => {
//       const activePokemon = playerTeam[activePlayerIndex];
//       const moveIndex = Math.floor(Math.random() * wildPokemon.moves.length);
//       const move = wildPokemon.moves[moveIndex];

//       const { damage, typeMultiplier } = calculateDamage(
//         wildPokemon,
//         activePokemon,
//         move
//       );

//       const updatedTeam = [...playerTeam];
//       updatedTeam[activePlayerIndex].currentHP = Math.max(
//         0,
//         updatedTeam[activePlayerIndex].currentHP - damage
//       );
//       setPlayerTeam(updatedTeam);

//       let effectiveness = "";
//       if (typeMultiplier > 1) effectiveness = " It's super effective!";
//       if (typeMultiplier < 1) effectiveness = " It's not very effective...";

//       addLog(
//         `Wild ${wildPokemon.name.toUpperCase()} used ${move
//           .replace("-", " ")
//           .toUpperCase()}!`
//       );
//       addLog(`Dealt ${damage} damage!${effectiveness}`);

//       setTimeout(() => {
//         if (updatedTeam[activePlayerIndex].currentHP <= 0) {
//           handlePlayerFaint();
//         } else {
//           setIsPlayerTurn(true);
//         }
//       }, 1500);
//     }, 1000);
//   };

//   const handlePlayerFaint = () => {
//     addLog(`${playerTeam[activePlayerIndex].name.toUpperCase()} fainted!`);

//     const nextIndex = playerTeam.findIndex(
//       (p, idx) => idx > activePlayerIndex && p.currentHP > 0
//     );

//     if (nextIndex !== -1) {
//       setTimeout(() => {
//         setActivePlayerIndex(nextIndex);
//         addLog(`Go, ${playerTeam[nextIndex].name.toUpperCase()}!`);
//         setIsPlayerTurn(true);
//       }, 2000);
//     } else {
//       setTimeout(() => {
//         setBattlePhase("defeat");
//         addLog("All your Pokémon fainted!");
//       }, 2000);
//     }
//   };

//   const handleVictory = () => {
//     setBattlePhase("victory");
//     addLog(`Wild ${wildPokemon.name.toUpperCase()} fainted!`);

//     const expGained = Math.floor(wildPokemon.level * 100);
//     addLog(`Gained ${expGained} EXP!`);

//     const updatedTeam = [...playerTeam];
//     updatedTeam[activePlayerIndex].expGained += expGained;

//     const newLevel = calculateLevel(updatedTeam[activePlayerIndex].expGained);
//     if (newLevel > updatedTeam[activePlayerIndex].sessionLevel) {
//       updatedTeam[activePlayerIndex].sessionLevel = newLevel;
//       addLog(
//         `${updatedTeam[
//           activePlayerIndex
//         ].name.toUpperCase()} grew to level ${newLevel}!`
//       );

//       updatedTeam[activePlayerIndex].currentStats = scaleStats(
//         updatedTeam[activePlayerIndex].stats,
//         newLevel
//       );
//       updatedTeam[activePlayerIndex].maxHP = Math.floor(
//         updatedTeam[activePlayerIndex].stats.hp + newLevel * 5
//       );
//     }

//     setPlayerTeam(updatedTeam);

//     const chance = calculateCaptureChance();
//     setCaptureChance(chance);
//   };

//   const calculateLevel = (exp) => {
//     return Math.floor(Math.pow(exp / 100, 1 / 3)) + 1;
//   };

//   const scaleStats = (baseStats, level) => {
//     const scaled = {};
//     for (const stat in baseStats) {
//       scaled[stat] = Math.floor(baseStats[stat] + level * 3);
//     }
//     return scaled;
//   };

//   const calculateCaptureChance = () => {
//     let chance = 30;

//     const hpPercent = (wildPokemon.currentHP / wildPokemon.maxHP) * 100;
//     if (hpPercent < 25) chance += 20;
//     else if (hpPercent < 50) chance += 10;

//     const rarityPenalty = {
//       Common: 0,
//       Uncommon: -10,
//       Rare: -20,
//       Epic: -30,
//       Legendary: -40,
//     };
//     chance += rarityPenalty[wildPokemon.rarity] || 0;

//     return Math.max(5, Math.min(95, chance));
//   };

//   const attemptCapture = async () => {
//     setBattlePhase("capture");
//     addLog("Throwing Pokéball...");

//     setIsAnimating(true);

//     await new Promise((resolve) => setTimeout(resolve, 2000));

//     const success = Math.random() * 100 < captureChance;

//     if (success) {
//       addLog(`Gotcha! ${wildPokemon.name.toUpperCase()} was caught!`);
//       setIsAnimating(false);

//       setTimeout(() => {
//         if (
//           window.confirm(
//             `Mint ${wildPokemon.name.toUpperCase()} as NFT? (Costs gas)`
//           )
//         ) {
//           mintCapturedPokemon();
//         } else {
//           onBattleEnd(playerTeam, true);
//         }
//       }, 1000);
//     } else {
//       addLog(`Oh no! ${wildPokemon.name.toUpperCase()} broke free!`);
//       setIsAnimating(false);
//       setBattlePhase("victory");
//     }
//   };

//   const mintCapturedPokemon = async () => {
//     try {
//       setIsMinting(true);
//       addLog("Minting NFT to blockchain...");

//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();
//       const walletAddress = await signer.getAddress();
//       const contract = new ethers.Contract(
//         CONTRACT_ADDRESS,
//         PokemonNFTABI.abi,
//         signer
//       );

//       const tokenURI = createMetadataURI(wildPokemon);

//       const tx = await contract.mintPokemon(
//         walletAddress,
//         tokenURI,
//         wildPokemon.pokemonId,
//         wildPokemon.name,
//         "",
//         wildPokemon.rarity,
//         wildPokemon.isShiny
//       );

//       addLog("Waiting for confirmation...");
//       const receipt = await tx.wait();

//       let tokenId = null;
//       for (const log of receipt.logs) {
//         try {
//           const parsed = contract.interface.parseLog(log);
//           if (parsed && parsed.name === "PokemonMinted") {
//             tokenId = parsed.args.tokenId.toString();
//             break;
//           }
//         } catch (e) {
//           continue;
//         }
//       }

//       const user = auth.currentUser;
//       if (user) {
//         const pokemonFirebaseId = crypto.randomUUID();
//         const inventoryRef = doc(
//           db,
//           "users",
//           user.uid,
//           "inventory",
//           pokemonFirebaseId
//         );

//         await setDoc(inventoryRef, {
//           ...wildPokemon,
//           stats: wildPokemon.baseStats,
//           nftTokenId: tokenId,
//           nftTxHash: tx.hash,
//           contractAddress: CONTRACT_ADDRESS,
//           onChain: true,
//           blockchain: "sepolia",
//           capturedAt: new Date().toISOString(),
//           capturedFloor: floor,
//         });
//       }

//       addLog(`${wildPokemon.name.toUpperCase()} minted as NFT #${tokenId}!`);
//       setIsMinting(false);

//       setTimeout(() => {
//         onCapture(wildPokemon);
//         onBattleEnd(playerTeam, true);
//       }, 2000);
//     } catch (error) {
//       console.error("Minting failed:", error);
//       addLog("Minting failed!");
//       setIsMinting(false);
//     }
//   };

//   const createMetadataURI = (pokemon) => {
//     const metadata = {
//       name: `${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}${
//         pokemon.isShiny ? " ✨" : ""
//       }`,
//       description: `A ${pokemon.rarity} ${
//         pokemon.isShiny ? "Shiny " : ""
//       }Pokémon captured in battle!`,
//       image: pokemon.sprite,
//       attributes: [
//         { trait_type: "Pokemon ID", value: pokemon.pokemonId },
//         { trait_type: "Rarity", value: pokemon.rarity },
//         { trait_type: "Shiny", value: pokemon.isShiny ? "Yes" : "No" },
//         { trait_type: "Types", value: pokemon.types.join(", ") },
//         { trait_type: "HP", value: pokemon.baseStats.hp },
//         { trait_type: "Attack", value: pokemon.baseStats.attack },
//         { trait_type: "Defense", value: pokemon.baseStats.defense },
//         {
//           trait_type: "Sp. Attack",
//           value: pokemon.baseStats["special-attack"],
//         },
//         {
//           trait_type: "Sp. Defense",
//           value: pokemon.baseStats["special-defense"],
//         },
//         { trait_type: "Speed", value: pokemon.baseStats.speed },
//       ],
//     };

//     const jsonString = JSON.stringify(metadata);
//     const base64 = btoa(unescape(encodeURIComponent(jsonString)));
//     return `data:application/json;base64,${base64}`;
//   };

//   const switchPokemon = (index) => {
//     if (playerTeam[index].currentHP <= 0) {
//       addLog("That Pokémon has fainted!");
//       return;
//     }

//     setActivePlayerIndex(index);
//     addLog(`Go, ${playerTeam[index].name.toUpperCase()}!`);
//     enemyTurn();
//   };

//   const attemptRun = () => {
//     const runChance = 50;
//     if (Math.random() * 100 < runChance) {
//       addLog("Got away safely!");
//       setTimeout(() => onBattleEnd(playerTeam, false), 1500);
//     } else {
//       addLog("Can't escape!");
//       enemyTurn();
//     }
//   };

//   const getTypeColor = (type) => {
//     const colors = {
//       normal: "#A8A878",
//       fire: "#F08030",
//       water: "#6890F0",
//       electric: "#F8D030",
//       grass: "#78C850",
//       ice: "#98D8D8",
//       fighting: "#C03028",
//       poison: "#A040A0",
//       ground: "#E0C068",
//       flying: "#A890F0",
//       psychic: "#F85888",
//       bug: "#A8B820",
//       rock: "#B8A038",
//       ghost: "#705898",
//       dragon: "#7038F8",
//       dark: "#705848",
//       steel: "#B8B8D0",
//       fairy: "#EE99AC",
//     };
//     return colors[type] || "#777";
//   };

//   if (!wildPokemon || !currentBiome) {
//     return <div className="battle-loading">Loading battle...</div>;
//   }

//   const activePokemon = playerTeam[activePlayerIndex];

//   return (
//     <div
//       className="battle-container"
//       style={{
//         background: `linear-gradient(135deg, ${currentBiome.color}22, ${currentBiome.color}44)`,
//       }}
//     >
//       {/* Biome Header */}
//       <div className="biome-header">
//         <h2>{currentBiome.name}</h2>
//         <span className="floor-indicator">Floor {floor}</span>
//       </div>

//       {/* Battle Area */}
//       <div className="battle-area">
//         {/* Wild Pokémon */}
//         <div className="enemy-section">
//           <div className="pokemon-info">
//             <h3>
//               {wildPokemon.isShiny && <span className="shiny-icon">✨</span>}
//               {wildPokemon.name.toUpperCase()}
//               <span className="level">Lv.{wildPokemon.level}</span>
//             </h3>
//             <div className="hp-bar-container">
//               <div className="hp-bar">
//                 <div
//                   className="hp-fill"
//                   style={{
//                     width: `${
//                       (wildPokemon.currentHP / wildPokemon.maxHP) * 100
//                     }%`,
//                     background:
//                       wildPokemon.currentHP / wildPokemon.maxHP > 0.5
//                         ? "#4ade80"
//                         : wildPokemon.currentHP / wildPokemon.maxHP > 0.25
//                         ? "#fbbf24"
//                         : "#ef4444",
//                   }}
//                 />
//               </div>
//               <span className="hp-text">
//                 {wildPokemon.currentHP}/{wildPokemon.maxHP}
//               </span>
//             </div>
//             <div className="types">
//               {wildPokemon.types.map((type) => (
//                 <span
//                   key={type}
//                   className="type-badge"
//                   style={{ background: getTypeColor(type) }}
//                 >
//                   {type}
//                 </span>
//               ))}
//             </div>
//           </div>
//           <img
//             src={wildPokemon.sprite}
//             alt={wildPokemon.name}
//             className="pokemon-sprite enemy"
//           />
//         </div>

//         {/* Player Pokémon */}
//         <div className="player-section">
//           <img
//             src={activePokemon.sprite}
//             alt={activePokemon.name}
//             className="pokemon-sprite player"
//           />
//           <div className="pokemon-info">
//             <h3>
//               {activePokemon.name.toUpperCase()}
//               <span className="level">Lv.{activePokemon.sessionLevel}</span>
//             </h3>
//             <div className="hp-bar-container">
//               <div className="hp-bar">
//                 <div
//                   className="hp-fill"
//                   style={{
//                     width: `${
//                       (activePokemon.currentHP / activePokemon.maxHP) * 100
//                     }%`,
//                     background:
//                       activePokemon.currentHP / activePokemon.maxHP > 0.5
//                         ? "#4ade80"
//                         : activePokemon.currentHP / activePokemon.maxHP > 0.25
//                         ? "#fbbf24"
//                         : "#ef4444",
//                   }}
//                 />
//               </div>
//               <span className="hp-text">
//                 {activePokemon.currentHP}/{activePokemon.maxHP}
//               </span>
//               <div className="types">
//                 {activePokemon.types?.map((type) => (
//                   <span
//                     key={type}
//                     className="type-badge"
//                     style={{ background: getTypeColor(type) }}
//                   >
//                     {type}
//                   </span>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Battle Log */}
//       <div className="battle-log">
//         {battleLog.slice(-4).map((log, idx) => (
//           <div key={idx} className="log-entry">
//             {log}
//           </div>
//         ))}
//       </div>

//       {/* Action Buttons */}
//       <div className="battle-actions">
//         {battlePhase === "battle" && isPlayerTurn && !isAnimating && (
//           <>
//             <div className="moves-grid">
//               {activePokemon.moves.map((move, idx) => (
//                 <button
//                   key={idx}
//                   className="move-btn"
//                   onClick={() => playerAttack(idx)}
//                 >
//                   {move.replace("-", " ").toUpperCase()}
//                 </button>
//               ))}
//             </div>
//             <div className="other-actions">
//               <button className="action-btn" onClick={attemptRun}>
//                 Run
//               </button>
//             </div>
//           </>
//         )}

//         {battlePhase === "victory" && !isMinting && (
//           <div className="victory-actions">
//             <h3>Victory!</h3>
//             <button className="capture-btn" onClick={attemptCapture}>
//               Attempt Capture ({captureChance}% chance)
//             </button>
//             <button
//               className="continue-btn"
//               onClick={() => onBattleEnd(playerTeam, true)}
//             >
//               Continue →
//             </button>
//           </div>
//         )}

//         {battlePhase === "defeat" && (
//           <div className="defeat-actions">
//             <h3>All Pokémon fainted...</h3>
//             <button
//               className="game-over-btn"
//               onClick={() => onBattleEnd(playerTeam, false)}
//             >
//               End Run
//             </button>
//           </div>
//         )}

//         {isMinting && (
//           <div className="minting-status">
//             <div className="spinner"></div>
//             <p>Minting NFT...</p>
//           </div>
//         )}
//       </div>

//       {/* Team Display */}
//       <div className="team-display">
//         {playerTeam.map((pokemon, idx) => (
//           <div
//             key={pokemon.id}
//             className={`team-slot ${
//               idx === activePlayerIndex ? "active" : ""
//             } ${pokemon.currentHP <= 0 ? "fainted" : ""}`}
//             onClick={() =>
//               idx !== activePlayerIndex &&
//               isPlayerTurn &&
//               !isAnimating &&
//               switchPokemon(idx)
//             }
//           >
//             <img src={pokemon.sprite} alt={pokemon.name} />
//             <div className="mini-hp">
//               <div
//                 className="mini-hp-fill"
//                 style={{
//                   width: `${(pokemon.currentHP / pokemon.maxHP) * 100}%`,
//                 }}
//               />
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
