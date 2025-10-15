import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PokemonDetail, PokemonService, ItemDetail } from '../../Services/pokemon.service';
import { PokemonTeam, TeamAnalysis, TeamsService, TeamPokemon } from '../../Services/teams.service';
import { PokemonSelectorModalComponent } from '../pokemon-selector-modal/pokemon-selector-modal.component';
import { ConfirmActionModalComponent } from '../confirm-action-modal/confirm-action-modal.component';
import { SelectedPokemonInfo } from '../pokemon-selector-modal/pokemon-selector-modal.component';
import { ItemSelectorModalComponent } from '../../item-selector-modal/item-selector-modal.component';

// Extender la interfaz TeamAnalysis para nuestras necesidades específicas
interface ExtendedTeamAnalysis extends TeamAnalysis {
  weakAgainst?: string[];
  strongAgainst?: string[];
}

// Interfaz para el Pokémon con su item recomendado
interface PokemonWithItem {
  pokemon: PokemonDetail;
  recommendedItem: ItemDetail | null;
}

@Component({
  selector: 'app-team-details',
  templateUrl: './team-details.component.html',
  styleUrls: ['./team-details.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class TeamDetailsComponent implements OnInit {
  team: PokemonTeam | undefined;
  teamId: string = '';
  isLoading: boolean = false;
  error: string = '';
  analysis: TeamAnalysis | null = null;
  isEditing: boolean = false;
  editingName: string = '';
  gameMode: 'pve' | 'pvp' = 'pve';
  emptySlots: number[] = [];
  recentlyAddedPokemon: PokemonDetail | null = null;
  
  // Objeto para ser usado en template
  Object = Object;

  // Pokémon con sus items recomendados ya resueltos
  pokemonWithItems: { pokemon: PokemonDetail, recommendedItem: ItemDetail | null }[] = [];
  
  // Cachear los items recomendados para cada pokemon para mejorar rendimiento
  private recommendedItemsCache: Map<number, ItemDetail[]> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teamsService: TeamsService,
    public pokemonService: PokemonService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.teamId = id;
        this.loadTeam();
      } else {
        this.error = 'ID de equipo no válido';
      }
    });
    
    // Also check for query params to see if this is a newly created team
    this.route.queryParamMap.subscribe(params => {
      const isNewTeam = params.get('newTeam') === 'true';
      if (isNewTeam) {
        // If it's a new team, we want to ensure we have the latest data
        this.loadTeam();
      }
    });
  }

  async loadTeam() {
    this.isLoading = true;
    try {
      this.team = await this.teamsService.getTeam(this.teamId);
      if (this.team) {
        // Establece el modo de juego desde el equipo o por defecto
        this.gameMode = this.team.gameMode || 'pve';
        this.updateEmptySlots();
        this.updateTeamAnalysis();
        
        // Cargar todos los items recomendados de una vez
        await this.loadAllRecommendedItems();
      } else {
        this.error = 'Equipo no encontrado';
      }
    } catch (error) {
      console.error('Error al cargar equipo:', error);
      this.error = 'Error al cargar el equipo';
    } finally {
      this.isLoading = false;
    }
  }

  async loadAllRecommendedItems() {
    if (!this.team) return;
    
    // Resetear el array
    this.pokemonWithItems = [];
    
    // Cargar todos los items en paralelo
    const promises = this.team.pokemons.map(async teamPokemon => {
      const items = await this.fetchRecommendedItems(teamPokemon.pokemon);
      const recommendedItem = items.length > 0 ? items[0] : null;
      
      // Añadir al array de pokémon con items
      this.pokemonWithItems.push({
        pokemon: teamPokemon.pokemon,
        recommendedItem
      });
    });
    
    // Esperar a que todas las promesas se resuelvan
    await Promise.all(promises);
  }

  // Buscar el item recomendado para un Pokémon específico (usado en el template)
  getRecommendedItemForPokemon(pokemonId: number): ItemDetail | null {
    const entry = this.pokemonWithItems.find(p => p.pokemon.id === pokemonId);
    return entry ? entry.recommendedItem : null;
  }

  async fetchRecommendedItems(pokemon: PokemonDetail): Promise<ItemDetail[]> {
    // Verificar si ya tenemos los items en el caché
    if (this.recommendedItemsCache.has(pokemon.id)) {
      return this.recommendedItemsCache.get(pokemon.id)!;
    }
    
    try {
      // Obtener los items recomendados de la API
      const items = await this.pokemonService.getRecommendedItemsForPokemon(pokemon);
      
      // Guardar en caché
      this.recommendedItemsCache.set(pokemon.id, items);
      return items;
    } catch (error) {
      console.error('Error al obtener items recomendados:', error);
      return [];
    }
  }

  updateEmptySlots() {
    if (!this.team) return;
    
    // Calcular cuántos slots vacíos mostrar (máximo 6 Pokémon por equipo)
    const emptySlotCount = Math.max(0, 6 - this.team.pokemons.length);
    this.emptySlots = Array(emptySlotCount).fill(0).map((_, i) => i);
  }

  async updateTeamAnalysis() {
    if (!this.team || this.team.pokemons.length === 0) {
      this.analysis = null;
      return;
    }
    
    // Obtener análisis del equipo
    try {
      this.analysis = await this.teamsService.analyzeTeam(this.team.id);
    } catch (error) {
      console.error('Error al analizar equipo:', error);
      this.analysis = null;
    }
  }

  async updateGameMode() {
    if (!this.team) return;
    
    try {
      // Aplicar la clase para la animación
      const modeLabel = document.querySelector('.game-mode-badge');
      if (modeLabel) {
        (modeLabel as HTMLElement).classList.add('game-mode-changing');
        // Eliminar la clase después de la animación
        setTimeout(() => {
          (modeLabel as HTMLElement).classList.remove('game-mode-changing');
        }, 400);
      }
      
      // Actualizar el modo de juego en el equipo
      await this.teamsService.updateTeamGameMode(this.team.id, this.gameMode);
      // Actualizar el análisis para reflejar el nuevo modo
      await this.updateTeamAnalysis();
      
      const toast = await this.toastCtrl.create({
        message: `Modo de juego cambiado a ${this.gameMode === 'pve' ? 'PvE (Historia)' : 'PvP (Competitivo)'}`,
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      
      await toast.present();
    } catch (error) {
      console.error('Error al actualizar modo de juego:', error);
      
      const toast = await this.toastCtrl.create({
        message: 'Error al cambiar el modo de juego',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      
      await toast.present();
    }
  }

  // Método para ordenar entradas de tipos para la visualización
  typeSortedEntries(typeCount: { [type: string]: number }): [string, number][] {
    return Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
  }

  // Método para ordenar roles para la visualización
  roleSortedEntries(roles: { [role: string]: number }): [string, number][] {
    return Object.entries(roles)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }

  goToTeams() {
    this.router.navigate(['/teams']);
  }

  goToHomePage() {
    this.router.navigate(['/home']);
  }

  editTeamName() {
    if (!this.team) return;
    this.editingName = this.team.name;
    this.isEditing = true;
  }

  async saveTeamName() {
    if (!this.team || !this.editingName.trim()) return;
    
    try {
      this.team.name = this.editingName.trim();
      await this.teamsService.updateTeam(this.team);
      this.isEditing = false;
      
      const toast = await this.toastCtrl.create({
        message: 'Nombre del equipo actualizado',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      
      await toast.present();
    } catch (error) {
      console.error('Error al actualizar nombre:', error);
      
      const toast = await this.toastCtrl.create({
        message: 'Error al actualizar el nombre',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      
      await toast.present();
    }
  }

  cancelEditTeamName() {
    this.isEditing = false;
  }

  async openPokemonSelector() {
    if (!this.team) return;
    
    if (this.team.pokemons.length >= 6) {
      const toast = await this.toastCtrl.create({
        message: 'El equipo ya tiene 6 Pokémon',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      
      await toast.present();
      return;
    }
    
    const modal = await this.modalCtrl.create({
      component: PokemonSelectorModalComponent,
      componentProps: {
        selectedPokemons: this.team.pokemons.map(p => p.pokemon) // Pasar solo los Pokémon base para la validación
      }
    });
    
    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    if (data) {
      await this.addPokemonToTeam(data);
    }
  }

  async addPokemonToTeam(pokemonInfo: SelectedPokemonInfo | PokemonDetail) {
    if (!this.team) return;
    
    try {
      await this.teamsService.addPokemonToTeam(this.team.id, pokemonInfo);
      // Actualizar el equipo después de añadir el Pokémon
      this.team = await this.teamsService.getTeam(this.team.id);
      
      // Determinar el Pokémon recién añadido para la animación
      if (this.team && this.team.pokemons.length > 0) {
        const lastPokemon = this.team.pokemons[this.team.pokemons.length - 1];
        this.recentlyAddedPokemon = lastPokemon.pokemon;
        setTimeout(() => {
          this.recentlyAddedPokemon = null;
        }, 1000);
      }
      
      // Actualizar slots vacíos y análisis
      this.updateEmptySlots();
      this.updateTeamAnalysis();
      
      // Cargar los items recomendados para el nuevo equipo
      await this.loadAllRecommendedItems();
      
      // Mensaje personalizado según la forma del Pokémon
      let message = '';
      if ('pokemon' in pokemonInfo) {
        // Es un SelectedPokemonInfo
        const pokemon = pokemonInfo.pokemon;
        message = `${pokemon.name} añadido al equipo`;
        
        if (pokemonInfo.form === 'mega') {
          message += ' (Mega Evolución)';
        } else if (pokemonInfo.form === 'gigantamax') {
          message += ' (Gigantamax)';
        }
        
        if (pokemonInfo.role) {
          message += ` como ${pokemonInfo.role}`;
        }
      } else {
        // Es un PokemonDetail simple
        message = `${pokemonInfo.name} añadido al equipo`;
      }
      
      const toast = await this.toastCtrl.create({
        message,
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      
      await toast.present();
    } catch (error) {
      console.error('Error al añadir Pokémon:', error);
      
      const toast = await this.toastCtrl.create({
        message: 'Error al añadir Pokémon',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      
      await toast.present();
    }
  }

  async confirmRemovePokemon(pokemon: PokemonDetail) {
    if (!this.team) return;
    
    const modal = await this.modalCtrl.create({
      component: ConfirmActionModalComponent,
      componentProps: {
        title: 'Eliminar Pokémon',
        message: `¿Estás seguro de que quieres eliminar a ${pokemon.name} del equipo?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        data: pokemon
      }
    });
    
    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    if (data && data.confirmed) {
      await this.removePokemonFromTeam(data.data);
    }
  }

  async removePokemonFromTeam(pokemon: PokemonDetail) {
    if (!this.team) return;
    
    try {
      // Buscar el elemento en el DOM para aplicar la clase de animación
      const pokemonCards = document.querySelectorAll('.pokemon-card');
      let cardToRemove: HTMLElement | null = null;
      
      // Encontrar la tarjeta correspondiente al Pokémon que se va a eliminar
      pokemonCards.forEach(card => {
        if (card.querySelector('.pokemon-name')?.textContent?.includes(pokemon.name)) {
          cardToRemove = card as HTMLElement;
        }
      });
      
      // Aplicar la clase para la animación
      if (cardToRemove) {
        (cardToRemove as HTMLElement).classList.add('removing');
        // Esperar a que termine la animación antes de eliminar
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      await this.teamsService.removePokemonFromTeam(this.team.id, pokemon.id);
      // Actualizar el equipo después de eliminar el Pokémon
      this.team = await this.teamsService.getTeam(this.team.id);
      
      // Eliminar del caché
      this.recommendedItemsCache.delete(pokemon.id);
      
      // Eliminar del array de pokémon con items
      this.pokemonWithItems = this.pokemonWithItems.filter(p => p.pokemon.id !== pokemon.id);
      
      // Actualizar slots vacíos y análisis
      this.updateEmptySlots();
      this.updateTeamAnalysis();
      
      const toast = await this.toastCtrl.create({
        message: `${pokemon.name} eliminado del equipo`,
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      
      await toast.present();
    } catch (error) {
      console.error('Error al eliminar Pokémon:', error);
      
      const toast = await this.toastCtrl.create({
        message: 'Error al eliminar Pokémon',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      
      await toast.present();
    }
  }

  async confirmDeleteTeam() {
    if (!this.team) return;
    
    const alert = await this.alertCtrl.create({
      header: 'Eliminar equipo',
      message: `¿Estás seguro de que quieres eliminar el equipo ${this.team.name}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: () => {
            this.deleteTeam();
          }
        }
      ]
    });
    
    await alert.present();
  }

  async deleteTeam() {
    if (!this.team) return;
    
    try {
      await this.teamsService.deleteTeam(this.team.id);
      
      const toast = await this.toastCtrl.create({
        message: 'Equipo eliminado',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      
      await toast.present();
      this.goToTeams();
    } catch (error) {
      console.error('Error al eliminar equipo:', error);
      
      const toast = await this.toastCtrl.create({
        message: 'Error al eliminar equipo',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      
      await toast.present();
    }
  }

  // Obtener la URL de la imagen del Pokémon según su forma
  getPokemonImageUrl(teamPokemon: TeamPokemon): string {
    const pokemon = teamPokemon.pokemon;
    
    // Si es mega evolución y tiene variante
    if (teamPokemon.form === 'mega' && teamPokemon.megaVariant) {
      return teamPokemon.megaVariant.sprite || this.getDefaultPokemonImage(pokemon);
    }
    
    // Si es gigantamax, usar el helper del service
    if (teamPokemon.form === 'gigantamax') {
      const gigantamaxSprite = this.pokemonService.getGigantamaxSprite(pokemon);
      if (gigantamaxSprite) {
        return gigantamaxSprite;
      }
      
      // Fallback a la imagen por defecto
      return this.getDefaultPokemonImage(pokemon);
    }
    
    return this.getDefaultPokemonImage(pokemon);
  }
  
  // Imagen por defecto del Pokémon
  private getDefaultPokemonImage(pokemon: PokemonDetail): string {
    return pokemon.sprites.other?.['official-artwork']?.front_default || 
           pokemon.sprites.front_default || 
           `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
  }
  
  // Obtener el nombre del Pokémon formateado con su forma
  getPokemonDisplayName(teamPokemon: TeamPokemon): string {
    // Limpiar el nombre del Pokémon si contiene -gmax
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
  
  // Obtener los tipos del Pokémon según su forma
  getPokemonTypes(teamPokemon: TeamPokemon): any[] {
    // Si es mega evolución y tiene tipos específicos, usarlos
    if (teamPokemon.form === 'mega' && teamPokemon.megaVariant?.types) {
      return teamPokemon.megaVariant.types;
    }
    
    // En caso contrario, usar los tipos del Pokémon base
    return teamPokemon.pokemon.types;
  }
  
  // Obtener un valor de stat específico del Pokémon
  getPokemonStat(teamPokemon: TeamPokemon, statName: string): number {
    // Si tiene stats ajustados, usarlos
    if (teamPokemon.adjustedStats && statName in teamPokemon.adjustedStats) {
      return teamPokemon.adjustedStats[statName as keyof typeof teamPokemon.adjustedStats];
    }
    
    // En caso contrario, buscar en los stats base
    return teamPokemon.pokemon.stats.find(s => s.stat.name === statName)?.base_stat || 0;
  }

  getTypeColor(type: string): string {
    return this.pokemonService.getTypeColor(type);
  }
  
  getItemName(item: ItemDetail): string {
    // Usar el método del servicio para obtener el nombre del item
    return this.pokemonService.getItemName(item);
  }

  // Determina si hay candidatos adecuados para Dynamax en el equipo
  hasDynamaxCandidate(): boolean {
    if (!this.team) return false;
    
    return this.team.pokemons.some(pokemon => {
      const hp = pokemon.adjustedStats?.hp || 0;
      const attack = pokemon.adjustedStats?.attack || 0;
      const spAttack = pokemon.adjustedStats?.['special-attack'] || 0;
      
      // Pokémon con buen HP y al menos un buen stat ofensivo
      return hp >= 80 && (attack >= 90 || spAttack >= 90);
    });
  }
  
  // Verifica si hay Pokémon con habilidades relacionadas con el clima
  hasWeatherAbility(): boolean {
    if (!this.team) return false;
    
    const weatherAbilities = [
      'drought', 'drizzle', 'sand-stream', 'snow-warning',  // Clima básico
      'desolate-land', 'primordial-sea', 'delta-stream'     // Clima de legendarios
    ];
    
    return this.team.pokemons.some(teamPokemon => 
      teamPokemon.pokemon.abilities.some(ability => 
        weatherAbilities.includes(ability.ability.name.toLowerCase())
      )
    );
  }
  
  // Verifica si hay usuarios de Intimidate en el equipo
  hasIntimidateUser(): boolean {
    if (!this.team) return false;
    
    return this.team.pokemons.some(teamPokemon => 
      teamPokemon.pokemon.abilities.some(ability => 
        ability.ability.name.toLowerCase() === 'intimidate'
      )
    );
  }
  
  // Verifica si hay soporte de Tailwind en el equipo
  hasTailwindSupport(): boolean {
    if (!this.team) return false;
    
    // Pokémon comunes que pueden aprender Tailwind
    const tailwindUsers = [
      'whimsicott', 'tornadus', 'murkrow', 'corviknight', 'talonflame', 
      'crobat', 'togekiss', 'suicune', 'zapdos'
    ];
    
    return this.team.pokemons.some(teamPokemon => 
      tailwindUsers.includes(teamPokemon.pokemon.name.toLowerCase())
    );
  }
  
  // Verifica si hay soporte de redirección en el equipo
  hasRedirectionSupport(): boolean {
    if (!this.team) return false;
    
    // Pokémon comunes con Follow Me o Rage Powder
    const redirectionUsers = [
      'amoonguss', 'togekiss', 'indeedee', 'clefairy', 'hitmontop',
      'volcarona', 'butterfree', 'oranguru', 'gothitelle'
    ];
    
    return this.team.pokemons.some(teamPokemon => 
      redirectionUsers.includes(teamPokemon.pokemon.name.toLowerCase())
    );
  }
  
  // Verifica si está presente la combinación Chi-Yu + Flutter Mane
  hasChiYuFlutterCombo(): boolean {
    if (!this.team) return false;
    
    const hasChiYu = this.team.pokemons.some(teamPokemon => 
      teamPokemon.pokemon.name.toLowerCase() === 'chi-yu'
    );
    
    const hasFlutterMane = this.team.pokemons.some(teamPokemon => 
      teamPokemon.pokemon.name.toLowerCase() === 'flutter mane'
    );
    
    return hasChiYu && hasFlutterMane;
  }
  
  // Verifica si está presente la combinación Dondozo + Tatsugiri
  hasDondozoTatsugiriCombo(): boolean {
    if (!this.team) return false;
    
    const hasDondozo = this.team.pokemons.some(teamPokemon => 
      teamPokemon.pokemon.name.toLowerCase() === 'dondozo'
    );
    
    const hasTatsugiri = this.team.pokemons.some(teamPokemon => 
      teamPokemon.pokemon.name.toLowerCase() === 'tatsugiri'
    );
    
    return hasDondozo && hasTatsugiri;
  }
  
  // Verifica si hay Pokémon con Weakness Policy
  hasWeaknessPolicy(): boolean {
    if (!this.team || !this.pokemonWithItems.length) return false;
    
    return this.pokemonWithItems.some(pokItem => 
      pokItem.recommendedItem?.name?.toLowerCase().includes('weakness policy')
    );
  }

  async openItemSelectorModal(pokemon: PokemonDetail) {
    const modal = await this.modalCtrl.create({
      component: ItemSelectorModalComponent,
      componentProps: {
        pokemon: pokemon,
        currentItem: pokemon.item || null
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    
    if (data !== undefined) {
      // Si data es null, quitar el objeto
      // Si data es un objeto ItemDetail, asignar el objeto
      this.assignItemToPokemon(pokemon, data);
    }
  }

  assignItemToPokemon(pokemon: PokemonDetail, item: ItemDetail | null) {
    // Actualizar el objeto del Pokémon
    pokemon.item = item;
    
    // Actualizar estadísticas considerando el objeto
    this.updatePokemonStats(pokemon);
    
    // Guardar el equipo actualizado
    this.saveTeam();
  }

  updatePokemonStats(pokemon: PokemonDetail) {
    // Lógica para actualizar stats basados en el objeto
    if (!pokemon.item) return;
    
    const itemName = this.pokemonService.getItemName(pokemon.item).toLowerCase();
    
    // Aplicar efectos de objetos comunes
    if (itemName.includes('choice band')) {
      // Aumentar ataque físico en 50%
      const attackStat = pokemon.stats.find(s => s.stat.name === 'attack');
      if (attackStat) {
        pokemon.adjustedStats = pokemon.adjustedStats || {};
        pokemon.adjustedStats['attack'] = Math.floor(attackStat.base_stat * 1.5);
      }
    } else if (itemName.includes('choice specs')) {
      // Aumentar ataque especial en 50%
      const spAttackStat = pokemon.stats.find(s => s.stat.name === 'special-attack');
      if (spAttackStat) {
        pokemon.adjustedStats = pokemon.adjustedStats || {};
        pokemon.adjustedStats['special-attack'] = Math.floor(spAttackStat.base_stat * 1.5);
      }
    } else if (itemName.includes('choice scarf')) {
      // Aumentar velocidad en 50%
      const speedStat = pokemon.stats.find(s => s.stat.name === 'speed');
      if (speedStat) {
        pokemon.adjustedStats = pokemon.adjustedStats || {};
        pokemon.adjustedStats['speed'] = Math.floor(speedStat.base_stat * 1.5);
      }
    } else if (itemName.includes('assault vest')) {
      // Aumentar defensa especial en 50%
      const spDefStat = pokemon.stats.find(s => s.stat.name === 'special-defense');
      if (spDefStat) {
        pokemon.adjustedStats = pokemon.adjustedStats || {};
        pokemon.adjustedStats['special-defense'] = Math.floor(spDefStat.base_stat * 1.5);
      }
    } else if (itemName.includes('eviolite')) {
      // Aumentar defensas en 50% si no está totalmente evolucionado
      if (pokemon.is_baby || (!pokemon.evolves_to && pokemon.evolved_from)) {
        const defStat = pokemon.stats.find(s => s.stat.name === 'defense');
        const spDefStat = pokemon.stats.find(s => s.stat.name === 'special-defense');
        
        pokemon.adjustedStats = pokemon.adjustedStats || {};
        
        if (defStat) {
          pokemon.adjustedStats['defense'] = Math.floor(defStat.base_stat * 1.5);
        }
        
        if (spDefStat) {
          pokemon.adjustedStats['special-defense'] = Math.floor(spDefStat.base_stat * 1.5);
        }
      }
    }
    
    // Actualizar el análisis del equipo
    this.updateTeamAnalysis();
  }

  saveTeam() {
    if (this.team) {
      // Asumimos que updateTeam devuelve una Promesa basado en el patrón observado
      try {
        this.teamsService.updateTeam(this.team)
          .then(() => {
            console.log('Equipo guardado con éxito');
          })
          .catch((error: unknown) => {
            console.error('Error al guardar el equipo:', error);
          });
      } catch (e) {
        console.error('Error al guardar el equipo:', e);
      }
    }
  }
} 