const TYPE_EFFECTIVENESS = {
  normal: {
    superEffective: [],
    notVery: ["rock", "steel"],
    noEffect: ["ghost"],
  },
  fire: {
    superEffective: ["grass", "ice", "bug", "steel"],
    notVery: ["fire", "water", "rock", "dragon"],
    noEffect: [],
  },
  water: {
    superEffective: ["fire", "ground", "rock"],
    notVery: ["water", "grass", "dragon"],
    noEffect: [],
  },
  electric: {
    superEffective: ["water", "flying"],
    notVery: ["electric", "grass", "dragon"],
    noEffect: ["ground"],
  },
  grass: {
    superEffective: ["water", "ground", "rock"],
    notVery: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
    noEffect: [],
  },
  ice: {
    superEffective: ["grass", "ground", "flying", "dragon"],
    notVery: ["fire", "water", "ice", "steel"],
    noEffect: [],
  },
  fighting: {
    superEffective: ["normal", "ice", "rock", "dark", "steel"],
    notVery: ["poison", "flying", "psychic", "bug", "fairy"],
    noEffect: ["ghost"],
  },
  poison: {
    superEffective: ["grass", "fairy"],
    notVery: ["poison", "ground", "rock", "ghost"],
    noEffect: ["steel"],
  },
  ground: {
    superEffective: ["fire", "electric", "poison", "rock", "steel"],
    notVery: ["grass", "bug"],
    noEffect: ["flying"],
  },
  flying: {
    superEffective: ["grass", "fighting", "bug"],
    notVery: ["electric", "rock", "steel"],
    noEffect: [],
  },
  psychic: {
    superEffective: ["fighting", "poison"],
    notVery: ["psychic", "steel"],
    noEffect: ["dark"],
  },
  bug: {
    superEffective: ["grass", "psychic", "dark"],
    notVery: [
      "fire",
      "fighting",
      "poison",
      "flying",
      "ghost",
      "steel",
      "fairy",
    ],
    noEffect: [],
  },
  rock: {
    superEffective: ["fire", "ice", "flying", "bug"],
    notVery: ["fighting", "ground", "steel"],
    noEffect: [],
  },
  ghost: {
    superEffective: ["psychic", "ghost"],
    notVery: ["dark"],
    noEffect: ["normal"],
  },
  dragon: {
    superEffective: ["dragon"],
    notVery: ["steel"],
    noEffect: ["fairy"],
  },
  dark: {
    superEffective: ["psychic", "ghost"],
    notVery: ["fighting", "dark", "fairy"],
    noEffect: [],
  },
  steel: {
    superEffective: ["ice", "rock", "fairy"],
    notVery: ["fire", "water", "electric", "steel"],
    noEffect: [],
  },
  fairy: {
    superEffective: ["fighting", "dragon", "dark"],
    notVery: ["fire", "poison", "steel"],
    noEffect: [],
  },
};
export default TYPE_EFFECTIVENESS;
