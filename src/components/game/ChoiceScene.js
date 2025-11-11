export default class ChoiceScene extends Phaser.Scene {
  constructor() {
    super('ChoiceScene');
  }

  create() {
    this.add.text(280, 80, 'Choose your next path', { fontSize: '26px', fill: '#fff' });

    const choices = [
      { text: 'Move to Desert Biome', next: 'BattleScene' },
      { text: 'Visit the Shop', next: 'BattleScene' },
      { text: 'Move Deeper into Forest', next: 'BattleScene' }
    ];

    const shuffled = Phaser.Utils.Array.Shuffle(choices).slice(0, 2);
    let y = 200;

    shuffled.forEach(choice => {
      this.add.text(260, y, choice.text, { fontSize: '22px', fill: '#0f0' })
        .setInteractive()
        .on('pointerdown', () => this.selectChoice(choice));
      y += 60;
    });
  }

  selectChoice(choice) {
    this.registry.set('nextChoice', choice.text);
    this.scene.start(choice.next);
  }
}
