export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  preload() {
    for (let i = 1; i <= 47; i++) {
      this.load.image(`pokemon_${i}`, `assets/sprites/${i}.png`);
    }
    this.load.json('typechart', './src/game/data/typechart.json');
    this.load.json('allPokemon', './src/game/data/pokemondata.json');
  }

  create() {
    this.typeChart = this.cache.json.get('typechart');
    this.add.text(280, 40, 'Battle Start!', { fontSize: '28px', fill: '#fff' });

    this.playerTeam = [...this.registry.get('playerTeam')];

    // ensure valid HP fields
    this.playerTeam = this.playerTeam.map(p => ({
      ...p,
      maxHp: p.maxHp ?? p.hp ?? 100,
      hp: p.hp ?? p.maxHp ?? 100
    }));

    const first = this.playerTeam.shift();
    this.currentPlayer = {
      ...first,
      hp: first.hp,
      maxHp: first.maxHp,
    };

    // --- randomly pick an enemy from the same dataset ---
    const allPokemon = this.cache.json.get('allPokemon');    
    const randomEnemy = Phaser.Utils.Array.GetRandom(allPokemon.filter(p => p.id !== this.currentPlayer.id));

    this.enemy = {
      ...randomEnemy,
      hp: randomEnemy.hp,
      maxHp: randomEnemy.maxHp ?? randomEnemy.hp,
    };

    this.turn = 'player';
    this.battleText = this.add.text(120, 500, '', { fontSize: '18px', fill: '#fff' });

    this.createSprites();
    this.createUI();
    this.updateUI();
  }

  createSprites() {
    if (this.playerSprite) this.playerSprite.destroy();
    if (this.enemySprite) this.enemySprite.destroy();

    // player sprite (bottom left)
    this.playerSprite = this.add.image(200, 350, `pokemon_${this.currentPlayer.id}`)
      .setScale(2)
      .setFlipX(true);

    // enemy sprite (top right)
    this.enemySprite = this.add.image(600, 150, `pokemon_${this.enemy.id}`)
      .setScale(2);
  }

  createUI() {
    if (this.uiGroup) {
    this.uiGroup.destroy(true);
    }
    this.uiGroup = this.add.group();


    // --- Player UI ---
    this.playerNameText = this.add.text(60, 120, this.currentPlayer.name, { fontSize: "20px", fill: "#fff" });
    this.playerHpBg = this.add.rectangle(150, 150, 200, 20, 0x333333).setOrigin(0, 0.5);
    this.playerHpBar = this.add.rectangle(150, 150, 200, 20, 0x00ff00).setOrigin(0, 0.5);
    this.playerHpText = this.add.text(360, 140, '', { fontSize: "16px", fill: "#fff" });

    // --- Enemy UI ---
    this.enemyNameText = this.add.text(520, 50, this.enemy.name, { fontSize: "20px", fill: "#fff" });
    this.enemyHpBg = this.add.rectangle(520, 80, 200, 20, 0x333333).setOrigin(0, 0.5);
    this.enemyHpBar = this.add.rectangle(520, 80, 200, 20, 0x00ff00).setOrigin(0, 0.5);
    this.enemyHpText = this.add.text(720, 70, '', { fontSize: "16px", fill: "#fff" });

    this.uiGroup.addMultiple([
      this.playerNameText, this.playerHpBg, this.playerHpBar, this.playerHpText,
      this.enemyNameText, this.enemyHpBg, this.enemyHpBar, this.enemyHpText
    ]);

    // --- Move Buttons ---
    let y = 350;
    this.moveButtons = [];
    this.currentPlayer.moves.forEach((move) => {
      const btn = this.add.text(100, y, move.name, {
        fontSize: "20px",
        fill: "#0f0"
      })
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          if (this.turn !== 'player') return;
          this.playerAttack(move);
        });

      this.moveButtons.push(btn);
      this.uiGroup.add(btn);
      y += 40;
    });

    this.uiGroup.setDepth(10);
  }

  updateUI() {
    if (!this.playerHpBar || !this.enemyHpBar) return;

    const playerHp = Math.max(0, this.currentPlayer.hp);
    const enemyHp = Math.max(0, this.enemy.hp);
    const playerMax = Math.max(1, this.currentPlayer.maxHp);
    const enemyMax = Math.max(1, this.enemy.maxHp);

    const playerPercent = Phaser.Math.Clamp(playerHp / playerMax, 0, 1);
    const enemyPercent = Phaser.Math.Clamp(enemyHp / enemyMax, 0, 1);

    const getColor = (pct) =>
      pct > 0.5 ? 0x00ff00 : pct > 0.25 ? 0xffff00 : 0xff0000;

    this.playerHpBar.displayWidth = 200 * playerPercent;
    this.enemyHpBar.displayWidth = 200 * enemyPercent;

    this.playerHpBar.fillColor = getColor(playerPercent);
    this.enemyHpBar.fillColor = getColor(enemyPercent);

    this.playerHpText.setText(`${Math.floor(playerHp)}/${Math.floor(playerMax)}`);
    this.enemyHpText.setText(`${Math.floor(enemyHp)}/${Math.floor(enemyMax)}`);
  }

  playerAttack(move) {
  if (this.turn !== 'player') return;
  this.turn = 'busy';
  this.setMoveButtonsEnabled(false);

  // Ensure attacker and defender types are arrays
  const attackerTypes = Array.isArray(this.currentPlayer.types) ? this.currentPlayer.types : [this.currentPlayer.types];
  const defenderTypes = Array.isArray(this.enemy.types) ? this.enemy.types : [this.enemy.types];

  const multiplier = this.getEffectiveness(attackerTypes, defenderTypes);
  const damage = Math.max(1, Math.round(move.power * multiplier));
  this.enemy.hp = Math.max(0, this.enemy.hp - damage);

  this.showBattleText(`${this.currentPlayer.name} used ${move.name}! (-${damage})`);
  this.updateUI();

  if (this.enemy.hp <= 0) {
    this.time.delayedCall(600, () => this.endBattle(true));
    return;
  }

  this.time.delayedCall(800, () => {
    this.turn = 'enemy';
    this.enemyAttack();
  });
}

enemyAttack() {
  const move = Phaser.Utils.Array.GetRandom(this.enemy.moves);

  const attackerTypes = Array.isArray(this.enemy.types) ? this.enemy.types : [this.enemy.types];
  const defenderTypes = Array.isArray(this.currentPlayer.types) ? this.currentPlayer.types : [this.currentPlayer.types];

  const multiplier = this.getEffectiveness(attackerTypes, defenderTypes);
  const damage = Math.max(1, Math.round(move.power * multiplier));
  this.currentPlayer.hp = Math.max(0, this.currentPlayer.hp - damage);

  this.showBattleText(`${this.enemy.name} used ${move.name}! (-${damage})`);
  this.updateUI();

  if (this.currentPlayer.hp <= 0) {
    if (this.playerTeam.length > 0) {
      this.time.delayedCall(700, () => {
        this.showBattleText(`${this.currentPlayer.name} fainted!`);
        this.time.delayedCall(800, () => this.switchNextPokemon());
      });
    } else {
      this.time.delayedCall(700, () => this.endBattle(false));
    }
  } else {
    this.time.delayedCall(400, () => {
      this.turn = 'player';
      this.setMoveButtonsEnabled(true);
    });
  }
}

  switchNextPokemon() {
    const next = this.playerTeam.shift();
    if (!next) {
      this.endBattle(false);
      return;
    }
    this.currentPlayer = {
      ...next,
      hp: next.hp ?? next.maxHp ?? 100,
      maxHp: next.maxHp ?? next.hp ?? 100
    };
    this.createSprites();
    this.createUI();
    this.updateUI();
    this.turn = 'player';
    this.setMoveButtonsEnabled(true);
  }

  setMoveButtonsEnabled(enabled) {
    if (!this.moveButtons) return;
    this.moveButtons.forEach(btn => {
      btn.disableInteractive();
      if (enabled) btn.setInteractive({ useHandCursor: true });
      btn.alpha = enabled ? 1 : 0.5;
    });
  }

  getEffectiveness(attackerTypes, defenderTypes) {
  if (!this.typeChart || !attackerTypes || !defenderTypes) return 1;

  let totalMultiplier = 1;

  attackerTypes.forEach(attackerType => {
    const chart = this.typeChart[attackerType];
    if (!chart) return; // Skip if the attacking type isn't in the chart

    defenderTypes.forEach(defType => {
      const multiplier = chart[defType] ?? 1;
      totalMultiplier *= multiplier;
    });
  });

  return totalMultiplier;
}


  showBattleText(text) {
    this.battleText.setText(text);
  }

  endBattle(victory) {
    if (victory) {
      this.showBattleText('You won the battle!');
      this.time.delayedCall(1500, () => this.scene.start('ChoiceScene'));
    } else {
      this.showBattleText('You lost the battle...');
    }
  }
}
