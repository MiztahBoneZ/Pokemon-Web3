import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { auth } from "../../Core/firebase";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import PokemonNFTABI from "../../Core/PokemonNFT.json";
import "./Battle.css";

import MOVES_DATABASE from "./Battle_Data/MoveDatabase";
import TYPE_EFFECTIVENESS from "./Battle_Data/TypeEffectiveness";
import BIOMES from "./Battle_Data/Biomes";

const CONTRACT_ADDRESS = "0xF3E7AE62f5a8DBE879e70e94Acfa10E4D12354D7";

export default function Battle({ team, floor, onBattleEnd, onCapture }) {
  const [playerTeam, setPlayerTeam] = useState([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [wildPokemon, setWildPokemon] = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [battlePhase, setBattlePhase] = useState("intro");
  const [selectedMove, setSelectedMove] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentBiome, setCurrentBiome] = useState(null);
  const [captureChance, setCaptureChance] = useState(0);
  const [isMinting, setIsMinting] = useState(false);
  const [playerStatChanges, setPlayerStatChanges] = useState({});
  const [wildStatChanges, setWildStatChanges] = useState({});
  const [playerStatus, setPlayerStatus] = useState(null);
  const [wildStatus, setWildStatus] = useState(null);
  const [movePP, setMovePP] = useState({});
  const db = getFirestore();

  const validateAndFixMoves = (pokemon) => {
    const validMoves = pokemon.moves.filter((move) => MOVES_DATABASE[move]);

    if (validMoves.length < 4) {
      const defaultMovesByType = {
        normal: ["tackle", "quick-attack", "body-slam"],
        fire: ["ember", "fire-punch", "flamethrower"],
        water: ["water-gun", "bubble-beam", "surf"],
        electric: ["thunder-shock", "thunderbolt"],
        grass: ["vine-whip", "razor-leaf", "energy-ball"],
        ice: ["ice-beam", "ice-punch"],
        fighting: ["karate-chop", "brick-break"],
        poison: ["poison-sting", "sludge-bomb"],
        ground: ["mud-slap", "earthquake"],
        flying: ["peck", "aerial-ace"],
        psychic: ["confusion", "psychic"],
        bug: ["bug-bite", "x-scissor"],
        rock: ["rock-throw", "rock-slide"],
        ghost: ["shadow-ball", "shadow-claw"],
        dragon: ["dragon-rage", "dragon-claw"],
        dark: ["bite", "crunch"],
        steel: ["iron-tail", "flash-cannon"],
        fairy: ["fairy-wind", "dazzling-gleam"],
      };

      const typeBasedMoves = pokemon.types?.flatMap(
        (type) => defaultMovesByType[type] || ["tackle"]
      ) || ["tackle"];

      const allMoves = [...validMoves];
      for (const move of typeBasedMoves) {
        if (!allMoves.includes(move) && allMoves.length < 4) {
          allMoves.push(move);
        }
      }

      const genericMoves = ["tackle", "quick-attack", "body-slam", "scratch"];
      for (const move of genericMoves) {
        if (!allMoves.includes(move) && allMoves.length < 4) {
          allMoves.push(move);
        }
      }

      return allMoves.slice(0, 4);
    }

    return validMoves.slice(0, 4);
  };

  useEffect(() => {
    console.log("Battle received team prop:", team);
    console.log("First pokemon in battle:", team[0]);
    console.log("First pokemon types:", team[0]?.types);

    if (playerTeam.length === 0 && team.length > 0) {
      const initializedTeam = team.map((pokemon) => {
        console.log("Firebase moves:", pokemon.moves);
        console.log(
          "Resolved moves:",
          pokemon.moves?.map((m) => MOVES_DATABASE[m])
        );

        const validMoves = validateAndFixMoves(pokemon);

        return {
          ...pokemon,
          moves: validMoves,
          sessionLevel: pokemon.sessionLevel || 1,
          currentHP: pokemon.currentHP || pokemon.stats.hp,
          maxHP: pokemon.maxHP || pokemon.stats.hp,
          currentStats: pokemon.currentStats || { ...pokemon.stats },
          expGained: pokemon.expGained || 0,
        };
      });
      setPlayerTeam(initializedTeam);

      const ppTracker = {};
      initializedTeam[0].moves.forEach((move) => {
        const moveData = MOVES_DATABASE[move];
        ppTracker[move] = moveData ? moveData.pp : 10;
      });
      setMovePP(ppTracker);
    } else if (playerTeam.length > 0) {
      initializeBattle();
    }
  }, [floor, team.length, playerTeam.length]);

  const initializeBattle = async () => {
    setBattlePhase("intro");
    setBattleLog([]);
    setIsPlayerTurn(true);
    setIsAnimating(false);
    setSelectedMove(null);
    setPlayerStatChanges({});
    setWildStatChanges({});
    setPlayerStatus(null);
    setWildStatus(null);

    if (playerTeam.length > 0) {
      const healedTeam = playerTeam.map((pokemon) => ({
        ...pokemon,
        currentHP: Math.min(
          pokemon.currentHP + Math.floor(pokemon.maxHP * 0.2),
          pokemon.maxHP
        ),
      }));
      setPlayerTeam(healedTeam);

      const firstAlive = healedTeam.findIndex((p) => p.currentHP > 0);
      if (firstAlive !== -1) {
        setActivePlayerIndex(firstAlive);

        const ppTracker = {};
        healedTeam[firstAlive].moves.forEach((move) => {
          const moveData = MOVES_DATABASE[move];
          ppTracker[move] = moveData ? moveData.pp : 10;
        });
        setMovePP(ppTracker);
      }
    }

    const biomeKeys = Object.keys(BIOMES);
    const randomBiome = biomeKeys[Math.floor(Math.random() * biomeKeys.length)];
    setCurrentBiome(BIOMES[randomBiome]);

    const wild = await generateWildPokemon(floor, BIOMES[randomBiome]);
    setWildPokemon(wild);

    addLog(`A wild ${wild.name.toUpperCase()} appeared!`);
    addLog(`Biome: ${BIOMES[randomBiome].name}`);

    setTimeout(() => setBattlePhase("battle"), 2000);
  };

  const generateWildPokemon = async (floor, biome) => {
    try {
      const allPokemon = [];
      for (let id = 1; id <= 649; id++) {
        allPokemon.push(id);
      }

      const randomId =
        allPokemon[Math.floor(Math.random() * allPokemon.length)];
      const shinyChance = biome.name.includes("✨") ? 0.05 : 0.02;
      const isShiny = Math.random() < shinyChance;

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
        randomizedStats[statName] = Math.max(1, base + variation);
      }

      const allMoves = data.moves.map((m) => m.move.name);
      const availableMoves = allMoves.filter((move) => MOVES_DATABASE[move]);

      const fallbackMoves = ["tackle", "scratch", "quick-attack", "body-slam"];
      const movesToUse =
        availableMoves.length >= 4
          ? availableMoves
          : [...availableMoves, ...fallbackMoves];

      const damagingMoves = movesToUse.filter((move) => {
        const moveData = MOVES_DATABASE[move];
        return moveData && moveData.power > 0;
      });

      const statusMoves = movesToUse.filter((move) => {
        const moveData = MOVES_DATABASE[move];
        return moveData && moveData.power === 0;
      });

      const selectedMoves = [];
      const shuffledDamaging = damagingMoves.sort(() => 0.5 - Math.random());
      selectedMoves.push(...shuffledDamaging.slice(0, 3));

      if (statusMoves.length > 0) {
        selectedMoves.push(
          statusMoves[Math.floor(Math.random() * statusMoves.length)]
        );
      } else if (shuffledDamaging.length > 3) {
        selectedMoves.push(shuffledDamaging[3]);
      }

      while (selectedMoves.length < 4) {
        const fallback =
          fallbackMoves[selectedMoves.length % fallbackMoves.length];
        if (!selectedMoves.includes(fallback)) {
          selectedMoves.push(fallback);
        }
      }

      const total = Object.values(randomizedStats).reduce(
        (sum, val) => sum + val,
        0
      );
      const rarity = getRarity(total);

      const level = Math.max(1, floor);
      const scaledStats = {};
      for (const statName in randomizedStats) {
        scaledStats[statName] = Math.floor(
          randomizedStats[statName] + level * 3
        );
      }

      const maxHP = Math.floor(randomizedStats.hp + level * 5);

      return {
        pokemonId: randomId,
        name,
        nickname: "",
        sprite,
        types,
        baseStats: randomizedStats,
        stats: scaledStats,
        moves: selectedMoves.slice(0, 4),
        rarity: rarity.tier,
        isShiny,
        level,
        currentHP: maxHP,
        maxHP,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to generate wild Pokémon:", error);
      return null;
    }
  };

  const getRarity = (totalStats) => {
    if (totalStats >= 600) return { tier: "Legendary", color: "#FFD700" };
    if (totalStats >= 500) return { tier: "Epic", color: "#9D4EDD" };
    if (totalStats >= 450) return { tier: "Rare", color: "#4CC9F0" };
    if (totalStats >= 400) return { tier: "Uncommon", color: "#06D6A0" };
    return { tier: "Common", color: "#CCC" };
  };

  const getTypeEffectiveness = (moveType, defenderTypes) => {
    let multiplier = 1;

    defenderTypes.forEach((defType) => {
      const effectiveness = TYPE_EFFECTIVENESS[moveType];
      if (!effectiveness) return;

      if (effectiveness.superEffective.includes(defType)) {
        multiplier *= 2;
      }
      if (effectiveness.notVery.includes(defType)) {
        multiplier *= 0.5;
      }
      if (effectiveness.noEffect.includes(defType)) {
        multiplier = 0;
      }
    });

    return multiplier;
  };

  const applyStatModifier = (baseStat, stages) => {
    if (stages === 0) return baseStat;
    const multiplier =
      stages > 0 ? (2 + stages) / 2 : 2 / (2 + Math.abs(stages));
    return Math.floor(baseStat * multiplier);
  };

  const calculateDamage = (
    attacker,
    defender,
    moveName,
    attackerStatChanges,
    defenderStatChanges
  ) => {
    const moveData = MOVES_DATABASE[moveName] || {
      type: attacker.types[0],
      category: "physical",
      power: 50,
      accuracy: 100,
    };

    if (moveData.category === "status" || moveData.power === 0) {
      return { damage: 0, typeMultiplier: 1, isCrit: false, moveData };
    }

    const level = attacker.level || attacker.sessionLevel || 1;

    const baseAttack =
      moveData.category === "physical"
        ? attacker.currentStats?.attack || attacker.stats.attack
        : attacker.currentStats?.["special-attack"] ||
          attacker.stats["special-attack"];

    const baseDefense =
      moveData.category === "physical"
        ? defender.currentStats?.defense || defender.stats.defense
        : defender.currentStats?.["special-defense"] ||
          defender.stats["special-defense"];

    const attackStat =
      moveData.category === "physical"
        ? applyStatModifier(baseAttack, attackerStatChanges.attack || 0)
        : applyStatModifier(
            baseAttack,
            attackerStatChanges["special-attack"] || 0
          );

    const defenseStat =
      moveData.category === "physical"
        ? applyStatModifier(baseDefense, defenderStatChanges.defense || 0)
        : applyStatModifier(
            baseDefense,
            defenderStatChanges["special-defense"] || 0
          );

    const isCrit = Math.random() < 0.0625;
    const critMultiplier = isCrit ? 1.5 : 1;

    const hasSTAB = attacker.types.includes(moveData.type);
    const stabMultiplier = hasSTAB ? 1.5 : 1;

    const typeMultiplier = getTypeEffectiveness(moveData.type, defender.types);
    const random = 0.85 + Math.random() * 0.15;

    const damage = Math.floor(
      ((((2 * level) / 5 + 2) * moveData.power * (attackStat / defenseStat)) /
        50 +
        2) *
        critMultiplier *
        stabMultiplier *
        typeMultiplier *
        random
    );

    return {
      damage: Math.max(1, damage),
      typeMultiplier,
      isCrit,
      hasSTAB,
      moveData,
    };
  };

  const addLog = (message) => {
    setBattleLog((prev) => [...prev, message]);
  };

  const playerAttack = async (moveIndex) => {
    if (!isPlayerTurn || isAnimating) return;

    const activePokemon = playerTeam[activePlayerIndex];
    const move = activePokemon.moves[moveIndex];

    if (movePP[move] <= 0) {
      addLog("No PP left for that move!");
      return;
    }

    setIsAnimating(true);

    if (playerStatus) {
      if (playerStatus.type === "sleep" && playerStatus.turns > 0) {
        addLog(`${activePokemon.name.toUpperCase()} is fast asleep!`);
        setPlayerStatus({ ...playerStatus, turns: playerStatus.turns - 1 });
        setIsAnimating(false);
        setTimeout(() => enemyTurn(), 1500);
        return;
      } else if (playerStatus.type === "sleep") {
        addLog(`${activePokemon.name.toUpperCase()} woke up!`);
        setPlayerStatus(null);
      }

      if (playerStatus.type === "paralysis" && Math.random() < 0.25) {
        addLog(
          `${activePokemon.name.toUpperCase()} is paralyzed! It can't move!`
        );
        setIsAnimating(false);
        setTimeout(() => enemyTurn(), 1500);
        return;
      }

      if (playerStatus.type === "freeze" && Math.random() < 0.8) {
        addLog(`${activePokemon.name.toUpperCase()} is frozen solid!`);
        setIsAnimating(false);
        setTimeout(() => enemyTurn(), 1500);
        return;
      } else if (playerStatus.type === "freeze") {
        addLog(`${activePokemon.name.toUpperCase()} thawed out!`);
        setPlayerStatus(null);
      }
    }

    const { damage, typeMultiplier, isCrit, hasSTAB, moveData } =
      calculateDamage(
        activePokemon,
        wildPokemon,
        move,
        playerStatChanges,
        wildStatChanges
      );

    if (Math.random() * 100 > moveData.accuracy) {
      addLog(
        `${activePokemon.name.toUpperCase()} used ${move
          .replace("-", " ")
          .toUpperCase()}!`
      );
      addLog("But it missed!");
      setIsAnimating(false);
      setMovePP((prev) => ({ ...prev, [move]: prev[move] - 1 }));
      setTimeout(() => enemyTurn(), 1500);
      return;
    }

    if (moveData.category === "status") {
      addLog(
        `${activePokemon.name.toUpperCase()} used ${move
          .replace("-", " ")
          .toUpperCase()}!`
      );

      if (moveData.statChanges) {
        const target = moveData.statChanges.target;
        const statChange = { ...moveData.statChanges };
        delete statChange.target;

        if (target === "self") {
          setPlayerStatChanges((prev) => {
            const newChanges = { ...prev };
            for (const stat in statChange) {
              newChanges[stat] = Math.max(
                -6,
                Math.min(6, (prev[stat] || 0) + statChange[stat])
              );
            }
            return newChanges;
          });
          const statName = Object.keys(statChange)[0].replace("-", " ");
          const change = statChange[Object.keys(statChange)[0]];
          addLog(
            `${activePokemon.name.toUpperCase()}'s ${statName} ${
              change > 0 ? "rose" : "fell"
            }!`
          );
        } else {
          setWildStatChanges((prev) => {
            const newChanges = { ...prev };
            for (const stat in statChange) {
              newChanges[stat] = Math.max(
                -6,
                Math.min(6, (prev[stat] || 0) + statChange[stat])
              );
            }
            return newChanges;
          });
          const statName = Object.keys(statChange)[0].replace("-", " ");
          const change = statChange[Object.keys(statChange)[0]];
          addLog(
            `Wild ${wildPokemon.name.toUpperCase()}'s ${statName} ${
              change > 0 ? "rose" : "fell"
            }!`
          );
        }
      }

      setMovePP((prev) => ({ ...prev, [move]: prev[move] - 1 }));
      setIsAnimating(false);
      setTimeout(() => enemyTurn(), 1500);
      return;
    }

    setWildPokemon((prev) => ({
      ...prev,
      currentHP: Math.max(0, prev.currentHP - damage),
    }));

    let effectiveness = "";
    if (typeMultiplier === 0)
      effectiveness = " It doesn't affect the wild Pokémon...";
    else if (typeMultiplier > 1) effectiveness = " It's super effective!";
    else if (typeMultiplier < 1) effectiveness = " It's not very effective...";

    addLog(
      `${activePokemon.name.toUpperCase()} used ${move
        .replace("-", " ")
        .toUpperCase()}!`
    );
    if (isCrit) addLog("A critical hit!");
    addLog(`Dealt ${damage} damage!${effectiveness}`);

    if (moveData.statChanges) {
      const target = moveData.statChanges.target;
      const statChange = { ...moveData.statChanges };
      delete statChange.target;

      if (target === "self") {
        setPlayerStatChanges((prev) => {
          const newChanges = { ...prev };
          for (const stat in statChange) {
            newChanges[stat] = Math.max(
              -6,
              Math.min(6, (prev[stat] || 0) + statChange[stat])
            );
          }
          return newChanges;
        });
      }
    }

    if (playerStatus?.type === "burn") {
      const burnDamage = Math.floor(activePokemon.maxHP / 16);
      const updatedTeam = [...playerTeam];
      updatedTeam[activePlayerIndex].currentHP = Math.max(
        0,
        updatedTeam[activePlayerIndex].currentHP - burnDamage
      );
      setPlayerTeam(updatedTeam);
      addLog(`${activePokemon.name.toUpperCase()} is hurt by its burn!`);
    }

    if (playerStatus?.type === "poison") {
      const poisonDamage = Math.floor(activePokemon.maxHP / 8);
      const updatedTeam = [...playerTeam];
      updatedTeam[activePlayerIndex].currentHP = Math.max(
        0,
        updatedTeam[activePlayerIndex].currentHP - poisonDamage
      );
      setPlayerTeam(updatedTeam);
      addLog(`${activePokemon.name.toUpperCase()} is hurt by poison!`);
    }

    setMovePP((prev) => ({ ...prev, [move]: prev[move] - 1 }));

    setTimeout(() => {
      if (wildPokemon.currentHP - damage <= 0) {
        handleVictory();
      } else {
        enemyTurn();
      }
      setIsAnimating(false);
    }, 1500);
  };

  const enemyTurn = () => {
    if (!wildPokemon || wildPokemon.currentHP <= 0) return;

    setIsPlayerTurn(false);

    setTimeout(() => {
      const activePokemon = playerTeam[activePlayerIndex];

      if (wildStatus) {
        if (wildStatus.type === "sleep" && wildStatus.turns > 0) {
          addLog(`Wild ${wildPokemon.name.toUpperCase()} is fast asleep!`);
          setWildStatus({ ...wildStatus, turns: wildStatus.turns - 1 });
          setIsPlayerTurn(true);
          return;
        } else if (wildStatus.type === "sleep") {
          addLog(`Wild ${wildPokemon.name.toUpperCase()} woke up!`);
          setWildStatus(null);
        }

        if (wildStatus.type === "paralysis" && Math.random() < 0.25) {
          addLog(
            `Wild ${wildPokemon.name.toUpperCase()} is paralyzed! It can't move!`
          );
          setIsPlayerTurn(true);
          return;
        }

        if (wildStatus.type === "freeze" && Math.random() < 0.8) {
          addLog(`Wild ${wildPokemon.name.toUpperCase()} is frozen solid!`);
          setIsPlayerTurn(true);
          return;
        } else if (wildStatus.type === "freeze") {
          addLog(`Wild ${wildPokemon.name.toUpperCase()} thawed out!`);
          setWildStatus(null);
        }
      }

      let bestMoveIndex = 0;
      let bestEffectiveness = -1;

      wildPokemon.moves.forEach((move, idx) => {
        const moveData = MOVES_DATABASE[move];
        if (!moveData || moveData.power === 0) return;

        const effectiveness = getTypeEffectiveness(
          moveData.type,
          activePokemon.types
        );

        if (effectiveness > bestEffectiveness) {
          bestEffectiveness = effectiveness;
          bestMoveIndex = idx;
        }
      });

      const moveIndex =
        Math.random() < 0.3
          ? Math.floor(Math.random() * wildPokemon.moves.length)
          : bestMoveIndex;

      const move = wildPokemon.moves[moveIndex];
      const { damage, typeMultiplier, isCrit, moveData } = calculateDamage(
        wildPokemon,
        activePokemon,
        move,
        wildStatChanges,
        playerStatChanges
      );

      if (Math.random() * 100 > moveData.accuracy) {
        addLog(
          `Wild ${wildPokemon.name.toUpperCase()} used ${move
            .replace("-", " ")
            .toUpperCase()}!`
        );
        addLog("But it missed!");
        setTimeout(() => setIsPlayerTurn(true), 1500);
        return;
      }

      if (moveData.category === "status") {
        addLog(
          `Wild ${wildPokemon.name.toUpperCase()} used ${move
            .replace("-", " ")
            .toUpperCase()}!`
        );

        if (moveData.statChanges) {
          const target = moveData.statChanges.target;
          const statChange = { ...moveData.statChanges };
          delete statChange.target;

          if (target === "self") {
            setWildStatChanges((prev) => {
              const newChanges = { ...prev };
              for (const stat in statChange) {
                newChanges[stat] = Math.max(
                  -6,
                  Math.min(6, (prev[stat] || 0) + statChange[stat])
                );
              }
              return newChanges;
            });
          } else {
            setPlayerStatChanges((prev) => {
              const newChanges = { ...prev };
              for (const stat in statChange) {
                newChanges[stat] = Math.max(
                  -6,
                  Math.min(6, (prev[stat] || 0) + statChange[stat])
                );
              }
              return newChanges;
            });
          }

          const statName = Object.keys(statChange)[0].replace("-", " ");
          const change = statChange[Object.keys(statChange)[0]];
          const targetName =
            target === "self"
              ? `Wild ${wildPokemon.name.toUpperCase()}`
              : activePokemon.name.toUpperCase();
          addLog(
            `${targetName}'s ${statName} ${change > 0 ? "rose" : "fell"}!`
          );
        }

        setTimeout(() => setIsPlayerTurn(true), 1500);
        return;
      }

      const updatedTeam = [...playerTeam];
      updatedTeam[activePlayerIndex].currentHP = Math.max(
        0,
        updatedTeam[activePlayerIndex].currentHP - damage
      );
      setPlayerTeam(updatedTeam);

      let effectiveness = "";
      if (typeMultiplier === 0)
        effectiveness = " It doesn't affect your Pokémon...";
      else if (typeMultiplier > 1) effectiveness = " It's super effective!";
      else if (typeMultiplier < 1)
        effectiveness = " It's not very effective...";

      addLog(
        `Wild ${wildPokemon.name.toUpperCase()} used ${move
          .replace("-", " ")
          .toUpperCase()}!`
      );
      if (isCrit) addLog("A critical hit!");
      addLog(`Dealt ${damage} damage!${effectiveness}`);

      if (wildStatus?.type === "burn") {
        const burnDamage = Math.floor(wildPokemon.maxHP / 16);
        setWildPokemon((prev) => ({
          ...prev,
          currentHP: Math.max(0, prev.currentHP - burnDamage),
        }));
        addLog(`Wild ${wildPokemon.name.toUpperCase()} is hurt by its burn!`);
      }

      if (wildStatus?.type === "poison") {
        const poisonDamage = Math.floor(wildPokemon.maxHP / 8);
        setWildPokemon((prev) => ({
          ...prev,
          currentHP: Math.max(0, prev.currentHP - poisonDamage),
        }));
        addLog(`Wild ${wildPokemon.name.toUpperCase()} is hurt by poison!`);
      }

      setTimeout(() => {
        if (updatedTeam[activePlayerIndex].currentHP <= 0) {
          handlePlayerFaint();
        } else {
          setIsPlayerTurn(true);
        }
      }, 1500);
    }, 1000);
  };

  const handlePlayerFaint = () => {
    addLog(`${playerTeam[activePlayerIndex].name.toUpperCase()} fainted!`);

    const nextIndex = playerTeam.findIndex(
      (p, idx) => idx > activePlayerIndex && p.currentHP > 0
    );

    if (nextIndex !== -1) {
      setTimeout(() => {
        setActivePlayerIndex(nextIndex);
        addLog(`Go, ${playerTeam[nextIndex].name.toUpperCase()}!`);
        setIsPlayerTurn(true);
      }, 2000);
    } else {
      setTimeout(() => {
        setBattlePhase("defeat");
        addLog("All your Pokémon fainted!");
      }, 2000);
    }
  };

  const handleVictory = () => {
    setBattlePhase("victory");
    addLog(`Wild ${wildPokemon.name.toUpperCase()} fainted!`);

    const expGained = Math.floor(wildPokemon.level * 100);
    addLog(`Gained ${expGained} EXP!`);

    const updatedTeam = [...playerTeam];
    updatedTeam[activePlayerIndex].expGained += expGained;

    const newLevel = calculateLevel(updatedTeam[activePlayerIndex].expGained);
    if (newLevel > updatedTeam[activePlayerIndex].sessionLevel) {
      updatedTeam[activePlayerIndex].sessionLevel = newLevel;
      addLog(
        `${updatedTeam[
          activePlayerIndex
        ].name.toUpperCase()} grew to level ${newLevel}!`
      );

      updatedTeam[activePlayerIndex].currentStats = scaleStats(
        updatedTeam[activePlayerIndex].stats,
        newLevel
      );
      updatedTeam[activePlayerIndex].maxHP = Math.floor(
        updatedTeam[activePlayerIndex].stats.hp + newLevel * 5
      );
    }

    setPlayerTeam(updatedTeam);

    const chance = calculateCaptureChance();
    setCaptureChance(chance);
  };

  const calculateLevel = (exp) => {
    return Math.floor(Math.pow(exp / 100, 1 / 3)) + 1;
  };

  const scaleStats = (baseStats, level) => {
    const scaled = {};
    for (const stat in baseStats) {
      scaled[stat] = Math.floor(baseStats[stat] + level * 3);
    }
    return scaled;
  };

  const calculateCaptureChance = () => {
    let chance = 30;

    const hpPercent = (wildPokemon.currentHP / wildPokemon.maxHP) * 100;
    if (hpPercent < 25) chance += 20;
    else if (hpPercent < 50) chance += 10;

    const rarityPenalty = {
      Common: 0,
      Uncommon: -10,
      Rare: -20,
      Epic: -30,
      Legendary: -40,
    };
    chance += rarityPenalty[wildPokemon.rarity] || 0;

    return Math.max(5, Math.min(95, chance));
  };

  const attemptCapture = async () => {
    setBattlePhase("capture");
    addLog("Throwing Pokéball...");

    setIsAnimating(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const success = Math.random() * 100 < captureChance;

    if (success) {
      addLog(`Gotcha! ${wildPokemon.name.toUpperCase()} was caught!`);
      setIsAnimating(false);

      setTimeout(() => {
        if (
          window.confirm(
            `Mint ${wildPokemon.name.toUpperCase()} as NFT? (Costs gas)`
          )
        ) {
          mintCapturedPokemon();
        } else {
          onBattleEnd(playerTeam, true);
        }
      }, 1000);
    } else {
      addLog(`Oh no! ${wildPokemon.name.toUpperCase()} broke free!`);
      setIsAnimating(false);
      setBattlePhase("victory");
    }
  };

  const mintCapturedPokemon = async () => {
    try {
      setIsMinting(true);
      addLog("Minting NFT to blockchain...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        PokemonNFTABI.abi,
        signer
      );

      const tokenURI = createMetadataURI(wildPokemon);

      const tx = await contract.mintPokemon(
        walletAddress,
        tokenURI,
        wildPokemon.pokemonId,
        wildPokemon.name,
        "",
        wildPokemon.rarity,
        wildPokemon.isShiny
      );

      addLog("Waiting for confirmation...");
      const receipt = await tx.wait();

      let tokenId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === "PokemonMinted") {
            tokenId = parsed.args.tokenId.toString();
            break;
          }
        } catch (e) {
          continue;
        }
      }

      const user = auth.currentUser;
      if (user) {
        const pokemonFirebaseId = crypto.randomUUID();
        const inventoryRef = doc(
          db,
          "users",
          user.uid,
          "inventory",
          pokemonFirebaseId
        );

        await setDoc(inventoryRef, {
          ...wildPokemon,
          stats: wildPokemon.baseStats,
          nftTokenId: tokenId,
          nftTxHash: tx.hash,
          contractAddress: CONTRACT_ADDRESS,
          onChain: true,
          blockchain: "sepolia",
          capturedAt: new Date().toISOString(),
          capturedFloor: floor,
        });
      }

      addLog(`${wildPokemon.name.toUpperCase()} minted as NFT #${tokenId}!`);
      setIsMinting(false);

      setTimeout(() => {
        onCapture(wildPokemon);
        onBattleEnd(playerTeam, true);
      }, 2000);
    } catch (error) {
      console.error("Minting failed:", error);
      addLog("Minting failed!");
      setIsMinting(false);
    }
  };

  const createMetadataURI = (pokemon) => {
    const metadata = {
      name: `${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}${
        pokemon.isShiny ? " ✨" : ""
      }`,
      description: `A ${pokemon.rarity} ${
        pokemon.isShiny ? "Shiny " : ""
      }Pokémon captured in battle!`,
      image: pokemon.sprite,
      attributes: [
        { trait_type: "Pokemon ID", value: pokemon.pokemonId },
        { trait_type: "Rarity", value: pokemon.rarity },
        { trait_type: "Shiny", value: pokemon.isShiny ? "Yes" : "No" },
        { trait_type: "Types", value: pokemon.types.join(", ") },
        { trait_type: "HP", value: pokemon.baseStats.hp },
        { trait_type: "Attack", value: pokemon.baseStats.attack },
        { trait_type: "Defense", value: pokemon.baseStats.defense },
        {
          trait_type: "Sp. Attack",
          value: pokemon.baseStats["special-attack"],
        },
        {
          trait_type: "Sp. Defense",
          value: pokemon.baseStats["special-defense"],
        },
        { trait_type: "Speed", value: pokemon.baseStats.speed },
      ],
    };

    const jsonString = JSON.stringify(metadata);
    const base64 = btoa(unescape(encodeURIComponent(jsonString)));
    return `data:application/json;base64,${base64}`;
  };

  const switchPokemon = (index) => {
    if (playerTeam[index].currentHP <= 0) {
      addLog("That Pokémon has fainted!");
      return;
    }

    setActivePlayerIndex(index);
    setPlayerStatChanges({});
    setPlayerStatus(null);

    const ppTracker = {};
    playerTeam[index].moves.forEach((move) => {
      const moveData = MOVES_DATABASE[move];
      ppTracker[move] = moveData ? moveData.pp : 10;
    });
    setMovePP(ppTracker);

    addLog(`Go, ${playerTeam[index].name.toUpperCase()}!`);
    enemyTurn();
  };

  const attemptRun = () => {
    const runChance = 50;
    if (Math.random() * 100 < runChance) {
      addLog("Got away safely!");
      setTimeout(() => onBattleEnd(playerTeam, false), 1500);
    } else {
      addLog("Can't escape!");
      enemyTurn();
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

  if (!wildPokemon || !currentBiome) {
    return <div className="battle-loading">Loading battle...</div>;
  }

  const activePokemon = playerTeam[activePlayerIndex];

  return (
    <div
      className="battle-container"
      style={{
        background: `linear-gradient(135deg, ${currentBiome.color}22, ${currentBiome.color}44)`,
      }}
    >
      <div className="biome-header">
        <h2>{currentBiome.name}</h2>
        <span className="floor-indicator">Floor {floor}</span>
      </div>

      <div className="battle-area">
        <div className="enemy-section">
          <div className="pokemon-info">
            <h3>
              {wildPokemon.isShiny && <span className="shiny-icon">✨</span>}
              {wildPokemon.name.toUpperCase()}
              <span className="level">Lv.{wildPokemon.level}</span>
              {wildStatus && (
                <span className="status-badge">
                  {wildStatus.type.toUpperCase()}
                </span>
              )}
            </h3>
            <div className="hp-bar-container">
              <div className="hp-bar">
                <div
                  className="hp-fill"
                  style={{
                    width: `${
                      (wildPokemon.currentHP / wildPokemon.maxHP) * 100
                    }%`,
                    background:
                      wildPokemon.currentHP / wildPokemon.maxHP > 0.5
                        ? "#4ade80"
                        : wildPokemon.currentHP / wildPokemon.maxHP > 0.25
                        ? "#fbbf24"
                        : "#ef4444",
                  }}
                />
              </div>
              <span className="hp-text">
                {wildPokemon.currentHP}/{wildPokemon.maxHP}
              </span>
            </div>
            <div className="types">
              {wildPokemon.types.map((type) => (
                <span
                  key={type}
                  className="type-badge"
                  style={{ background: getTypeColor(type) }}
                >
                  {type}
                </span>
              ))}
            </div>
            {Object.keys(wildStatChanges).length > 0 && (
              <div className="stat-changes">
                {Object.entries(wildStatChanges).map(
                  ([stat, change]) =>
                    change !== 0 && (
                      <span
                        key={stat}
                        className={`stat-change ${
                          change > 0 ? "buff" : "debuff"
                        }`}
                      >
                        {stat.replace("-", " ").toUpperCase()}:{" "}
                        {change > 0 ? "+" : ""}
                        {change}
                      </span>
                    )
                )}
              </div>
            )}
          </div>
          <img
            src={wildPokemon.sprite}
            alt={wildPokemon.name}
            className="pokemon-sprite enemy"
          />
        </div>

        <div className="player-section">
          <img
            src={activePokemon.sprite}
            alt={activePokemon.name}
            className="pokemon-sprite player"
          />
          <div className="pokemon-info">
            <h3>
              {activePokemon.name.toUpperCase()}
              <span className="level">Lv.{activePokemon.sessionLevel}</span>
              {playerStatus && (
                <span className="status-badge">
                  {playerStatus.type.toUpperCase()}
                </span>
              )}
            </h3>
            <div className="hp-bar-container">
              <div className="hp-bar">
                <div
                  className="hp-fill"
                  style={{
                    width: `${
                      (activePokemon.currentHP / activePokemon.maxHP) * 100
                    }%`,
                    background:
                      activePokemon.currentHP / activePokemon.maxHP > 0.5
                        ? "#4ade80"
                        : activePokemon.currentHP / activePokemon.maxHP > 0.25
                        ? "#fbbf24"
                        : "#ef4444",
                  }}
                />
              </div>
              <span className="hp-text">
                {activePokemon.currentHP}/{activePokemon.maxHP}
              </span>
              <div className="types">
                {activePokemon.types?.map((type) => (
                  <span
                    key={type}
                    className="type-badge"
                    style={{ background: getTypeColor(type) }}
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
            {Object.keys(playerStatChanges).length > 0 && (
              <div className="stat-changes">
                {Object.entries(playerStatChanges).map(
                  ([stat, change]) =>
                    change !== 0 && (
                      <span
                        key={stat}
                        className={`stat-change ${
                          change > 0 ? "buff" : "debuff"
                        }`}
                      >
                        {stat.replace("-", " ").toUpperCase()}:{" "}
                        {change > 0 ? "+" : ""}
                        {change}
                      </span>
                    )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="battle-log">
        {battleLog.slice(-4).map((log, idx) => (
          <div key={idx} className="log-entry">
            {log}
          </div>
        ))}
      </div>

      <div className="battle-actions">
        {battlePhase === "battle" && isPlayerTurn && !isAnimating && (
          <>
            <div className="moves-grid">
              {activePokemon.moves.map((move, idx) => {
                const moveData = MOVES_DATABASE[move] || {
                  type: "normal",
                  power: 50,
                  pp: 10,
                };
                const currentPP = movePP[move] || 0;
                const isOutOfPP = currentPP <= 0;

                return (
                  <button
                    key={idx}
                    className={`move-btn ${isOutOfPP ? "out-of-pp" : ""}`}
                    onClick={() => !isOutOfPP && playerAttack(idx)}
                    disabled={isOutOfPP}
                    style={{
                      borderLeft: `4px solid ${getTypeColor(moveData.type)}`,
                      opacity: isOutOfPP ? 0.5 : 1,
                    }}
                  >
                    <div className="move-name">
                      {move.replace("-", " ").toUpperCase()}
                    </div>
                    <div className="move-info">
                      <span
                        className="move-type"
                        style={{ background: getTypeColor(moveData.type) }}
                      >
                        {moveData.type}
                      </span>
                      <span className="move-category">{moveData.category}</span>
                      {moveData.power > 0 && (
                        <span className="move-power">
                          PWR: {moveData.power}
                        </span>
                      )}
                      <span className="move-pp">
                        PP: {currentPP}/{moveData.pp}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="other-actions">
              <button className="action-btn" onClick={attemptRun}>
                Run
              </button>
            </div>
          </>
        )}

        {battlePhase === "victory" && !isMinting && (
          <div className="victory-actions">
            <h3>Victory!</h3>
            <button className="capture-btn" onClick={attemptCapture}>
              Attempt Capture ({captureChance}% chance)
            </button>
            <button
              className="continue-btn"
              onClick={() => onBattleEnd(playerTeam, true)}
            >
              Continue →
            </button>
          </div>
        )}

        {battlePhase === "defeat" && (
          <div className="defeat-actions">
            <h3>All Pokémon fainted...</h3>
            <button
              className="game-over-btn"
              onClick={() => onBattleEnd(playerTeam, false)}
            >
              End Run
            </button>
          </div>
        )}

        {isMinting && (
          <div className="minting-status">
            <div className="spinner"></div>
            <p>Minting NFT...</p>
          </div>
        )}
      </div>

      <div className="team-display">
        {playerTeam.map((pokemon, idx) => (
          <div
            key={pokemon.id}
            className={`team-slot ${
              idx === activePlayerIndex ? "active" : ""
            } ${pokemon.currentHP <= 0 ? "fainted" : ""}`}
            onClick={() =>
              idx !== activePlayerIndex &&
              isPlayerTurn &&
              !isAnimating &&
              switchPokemon(idx)
            }
          >
            <img src={pokemon.sprite} alt={pokemon.name} />
            <div className="mini-hp">
              <div
                className="mini-hp-fill"
                style={{
                  width: `${(pokemon.currentHP / pokemon.maxHP) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
