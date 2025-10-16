import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { PokemonTeam, TeamPokemon } from '../../../Services/teams.service';
import { PokemonDetail, PokemonService } from '../../../Services/pokemon.service';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-export-team-modal',
  templateUrl: './export-team-modal.component.html',
  styleUrls: ['./export-team-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class ExportTeamModalComponent implements OnInit {
  @Input() team: PokemonTeam | null = null;
  @ViewChild('teamPreview', { static: false }) teamPreview!: ElementRef;

  exportFormat: 'png' | 'jpg' = 'png';
  exportQuality: number = 0.9;
  isExporting: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    public pokemonService: PokemonService
  ) { }

  ngOnInit() {
    // El equipo se pasa como input desde el componente padre
  }

  async exportTeam() {
    if (!this.team || !this.teamPreview) {
      this.showToast('Error: No se puede exportar el equipo', 'danger');
      return;
    }

    this.isExporting = true;

    try {
      // Configurar opciones de html2canvas
      const canvas = await html2canvas(this.teamPreview.nativeElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Mayor resolución
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: this.teamPreview.nativeElement.offsetWidth,
        height: this.teamPreview.nativeElement.offsetHeight
      });

      // Convertir a blob según el formato seleccionado
      const blob = await this.canvasToBlob(canvas, this.exportFormat, this.exportQuality);
      
      // Crear URL del blob y descargar
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.team.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_team.${this.exportFormat}`;
      
      // Simular click para descargar
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL
      URL.revokeObjectURL(url);
      
      this.showToast('Equipo exportado exitosamente', 'success');
      this.modalCtrl.dismiss();
      
    } catch (error) {
      console.error('Error al exportar equipo:', error);
      this.showToast('Error al exportar el equipo', 'danger');
    } finally {
      this.isExporting = false;
    }
  }

  private canvasToBlob(canvas: HTMLCanvasElement, format: 'png' | 'jpg', quality: number): Promise<Blob> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          throw new Error('Error al convertir canvas a blob');
        }
      }, `image/${format}`, quality);
    });
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  // Métodos auxiliares para el template
  getPokemonImageUrl(teamPokemon: TeamPokemon): string {
    const pokemon = teamPokemon.pokemon;
    
    if (teamPokemon.form === 'mega' && teamPokemon.megaVariant) {
      return teamPokemon.megaVariant.sprite || this.getDefaultPokemonImage(pokemon);
    }
    
    if (teamPokemon.form === 'gigantamax') {
      const gigantamaxSprite = this.pokemonService.getGigantamaxSprite(pokemon);
      if (gigantamaxSprite) {
        return gigantamaxSprite;
      }
      return this.getDefaultPokemonImage(pokemon);
    }
    
    return this.getDefaultPokemonImage(pokemon);
  }

  private getDefaultPokemonImage(pokemon: PokemonDetail): string {
    return pokemon.sprites.other?.['official-artwork']?.front_default || 
           pokemon.sprites.front_default || 
           `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
  }

  getPokemonDisplayName(teamPokemon: TeamPokemon): string {
    let displayName = teamPokemon.pokemon.name;
    if (displayName.includes('-gmax')) {
      displayName = displayName.split('-gmax')[0];
    }
    
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

  getPokemonTypes(teamPokemon: TeamPokemon): any[] {
    if (teamPokemon.form === 'mega' && teamPokemon.megaVariant?.types) {
      return teamPokemon.megaVariant.types;
    }
    return teamPokemon.pokemon.types;
  }

  getTypeColor(type: string): string {
    return this.pokemonService.getTypeColor(type);
  }

  getPokemonStat(teamPokemon: TeamPokemon, statName: string): number {
    if (teamPokemon.adjustedStats && statName in teamPokemon.adjustedStats) {
      return teamPokemon.adjustedStats[statName as keyof typeof teamPokemon.adjustedStats];
    }
    return teamPokemon.pokemon.stats.find(s => s.stat.name === statName)?.base_stat || 0;
  }

  getItemName(item: any): string {
    return this.pokemonService.getItemName(item);
  }

  getEmptySlots(): number[] {
    if (!this.team) return [];
    const emptySlotCount = Math.max(0, 6 - this.team.pokemons.length);
    return Array(emptySlotCount).fill(0).map((_, i) => i);
  }
}