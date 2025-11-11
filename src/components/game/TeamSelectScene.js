import pokemonData from './data/pokemonData.json';

export default class TeamSelectScene extends Phaser.Scene {
  constructor() {
    super('TeamSelectScene');
  }

  create() {
    this.add.text(250, 40, 'Choose 3 Pokémon', { fontSize: '28px', fill: '#fff' });

    this.selected = [];
    let y = 120;

    pokemonData.forEach((p, index) => {
    const typeText = Array.isArray(p.type) ? p.type.join('/') : p.types; // handle single or multiple types
    const text = this.add.text(280, y, `${p.name} (${typeText})`, { fontSize: '20px', fill: '#aaa' })
      .setInteractive()
      .on('pointerdown', () => this.selectPokemon(p, text));

    y += 50;  
  });
  }

  selectPokemon(pokemon, text) {
    if (this.selected.length >= 3 || this.selected.includes(pokemon)) return;

    text.setStyle({ fill: '#0f0' });
    this.selected.push(pokemon);

    if (this.selected.length === 3) {
      this.registry.set('playerTeam', this.selected);
      this.scene.start('BattleScene');
    }
  }
}
