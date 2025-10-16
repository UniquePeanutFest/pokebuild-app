import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { IonicModule, ModalController, IonInfiniteScroll, ActionSheetController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PokemonService, PokemonDetail, PokemonTypeFilter, PokemonGeneration, PokemonVariant } from '../../Services/pokemon.service';
import { firstValueFrom } from 'rxjs';
import { modalEnterAnimation, modalLeaveAnimation } from '../../shared/animations/modal-animations';

// Interfaz para Pokémon seleccionado con información adicional
export interface SelectedPokemonInfo {
  pokemon: PokemonDetail;
  form?: 'normal' | 'mega' | 'gigantamax';
  megaVariant?: PokemonVariant;
  role?: string;
}

@Component({
  selector: 'app-pokemon-selector-modal',
  templateUrl: './pokemon-selector-modal.component.html',
  styleUrls: ['./pokemon-selector-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class PokemonSelectorModalComponent implements OnInit {
  @Input() selectedPokemons: PokemonDetail[] = [];
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  
  searchTerm: string = '';
  pokemonList: PokemonDetail[] = [];
  isLoading: boolean = false;
  error: string = '';
  pokemonTypes: PokemonTypeFilter[] = [];
  pokemonGenerations: PokemonGeneration[] = [];
  selectedGeneration: PokemonGeneration | null = null;
  activeFilterTab: string = 'type';
  
  // Definición de roles para Pokémon
  pokemonRoles: {id: string, name: string, description: string}[] = [
    { id: 'physical-attacker', name: 'Atacante Físico', description: 'Alto daño físico' },
    { id: 'special-attacker', name: 'Atacante Especial', description: 'Alto daño especial' },
    { id: 'physical-tank', name: 'Tanque Físico', description: 'Alta defensa física' },
    { id: 'special-tank', name: 'Tanque Especial', description: 'Alta defensa especial' },
    { id: 'setup', name: 'Setup', description: 'Se fortalece para barrer' },
    { id: 'support', name: 'Soporte', description: 'Ayuda al equipo' },
    { id: 'speed', name: 'Velocista', description: 'Alta velocidad' },
    { id: 'revenge', name: 'Revenge Killer', description: 'Remata oponentes debilitados' }
  ];
  
  // Paginación
  currentOffset: number = 0;
  pageSize: number = 50; // Cargar 50 Pokémon a la vez
  totalCount: number = 0;
  hasMoreData: boolean = true;
  
  constructor(
    private modalCtrl: ModalController,
    private pokemonService: PokemonService,
    private actionSheetCtrl: ActionSheetController,
    private toastCtrl: ToastController
  ) {
    this.pokemonTypes = this.pokemonService.pokemonTypes;
    this.pokemonGenerations = this.pokemonService.pokemonGenerations;
    
    // Lista de roles de Pokémon predefinidos
    this.pokemonRoles = [
      { id: 'attacker', name: 'Atacante', description: 'Pokemon con alto poder ofensivo' },
      { id: 'tank', name: 'Tanque', description: 'Pokemon con alta resistencia y HP' },
      { id: 'support', name: 'Apoyo', description: 'Pokemon que ayuda al equipo con estados y buffs' },
      { id: 'sweeper', name: 'Barredor', description: 'Pokemon rápido y ofensivo' },
      { id: 'wall', name: 'Muro', description: 'Pokemon con altas defensas' },
      { id: 'special-attacker', name: 'Atacante Especial', description: 'Pokemon con alto ataque especial' },
      { id: 'physical-attacker', name: 'Atacante Físico', description: 'Pokemon con alto ataque físico' }
    ];
  }

  ngOnInit() {
    this.loadInitialPokemons();
  }
  
  async loadInitialPokemons() {
    this.isLoading = true;
    this.pokemonList = [];
    this.currentOffset = 0;
    
    try {
      const response = await firstValueFrom(this.pokemonService.getPokemons(0, this.pageSize));
      this.totalCount = response.count;
      const promises = response.results.map(pokemon => 
        firstValueFrom(this.pokemonService.getPokemonByNameOrId(pokemon.name))
      );
      this.pokemonList = await Promise.all(promises);
      this.currentOffset = this.pokemonList.length;
      this.hasMoreData = this.currentOffset < this.totalCount;
    } catch (error) {
      console.error('Error loading Pokémon:', error);
      this.error = 'Error al cargar Pokémon';
    } finally {
      this.isLoading = false;
    }
  }
  
  async loadMorePokemons(event?: any) {
    if (!this.hasMoreData || this.isLoading) {
      if (event) event.target.complete();
      return;
    }
    
    // Si hay filtros activos, no cargar más Pokémon con paginación
    if (this.hasActiveFilters()) {
      if (event) event.target.complete();
      return;
    }
    
    try {
      const response = await firstValueFrom(this.pokemonService.getPokemons(this.currentOffset, this.pageSize));
      const promises = response.results.map(pokemon => 
        firstValueFrom(this.pokemonService.getPokemonByNameOrId(pokemon.name))
      );
      const newPokemons = await Promise.all(promises);
      
      this.pokemonList = [...this.pokemonList, ...newPokemons];
      this.currentOffset = this.pokemonList.length;
      this.hasMoreData = this.currentOffset < this.totalCount;
      
      if (!this.hasMoreData && this.infiniteScroll) {
        this.infiniteScroll.disabled = true;
      }
    } catch (error) {
      console.error('Error loading more Pokémon:', error);
    } finally {
      if (event) event.target.complete();
    }
  }
  
  async searchPokemon() {
    if (!this.searchTerm.trim()) {
      await this.loadInitialPokemons();
      return;
    }
    
    this.isLoading = true;
    
    try {
      const pokemonResult = await this.pokemonService.searchPokemonByNameOrNumber(this.searchTerm);
      if (pokemonResult.length > 0) {
        // Obtener detalles completos de los Pokémon encontrados
        const detailPromises = pokemonResult.map(p => 
          firstValueFrom(this.pokemonService.getPokemonByNameOrId(p.name))
        );
        this.pokemonList = await Promise.all(detailPromises);
      } else {
        this.pokemonList = [];
        this.error = 'No se encontraron Pokémon con ese nombre o número';
      }
    } catch (error) {
      console.error('Error al buscar Pokémon:', error);
      this.error = 'Error al buscar Pokémon';
      this.pokemonList = [];
    } finally {
      this.isLoading = false;
    }
  }
  
  async applyFilters() {
    this.isLoading = true;
    this.error = '';
    
    try {
      const selectedTypes = this.pokemonTypes
        .filter(type => type.selected)
        .map(type => type.name);
      
      const generationId = this.selectedGeneration ? this.selectedGeneration.id : undefined;
      
      // Usar el método que combina filtros
      this.pokemonList = await this.pokemonService.getPokemonsByTypesAndGeneration(selectedTypes, generationId);
      
      if (this.pokemonList.length === 0) {
        this.error = 'No se encontraron Pokémon con los filtros seleccionados';
      }
    } catch (error) {
      console.error('Error al aplicar filtros:', error);
      this.error = 'Error al filtrar Pokémon';
      this.pokemonList = [];
    } finally {
      this.isLoading = false;
    }
  }
  
  hasActiveFilters(): boolean {
    return this.hasTypeFilters() || Boolean(this.selectedGeneration) || this.searchTerm.trim().length > 0;
  }
  
  hasTypeFilters(): boolean {
    return this.pokemonTypes.some(type => type.selected);
  }
  
  getActiveFilters(): PokemonTypeFilter[] {
    return this.pokemonTypes.filter(type => type.selected);
  }
  
  toggleType(type: PokemonTypeFilter) {
    type.selected = !type.selected;
    this.applyFilters();
  }
  
  clearTypeFilters() {
    this.pokemonTypes.forEach(type => type.selected = false);
    this.applyFilters();
  }
  
  selectGeneration(generation: PokemonGeneration) {
    if (this.selectedGeneration && this.selectedGeneration.id === generation.id) {
      this.selectedGeneration = null;
    } else {
      this.selectedGeneration = generation;
    }
    this.applyFilters();
  }
  
  clearGenerationFilter() {
    this.selectedGeneration = null;
    this.applyFilters();
  }
  
  clearAllFilters() {
    this.pokemonTypes.forEach(type => type.selected = false);
    this.selectedGeneration = null;
    this.searchTerm = '';
    this.loadInitialPokemons();
  }
  
  onFilterTabChange() {
    // No hay acción específica necesaria al cambiar tabs
  }
  
  // Verifica si el Pokémon ya está en el equipo
  isPokemonSelected(pokemon: PokemonDetail): boolean {
    return this.selectedPokemons.some(p => p.id === pokemon.id);
  }
  
  // Verifica si el Pokémon tiene Mega evolución
  hasMegaEvolution(pokemon: PokemonDetail): boolean {
    // Esta es una comprobación simplificada, idealmente consultaríamos la API
    // Lista de IDs de Pokémon con mega evoluciones
    const megaEvolutionIds = [3, 6, 9, 65, 94, 115, 127, 130, 142, 150, 181, 212, 214, 229, 248, 257, 282, 303, 306, 308, 310, 354, 359, 380, 381, 445, 448, 460];
    return megaEvolutionIds.includes(pokemon.id);
  }
  
  // Verifica si el Pokémon tiene forma Gigantamax
  hasGigantamax(pokemon: PokemonDetail): boolean {
    // Esta es una comprobación simplificada, idealmente consultaríamos la API
    // Lista de IDs de Pokémon con formas Gigantamax
    const gigantamaxIds = [3, 6, 9, 12, 25, 52, 68, 94, 99, 131, 143, 569, 809, 812, 815, 818, 823, 826, 834, 839, 841, 844, 849, 851, 858, 861, 869, 879, 884, 892];
    return gigantamaxIds.includes(pokemon.id);
  }
  
  // Verifica si el Pokémon tiene alguna forma especial
  hasMegaOrGigantamax(pokemon: PokemonDetail): boolean {
    return this.hasMegaEvolution(pokemon) || this.hasGigantamax(pokemon);
  }
  
  // Cuando se hace clic en un Pokémon, abre opciones si tiene formas especiales
  async openPokemonOptions(pokemon: PokemonDetail) {
    if (this.isPokemonSelected(pokemon)) {
      return; // No hacer nada si ya está seleccionado
    }
    
    if (!this.hasMegaOrGigantamax(pokemon)) {
      // Si no tiene formas especiales, ir directo a selección de rol
      await this.selectPokemonRole(pokemon);
      return;
    }
    
    // Si tiene formas especiales, mostrar opciones
    const buttons: any[] = [
      {
        text: 'Forma Normal',
        icon: 'body-outline',
        handler: () => {
          this.selectPokemonRole(pokemon);
        }
      }
    ];
    
    if (this.hasMegaEvolution(pokemon)) {
      buttons.push({
        text: 'Mega Evolución',
        icon: 'flash-outline',
        handler: async () => {
          try {
            const variants = await this.pokemonService.getPokemonVariants(pokemon.id);
            if (variants.mega.length > 0) {
              if (variants.mega.length === 1) {
                // Si solo hay una mega evolución, seleccionarla directamente
                const megaInfo = {
                  pokemon,
                  form: 'mega' as const,
                  megaVariant: variants.mega[0]
                };
                this.selectPokemonRole(pokemon, megaInfo);
              } else {
                // Si hay múltiples mega evoluciones, mostrar opciones
                await this.showMegaOptions(pokemon, variants.mega);
              }
            } else {
              // Si no se encuentran detalles de la mega, seleccionar como normal
              this.selectPokemonRole(pokemon);
            }
          } catch (error) {
            console.error('Error al obtener variantes:', error);
            this.selectPokemonRole(pokemon);
          }
        }
      });
    }
    
    if (this.hasGigantamax(pokemon)) {
      buttons.push({
        text: 'Gigantamax',
        icon: 'resize-outline',
        handler: async () => {
          try {
            const variants = await this.pokemonService.getPokemonVariants(pokemon.id);
            if (variants.gigamax) {
              // Create a new Pokemon object with the Gigantamax name if needed
              let gmaxPokemon = {...pokemon};
              
              // If the name doesn't already indicate Gigantamax form, we might 
              // want to use the gigamax variant's name which includes -gmax
              if (!gmaxPokemon.name.includes('-gmax') && variants.gigamax.name.includes('-gmax')) {
                gmaxPokemon.name = variants.gigamax.name;
              }
              
              // Save the actual gigamax sprite in a custom property for easier access
              (gmaxPokemon.sprites as any).gmax = variants.gigamax.sprite;
              
              const gigamaxInfo = {
                pokemon: gmaxPokemon,
                form: 'gigantamax' as const
              };
              this.selectPokemonRole(gmaxPokemon, gigamaxInfo);
            } else {
              // Si no se encuentran detalles del gigantamax, seleccionar como normal
              this.selectPokemonRole(pokemon);
            }
          } catch (error) {
            console.error('Error al obtener variante gigantamax:', error);
            this.selectPokemonRole(pokemon);
          }
        }
      });
    }
    
    buttons.push({
      text: 'Cancelar',
      icon: 'close-outline',
      role: 'cancel'
    });
    
    const actionSheet = await this.actionSheetCtrl.create({
      header: `Seleccionar forma de ${pokemon.name}`,
      buttons
    });
    
    await actionSheet.present();
  }
  
  // Mostrar opciones de mega evolución cuando hay múltiples
  async showMegaOptions(pokemon: PokemonDetail, megaVariants: PokemonVariant[]) {
    const buttons: any[] = megaVariants.map(variant => ({
      text: `Mega ${variant.name.includes('mega-x') ? 'X' : variant.name.includes('mega-y') ? 'Y' : ''}`,
      handler: () => {
        const megaInfo = {
          pokemon,
          form: 'mega' as const,
          megaVariant: variant
        };
        this.selectPokemonRole(pokemon, megaInfo);
      }
    }));
    
    buttons.push({
      text: 'Cancelar',
      role: 'cancel'
    });
    
    const actionSheet = await this.actionSheetCtrl.create({
      header: `Seleccionar Mega Evolución`,
      buttons
    });
    
    await actionSheet.present();
  }
  
  // Muestra opciones para seleccionar el rol del Pokémon
  async selectPokemonRole(pokemon: PokemonDetail, formInfo?: {form: 'normal' | 'mega' | 'gigantamax', megaVariant?: PokemonVariant}) {
    const buttons: any[] = this.pokemonRoles.map(role => ({
      text: role.name,
      handler: () => {
        const pokemonInfo: SelectedPokemonInfo = {
          pokemon,
          role: role.id,
          ...formInfo
        };
        this.confirmPokemonSelection(pokemonInfo);
      }
    }));
    
    buttons.push({
      text: 'Sin rol específico',
      handler: () => {
        const pokemonInfo: SelectedPokemonInfo = {
          pokemon,
          ...formInfo
        };
        this.confirmPokemonSelection(pokemonInfo);
      }
    });
    
    buttons.push({
      text: 'Cancelar',
      role: 'cancel'
    });
    
    const actionSheet = await this.actionSheetCtrl.create({
      header: `Seleccionar rol para ${pokemon.name}`,
      buttons
    });
    
    await actionSheet.present();
  }
  
  // Confirma la selección del Pokémon y cierra el modal
  async confirmPokemonSelection(pokemonInfo: SelectedPokemonInfo) {
    // Aquí podríamos modificar el Pokémon según la forma seleccionada
    // Por ahora, simplemente devolvemos el Pokémon con información adicional
    
    let message = `Añadido ${pokemonInfo.pokemon.name}`;
    
    if (pokemonInfo.form === 'mega') {
      message += ' (Mega Evolución)';
    } else if (pokemonInfo.form === 'gigantamax') {
      message += ' (Gigantamax)';
    }
    
    if (pokemonInfo.role) {
      const roleName = this.pokemonRoles.find(r => r.id === pokemonInfo.role)?.name;
      message += ` como ${roleName}`;
    }
    
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    
    await toast.present();
    
    // En lugar de devolver solo el Pokémon, devolvemos todo el objeto con la información completa
    this.dismiss(pokemonInfo);
  }
  
  // Cierra el modal sin seleccionar nada
  cancel() {
    this.dismiss();
  }
  
  // Cierra el modal con resultado
  dismiss(pokemonInfo?: SelectedPokemonInfo | null) {
    this.modalCtrl.dismiss(pokemonInfo);
  }
  
  // Obtener el color del tipo de Pokémon
  getTypeColor(type: string): string {
    return this.pokemonService.getTypeColor(type);
  }

  // Get the proper image for the Pokemon, including Gigantamax forms
  getPokemonImage(pokemon: PokemonDetail): string {
    // Check if it has Gigantamax form and display that sprite if appropriate
    if (this.hasGigantamax(pokemon)) {
      const gigantamaxSprite = this.pokemonService.getGigantamaxSprite(pokemon);
      if (gigantamaxSprite) {
        return gigantamaxSprite;
      }
    }
    
    // Default to official artwork or regular sprite
    return pokemon.sprites.other?.['official-artwork']?.front_default || 
           pokemon.sprites.front_default || 
           `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
  }

  // Get a clean Pokemon name without -gmax suffix
  cleanPokemonName(name: string): string {
    if (name.includes('-gmax')) {
      return name.split('-gmax')[0];
    }
    return name;
  }
} 