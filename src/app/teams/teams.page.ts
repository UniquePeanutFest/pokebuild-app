import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule, NavController, ToastController } from '@ionic/angular';
import { PokemonTeam, TeamsService } from '../Services/teams.service';
import { TeamDetailsComponent } from './team-details/team-details.component';
import { PokemonSelectorModalComponent } from './pokemon-selector-modal/pokemon-selector-modal.component';
import { ConfirmActionModalComponent } from './confirm-action-modal/confirm-action-modal.component';
import { RouterModule } from '@angular/router';
import { PokemonService } from '../Services/pokemon.service';

@Component({
  selector: 'app-teams',
  templateUrl: './teams.page.html',
  styleUrls: ['./teams.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class TeamsPage implements OnInit {
  teams: PokemonTeam[] = [];
  isLoading: boolean = false;
  error: string = '';

  // Propiedades para el menú contextual
  showMenu: boolean = false;
  menuX: number = 0;
  menuY: number = 0;
  selectedTeam: PokemonTeam | null = null;

  constructor(
    private teamsService: TeamsService,
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private pokemonService: PokemonService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.loadTeams();
    
    // Cerrar el menú contextual al hacer clic en cualquier lugar
    document.addEventListener('click', () => {
      this.showMenu = false;
    });
    
    // También cerrar el menú al tocar en cualquier lugar (móviles)
    document.addEventListener('touchstart', () => {
      this.showMenu = false;
    });
  }

  ionViewWillEnter() {
    this.loadTeams();
  }

  async loadTeams() {
    this.isLoading = true;
    try {
      this.teams = await this.teamsService.getTeams();
      this.error = '';
    } catch (error) {
      console.error('Error al cargar equipos:', error);
      this.error = 'No se pudieron cargar los equipos';
    } finally {
      this.isLoading = false;
    }
  }

  async createTeam() {
    const alert = await this.alertCtrl.create({
      header: 'Nuevo Equipo',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre del equipo'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Crear',
          handler: async (data) => {
            if (data.name && data.name.trim()) {
              try {
                const team = await this.teamsService.createTeam(data.name.trim());
                this.teams.push(team);
                this.viewTeamDetails(team.id);
              } catch (error) {
                console.error('Error al crear equipo:', error);
              }
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  viewTeamDetails(teamId: string) {
    this.navCtrl.navigateForward(`/teams/${teamId}`);
  }

  getTeamPokemonCount(team: PokemonTeam): string {
    const count = team.pokemons.length;
    return `${count}/6`;
  }

  getFirstPokemonImage(team: PokemonTeam): string {
    if (!team || !team.pokemons || team.pokemons.length === 0) {
      return 'assets/icon/pokeball.png';
    }
    
    const teamPokemon = team.pokemons[0];
    
    // Si no hay información del Pokémon
    if (!teamPokemon.pokemon || !teamPokemon.pokemon.sprites) {
      return 'assets/icon/pokeball.png';
    }
    
    // 1. Primero, revisar si tiene una forma especificada
    if (teamPokemon.form) {
      // Si es Gigantamax
      if (teamPokemon.form.toLowerCase().includes('gigantamax') || 
          teamPokemon.form.toLowerCase().includes('gmax')) {
        if ((teamPokemon.pokemon.sprites as any).gmax) {
          return (teamPokemon.pokemon.sprites as any).gmax;
        }
        
        // Intentar usar el sprite si tiene ID de Gigantamax
        if (teamPokemon.pokemon.id > 10000) {
          return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${teamPokemon.pokemon.id}.png`;
        }
      }
      
      // Si es Mega evolución
      if (teamPokemon.form.toLowerCase().includes('mega')) {
        if ((teamPokemon.pokemon.sprites as any).mega) {
          return (teamPokemon.pokemon.sprites as any).mega;
        }
        
        // Intentar usar el sprite si tiene ID de Mega
        if (teamPokemon.pokemon.id > 10000) {
          return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${teamPokemon.pokemon.id}.png`;
        }
      }
    }
    
    // 2. Luego revisar si el nombre tiene indicación de forma especial
    const pokemonName = teamPokemon.pokemon.name || '';
    if (pokemonName.includes('(')) {
      const formMatch = pokemonName.match(/\(([^)]+)\)/);
      if (formMatch) {
        const form = formMatch[1].toLowerCase();
        
        // Buscar formas especiales en el nombre
        if (form.includes('gigantamax') || form.includes('gmax')) {
          if ((teamPokemon.pokemon.sprites as any).gmax) {
            return (teamPokemon.pokemon.sprites as any).gmax;
          }
          
          // Intentar usar el ID para Gigantamax
          if (teamPokemon.pokemon.id > 10000) {
            return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${teamPokemon.pokemon.id}.png`;
          }
        }
        
        if (form.includes('mega')) {
          if ((teamPokemon.pokemon.sprites as any).mega) {
            return (teamPokemon.pokemon.sprites as any).mega;
          }
          
          // Intentar usar el ID para Mega
          if (teamPokemon.pokemon.id > 10000) {
            return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${teamPokemon.pokemon.id}.png`;
          }
        }
      }
    }
    
    // 3. Finalmente usar el artwork oficial o fallback
    return teamPokemon.pokemon.sprites.other?.['official-artwork']?.front_default || 
           teamPokemon.pokemon.sprites.front_default || 
           'assets/icon/pokeball.png';
  }

  getFormattedDate(date: Date): string {
    if (!date) return '';
    
    const d = new Date(date);
    return d.toLocaleDateString();
  }

  /**
   * Muestra un diálogo de confirmación para eliminar un equipo
   */
  async confirmDeleteTeam(team: PokemonTeam | null) {
    if (!team) return;
    
    const alert = await this.alertCtrl.create({
      header: 'Eliminar equipo',
      message: `¿Estás seguro de que deseas eliminar el equipo "${team.name}"? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.deleteTeam(team.id);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Elimina un equipo del almacenamiento
   */
  async deleteTeam(teamId: string) {
    this.isLoading = true;
    try {
      await this.teamsService.deleteTeam(teamId);
      this.teams = this.teams.filter(team => team.id !== teamId);
      
      // Mostrar notificación de éxito
      const successAlert = await this.alertCtrl.create({
        header: 'Equipo eliminado',
        message: 'El equipo ha sido eliminado correctamente.',
        buttons: ['OK']
      });
      await successAlert.present();
      
    } catch (error) {
      console.error('Error al eliminar el equipo:', error);
      
      // Mostrar notificación de error
      const errorAlert = await this.alertCtrl.create({
        header: 'Error',
        message: 'No se pudo eliminar el equipo. Inténtalo de nuevo.',
        buttons: ['OK']
      });
      await errorAlert.present();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Muestra el menú contextual en la posición del clic derecho o press
   */
  showContextMenu(event: MouseEvent | any, team: PokemonTeam) {
    // Evitar acciones por defecto
    event.preventDefault?.();
    event.stopPropagation?.();
    
    // Guardar el equipo seleccionado
    this.selectedTeam = team;
    
    // Obtener las coordenadas según el tipo de evento
    if (event instanceof MouseEvent) {
      // Clic derecho (contextmenu)
      this.menuX = event.clientX;
      this.menuY = event.clientY;
    } else {
      // Evento press (mantener pulsado)
      // Obtenemos la posición del objetivo del evento
      const rect = event.target.getBoundingClientRect();
      this.menuX = rect.left + rect.width / 2; // Centro horizontal
      this.menuY = rect.top + rect.height / 2; // Centro vertical
    }
    
    // Mostrar el menú
    this.showMenu = true;
  }
  
  /**
   * Abre un diálogo para editar el nombre del equipo
   */
  async editTeamName(team: PokemonTeam | null) {
    if (!team) return;
    
    this.showMenu = false;
    
    const alert = await this.alertCtrl.create({
      header: 'Editar nombre del equipo',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: team.name,
          placeholder: 'Nombre del equipo'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (data.name && data.name.trim() !== '') {
              await this.updateTeamName(team.id, data.name);
            }
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  /**
   * Actualiza el nombre del equipo en el almacenamiento
   */
  async updateTeamName(teamId: string, newName: string) {
    this.isLoading = true;
    try {
      // Buscar el equipo a actualizar
      const teamToUpdate = this.teams.find(t => t.id === teamId);
      if (!teamToUpdate) return;
      
      // Actualizar el nombre
      teamToUpdate.name = newName;
      
      // Guardar en el almacenamiento
      await this.teamsService.updateTeam(teamToUpdate);
      
      // Recargar los equipos para mostrar los cambios
      await this.loadTeams();
      
      // Mostrar notificación de éxito
      const successAlert = await this.alertCtrl.create({
        header: 'Nombre actualizado',
        message: 'El nombre del equipo ha sido actualizado correctamente.',
        buttons: ['OK']
      });
      await successAlert.present();
      
    } catch (error) {
      console.error('Error al actualizar el nombre del equipo:', error);
      
      // Mostrar notificación de error
      const errorAlert = await this.alertCtrl.create({
        header: 'Error',
        message: 'No se pudo actualizar el nombre del equipo. Inténtalo de nuevo.',
        buttons: ['OK']
      });
      await errorAlert.present();
    } finally {
      this.isLoading = false;
    }
  }

  // Helper method to show toast messages
  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
} 