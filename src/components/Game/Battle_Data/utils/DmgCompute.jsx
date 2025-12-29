import MOVES_DATABASE from "../MoveDatabase";
import TYPE_EFFECTIVENESS from "../TypeEffectiveness";

export function getTypeEffectiveness(moveType, defenderTypes) {
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
}

export function applyStatModifier(baseStat, stages) {
  if (stages === 0) return baseStat;
  const multiplier = stages > 0 ? (2 + stages) / 2 : 2 / (2 + Math.abs(stages));
  return Math.floor(baseStat * multiplier);
}

export function calculateDamage(
  attacker,
  defender,
  moveName,
  attackerStatChanges,
  defenderStatChanges
) {
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
}
