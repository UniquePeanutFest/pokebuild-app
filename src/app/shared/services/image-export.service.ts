import { Injectable } from '@angular/core';
import { PokemonTeam, TeamPokemon } from '../../Services/teams.service';
import { PokemonDetail } from '../../Services/pokemon.service';

@Injectable({
  providedIn: 'root'
})
export class ImageExportService {

  constructor() { }

  async exportTeamAsImage(team: PokemonTeam): Promise<string> {
    // Crear un canvas para renderizar el equipo
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('No se pudo crear el contexto del canvas');
    }

    // Configurar dimensiones del canvas
    const width = 800;
    const height = 600;
    canvas.width = width;
    canvas.height = height;

    // Fondo degradado
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Título del equipo
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(team.name.toUpperCase(), width / 2, 50);

    // Badge del modo de juego
    const gameMode = team.gameMode || 'pve';
    const modeColor = gameMode === 'pve' ? '#4CAF50' : '#FF9800';
    const modeText = gameMode.toUpperCase();
    
    ctx.fillStyle = modeColor;
    ctx.fillRect(width / 2 - 60, 70, 120, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(modeText, width / 2, 90);

    // Renderizar Pokémon
    const pokemonSize = 120;
    const pokemonSpacing = 100;
    const startX = (width - (6 * pokemonSpacing)) / 2;
    const startY = 150;

    for (let i = 0; i < 6; i++) {
      const x = startX + (i * pokemonSpacing);
      const y = startY;

      if (i < team.pokemons.length) {
        const teamPokemon = team.pokemons[i];
        await this.drawPokemonCard(ctx, teamPokemon, x, y, pokemonSize);
      } else {
        this.drawEmptySlot(ctx, x, y, pokemonSize);
      }
    }

    // Footer con información
    ctx.fillStyle = '#cccccc';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Equipo creado con PokéBuild - ${new Date().toLocaleDateString()}`, width / 2, height - 20);

    return canvas.toDataURL('image/png');
  }

  private async drawPokemonCard(
    ctx: CanvasRenderingContext2D, 
    teamPokemon: TeamPokemon, 
    x: number, 
    y: number, 
    size: number
  ): Promise<void> {
    const pokemon = teamPokemon.pokemon;
    
    // Fondo de la tarjeta
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - size/2, y - size/2, size, size + 40);
    
    // Borde
    ctx.strokeStyle = '#dc0a2d';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - size/2, y - size/2, size, size + 40);

    // Imagen del Pokémon (placeholder por ahora)
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(x - size/2 + 10, y - size/2 + 10, size - 20, size - 20);
    
    // Texto "Pokémon" como placeholder
    ctx.fillStyle = '#666666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Pokémon', x, y);

    // Nombre del Pokémon
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(this.getPokemonDisplayName(teamPokemon), x, y + size/2 + 15);

    // Número del Pokémon
    ctx.fillStyle = '#666666';
    ctx.font = '12px Arial';
    ctx.fillText(`#${pokemon.id.toString().padStart(3, '0')}`, x, y + size/2 + 30);

    // Item si existe
    if (pokemon.item) {
      ctx.fillStyle = '#4CAF50';
      ctx.font = '10px Arial';
      ctx.fillText('Item: ' + this.getItemName(pokemon.item), x, y + size/2 + 45);
    }
  }

  private drawEmptySlot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    // Fondo vacío
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(x - size/2, y - size/2, size, size + 40);
    
    // Borde punteado
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x - size/2, y - size/2, size, size + 40);
    ctx.setLineDash([]);

    // Icono de más
    ctx.fillStyle = '#cccccc';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('+', x, y + 10);

    // Texto
    ctx.fillStyle = '#999999';
    ctx.font = '12px Arial';
    ctx.fillText('Vacío', x, y + size/2 + 15);
  }

  private getPokemonDisplayName(teamPokemon: TeamPokemon): string {
    let displayName = teamPokemon.pokemon.name;
    
    if (teamPokemon.form === 'mega') {
      if (teamPokemon.megaVariant?.name.includes('mega-x')) {
        return `${displayName} (Mega X)`;
      } else if (teamPokemon.megaVariant?.name.includes('mega-y')) {
        return `${displayName} (Mega Y)`;
      }
      return `${displayName} (Mega)`;
    } else if (teamPokemon.form === 'gigantamax') {
      return `${displayName} (Gigantamax)`;
    }
    
    return displayName;
  }

  private getItemName(item: any): string {
    return item.name.replace(/-/g, ' ');
  }

  async downloadImage(dataUrl: string, filename: string): Promise<void> {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
