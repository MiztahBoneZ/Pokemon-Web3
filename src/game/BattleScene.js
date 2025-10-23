export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  create() {
    this.add.text(280, 40, 'Battle Start!', { fontSize: '28px', fill: '#fff' });

    this.typeChart = {
      Fire: { Grass: 2, Water: 0.5, Fire: 1 },
      Water: { Fire: 2, Grass: 0.5, Water: 1 },
      Grass: { Water: 2, Fire: 0.5, Grass: 1 },
    };

    this.playerTeam = [...this.registry.get('playerTeam')];

    // ensure each pokemon has maxHp property
    this.playerTeam = this.playerTeam.map(p => ({
      ...p,
      maxHp: p.maxHp ?? p.hp ?? 100, // fallback if data doesn't include hp
      hp: p.hp ?? (p.maxHp ?? 100)
    }));

    // current player: clone and ensure fields exist
    const first = this.playerTeam.shift();
    this.currentPlayer = {
      ...first,
      hp: first.hp,
      maxHp: first.maxHp
    };

    // make sure enemy has maxHp too
    this.enemy = {
      name: 'Wild Rattata',
      type: 'Normal',
      hp: 40,
      maxHp: 40,
      attack: 45,
      moves: [{ name: 'Tackle', power: 10 }],
    };

    this.turn = 'player';
    this.battleText = this.add.text(120, 500, '', { fontSize: '18px', fill: '#fff' });

    this.createUI();
    this.updateUI(); // initial UI update
  }

  createUI() {
    if (this.uiGroup) {
      this.uiGroup.clear(true, true);
    }
    this.uiGroup = this.add.group();

    // --- Player UI ---
    this.playerNameText = this.add.text(60, 120, this.currentPlayer.name, {
      fontSize: "20px",
      fill: "#fff"
    });

    // background grey bar. setOrigin(0,0.5) so width changes left->right
    this.playerHpBg = this.add.rectangle(150, 150, 200, 20, 0x333333).setOrigin(0, 0.5);

    // foreground bar (fill). start full width
    this.playerHpBar = this.add.rectangle(150, 150, 200, 20, 0x00ff00).setOrigin(0, 0.5);

    // HP text right of bar (keep inside screen)
    this.playerHpText = this.add.text(360, 140, '', {
      fontSize: "16px",
      fill: "#fff"
    });

    this.uiGroup.addMultiple([
      this.playerNameText,
      this.playerHpBg,
      this.playerHpBar,
      this.playerHpText
    ]);

    // --- Enemy UI ---
    this.enemyNameText = this.add.text(520, 50, this.enemy.name, {
      fontSize: "20px",
      fill: "#fff"
    });

    this.enemyHpBg = this.add.rectangle(520, 80, 200, 20, 0x333333).setOrigin(0, 0.5);
    this.enemyHpBar = this.add.rectangle(520, 80, 200, 20, 0x00ff00).setOrigin(0, 0.5);
    // place enemy hp text under the enemy bar and within canvas width
    this.enemyHpText = this.add.text(720, 70, '', {
      fontSize: "16px",
      fill: "#fff"
    });

    this.uiGroup.addMultiple([
      this.enemyNameText,
      this.enemyHpBg,
      this.enemyHpBar,
      this.enemyHpText
    ]);

    // --- Move Buttons ---
    // Remove old buttons if any: handled by uiGroup.clear above
    let y = 350;
    this.moveButtons = [];
    this.currentPlayer.moves.forEach((move) => {
      const btn = this.add.text(100, y, move.name, {
        fontSize: "20px",
        fill: "#0f0",
        backgroundColor: null
      })
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          if (this.turn !== 'player') return;
          this.playerAttack(move);
        });

      this.uiGroup.add(btn);
      this.moveButtons.push(btn);
      y += 40;
    });

    this.uiGroup.setDepth(10);
  }

  updateUI() {
    if (!this.playerHpBar || !this.enemyHpBar) return;

    const playerMax = Number(this.currentPlayer.maxHp) || 1;
    const enemyMax = Number(this.enemy.maxHp) || 1;
    const playerHp = Math.max(0, Number(this.currentPlayer.hp) || 0);
    const enemyHp = Math.max(0, Number(this.enemy.hp) || 0);

    const playerHpPercent = Phaser.Math.Clamp(playerHp / playerMax, 0, 1);
    const enemyHpPercent = Phaser.Math.Clamp(enemyHp / enemyMax, 0, 1);

    const getColor = (pct) =>
      pct > 0.5 ? 0x00ff00 : pct > 0.25 ? 0xffff00 : 0xff0000;

    this.tweens.killTweensOf(this.playerHpBar);
    this.tweens.killTweensOf(this.enemyHpBar);

    // animate to new displayWidth — but only when it actually changes
    const targetPlayerWidth = 200 * playerHpPercent;
    const targetEnemyWidth = 200 * enemyHpPercent;

    this.playerHpBar.displayWidth = Phaser.Math.Clamp(this.playerHpBar.displayWidth || 200, 0, 200);
    this.enemyHpBar.displayWidth = Phaser.Math.Clamp(this.enemyHpBar.displayWidth || 200, 0, 200);

    this.tweens.add({
      targets: this.playerHpBar,
      displayWidth: targetPlayerWidth,
      duration: 350,
      ease: "Cubic.easeOut",
    });

    this.tweens.add({
      targets: this.enemyHpBar,
      displayWidth: targetEnemyWidth,
      duration: 350,
      ease: "Cubic.easeOut",
    });

    // update colors immediately (no flicker because displayWidth is being tweened)
    this.playerHpBar.fillColor = getColor(playerHpPercent);
    this.enemyHpBar.fillColor = getColor(enemyHpPercent);

    // update numeric HP text
    this.playerHpText.setText(`${Math.floor(playerHp)}/${Math.floor(playerMax)}`);
    this.enemyHpText.setText(`${Math.floor(enemyHp)}/${Math.floor(enemyMax)}`);
  }

  playerAttack(move) {
    if (this.turn !== 'player') return;

    // disable move buttons while resolving
    this.turn = 'busy';
    this.setMoveButtonsEnabled(false);

    const multiplier = this.getEffectiveness(move, this.currentPlayer.type, this.enemy.type);
    const damage = Math.max(1, Math.round(move.power * multiplier));
    this.enemy.hp = Math.max(0, this.enemy.hp - damage);

    this.showBattleText(`${this.currentPlayer.name} used ${move.name}! (-${damage})`);
    this.updateUI();

    if (this.enemy.hp <= 0) {
      this.time.delayedCall(600, () => this.endBattle(true));
      return;
    }

    // enemy turn after a short delay
    this.time.delayedCall(800, () => {
      this.turn = 'enemy';
      this.enemyAttack();
    });
  }

  enemyAttack() {
    // pick move and deal damage
    const move = this.enemy.moves[0];
    const multiplier = this.getEffectiveness(move, this.enemy.type, this.currentPlayer.type);
    const damage = Math.max(1, Math.round(move.power * multiplier));
    this.currentPlayer.hp = Math.max(0, this.currentPlayer.hp - damage);

    this.showBattleText(`${this.enemy.name} used ${move.name}! (-${damage})`);
    this.updateUI();

    if (this.currentPlayer.hp <= 0) {
      // fainted
      if (this.playerTeam.length > 0) {
        this.time.delayedCall(700, () => {
          this.showBattleText(`${this.currentPlayer.name} fainted!`);
          this.time.delayedCall(800, () => this.switchNextPokemon());
        });
      } else {
        this.time.delayedCall(700, () => this.endBattle(false));
      }
    } else {
      // back to player - enable buttons
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
    // ensure fields
    this.currentPlayer = {
      ...next,
      hp: next.hp ?? next.maxHp ?? 100,
      maxHp: next.maxHp ?? next.hp ?? 100
    };

    // rebuild UI (clears old buttons) then update
    this.createUI();
    this.updateUI();
    this.turn = 'player';
    this.setMoveButtonsEnabled(true);
  }

  // utility to enable/disable move buttons
  setMoveButtonsEnabled(enabled) {
    if (!this.moveButtons) return;
    this.moveButtons.forEach(btn => {
      btn.disableInteractive();
      if (enabled) btn.setInteractive({ useHandCursor: true });
      // visually show disable by changing alpha
      btn.alpha = enabled ? 1 : 0.5;
    });
  }

  getEffectiveness(move, attackerType, defenderType) {
    const table = this.typeChart[attackerType];
    return table?.[defenderType] ?? 1;
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
