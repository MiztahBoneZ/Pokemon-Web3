// src/game/main.js
import TeamSelectScene from "./TeamSelectScene";
import BattleScene from "./BattleScene";
import ChoiceScene from "./ChoiceScene";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#222",
  parent: "phaser-container",
  scene: [TeamSelectScene, BattleScene, ChoiceScene],
};

export default config;
