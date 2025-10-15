import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { PokemonService, PokemonBasic, PokemonTypeFilter, PokemonDetail, PokemonGeneration } from '../Services/pokemon.service';
import { LoadingController, AlertController, ToastController, IonContent, IonButton, IonIcon, 
  IonChip, IonSpinner, IonInfiniteScroll, IonInfiniteScrollContent, IonicModule } from '@ionic/angular';
import { firstValueFrom, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PokemonTeam, TeamsService } from '../Services/teams.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonicModule
  ]
})
export class HomePage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  pokemonList: any[] = [];
  pokemon: string = '';
  mensajeError: string = '';
  offset: number = 0;
  limit: number = 22; // Aumentado para simetría visual
  pokemonTypes: PokemonTypeFilter[] = [];
  pokemonGenerations: PokemonGeneration[] = [];
  selectedGenerations: PokemonGeneration[] = [];
  isLoading: boolean = false;
  isSearchbarExpanded: boolean = true;
  showTypeFilter: boolean = false;
  showGenerationFilter: boolean = false;
  hasReachedEnd: boolean = false;
  
  // Propiedades de paginación
  currentPage: number = 1;
  totalPages: number = 0;
  totalPokemon: number = 0;
  pageSize: number = 22;
  showPagination: boolean = true;
  // Equipos del usuario
  teams: PokemonTeam[] = [];
  isLoadingTeams: boolean = false;
  showTeams: boolean = true;
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  searchTimeout: any;

  // Lista de iconos disponibles confirmados
  availableIcons = [
    'bug', 'dark', 'dragon', 'electric', 'fairy', 
    'fighting', 'fire', 'flying', 'ghost', 'grass', 
    'ground', 'ice', 'normal', 'poison', 'psychic', 
    'rock', 'steel', 'water'
  ];

  get tiposSeleccionados(): PokemonTypeFilter[] {
    return this.pokemonTypes.filter(type => type.selected);
  }

  constructor(
    private pokemonService: PokemonService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private route: ActivatedRoute,
    private teamsService: TeamsService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    this.pokemonTypes = this.pokemonService.pokemonTypes;
    this.pokemonGenerations = this.pokemonService.pokemonGenerations;

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(700),
      distinctUntilChanged()
    ).subscribe(searchText => {
      this.pokemon = searchText;
      this.offset = 0;
      this.cargarPokemons();
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['refresh']) {
        this.offset = 0;
        this.cargarPokemons();
      }
    });

    this.cargarPokemons();
    
    // Cargar equipos del usuario
    this.loadTeams();
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  // Method to apply generation filters and close the dropdown
  applyGenerationFilters() {
    this.showGenerationFilter = false;
    
    // If no generations selected, clear filters
    if (this.selectedGenerations.length === 0) {
      this.clearGenerationFilter();
    }
  }

  async cargarPokemons() {
    try {
      this.isLoading = true;
      
      // Reset pagination when starting a new search
      if (this.offset === 0) {
        this.currentPage = 1;
        this.hasReachedEnd = false;
        this.pokemonList = [];
      }
      
      // Scroll to top when starting a new search/filter
      if (this.offset === 0 && !this.selectedGenerations.length && !this.tiposSeleccionados.length) {
        this.content?.scrollToTop(500);
      }
      
      // Get selected types
      const selectedTypes = this.pokemonTypes
        .filter(type => type.selected)
        .map(type => type.name);
        
      // Get selected generations
      const generationIds = this.selectedGenerations.map(generation => generation.id);
      
      if (selectedTypes.length > 0 || generationIds.length > 0) {
        // Show loading message to the user
        const loading = await this.loadingCtrl.create({
          message: 'Cargando Pokémon...',
          spinner: 'circular'
        });
        await loading.present();
        
        // Apply combined filters if any are active
        console.log('Applying filters:', { types: selectedTypes, generations: generationIds });
        const filteredPokemon = await this.pokemonService.getPokemonsByTypesAndGenerations(selectedTypes, generationIds);
        
        // Convert filtered results to match the expected format
        this.pokemonList = filteredPokemon.map(pokemon => ({
          name: pokemon.name,
          url: `https://pokeapi.co/api/v2/pokemon/${pokemon.id}/`
        }));
        
        await loading.dismiss();
      } else if (this.pokemon && this.pokemon.trim()) {
        // If we have a search term, do a search
        const searchResults = await this.pokemonService.searchPokemonByNameOrNumber(this.pokemon);
        
        // Get full details for each search result
        const detailedResults = await Promise.all(
          searchResults.slice(0, 20).map(result => 
            firstValueFrom(this.pokemonService.getPokemonByNameOrId(result.name))
          )
        );
        
        // Convert search results to match the expected format
        this.pokemonList = detailedResults.map(pokemon => ({
          name: pokemon.name,
          url: `https://pokeapi.co/api/v2/pokemon/${pokemon.id}/`
        }));
      } else {
        // Standard pagination with no filters
        const response = await firstValueFrom(this.pokemonService.getPokemons(this.offset, this.limit));
        
        // Update pagination info
        this.totalPokemon = response.count;
        this.totalPages = Math.ceil(this.totalPokemon / this.pageSize);
        
        // Always replace the list for pagination (no infinite scroll)
        this.pokemonList = response.results;
      }
    } catch (error) {
      console.error('Error cargando pokémon', error);
      this.mensajeError = 'Error al cargar los Pokémon';
    } finally {
      this.isLoading = false;
    }
  }

  loadMore(event: any) {
    if (!this.isLoading) {
      this.offset += this.limit;
      this.cargarPokemons().then(() => {
        event.target.complete();
      });
    } else {
      event.target.complete();
    }
  }

  onSearchChange(event: any) {
    this.searchSubject.next(event.target.value);
  }

  async toggleType(type: PokemonTypeFilter) {
    type.selected = !type.selected;
    this.offset = 0;
    this.cargarPokemons();
  }

  toggleTypeFilter() {
    this.showTypeFilter = !this.showTypeFilter;
    this.showGenerationFilter = false;
  }

  toggleGenerationFilter() {
    this.showGenerationFilter = !this.showGenerationFilter;
    this.showTypeFilter = false;
  }

  selectGeneration(generation: PokemonGeneration) {
    // Find if this generation is already selected
    const existingIndex = this.selectedGenerations.findIndex(g => g.id === generation.id);
    
    if (existingIndex >= 0) {
      // If already selected, remove it
      this.selectedGenerations.splice(existingIndex, 1);
    } else {
      // If not selected, add it
      this.selectedGenerations.push(generation);
    }
    
    // Don't close the filter dropdown - let user select multiple generations
    // this.showGenerationFilter = false;
    
    // Reset offset and force reload with new generation filter
    this.offset = 0;
    this.cargarPokemons();
  }

  clearFilters() {
    this.pokemonTypes.forEach(type => type.selected = false);
    this.selectedGenerations = [];
    this.pokemon = '';
    this.offset = 0;
    this.cargarPokemons();
  }

  getImgGif(url: string): string {
    const id = this.getPokemonId(url);
    return this.getPokemonGifById(parseInt(id));
  }

  getPokemonGifById(id: number): string {
    // Check if this is a mega or gigamax form based on ID
    const isMega = id > 10000; // Mega evolution IDs are typically over 10000
    const isGigamax = id > 10000 && (id % 1000 === 0); // Example gigamax ID pattern
    
    if (isMega || isGigamax) {
      // For special forms, we may need to use the regular sprite as animated GIFs 
      // might not be available for all forms
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
    }
    
    // Use the animated GIF sprite from Generation V (Black/White) for regular forms
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
  }

  getPokemonId(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 2];
  }

  verDetalles(nombre: string) {
    this.router.navigate(['/pokemon', nombre]);
  }

  goToTeams() {
    this.router.navigate(['/teams']);
  }

  // Teams methods
  async loadTeams() {
    this.isLoadingTeams = true;
    try {
      this.teams = await this.teamsService.getTeams();
      this.isLoadingTeams = false;
    } catch (error: any) {
      console.error('Error loading teams:', error);
      this.isLoadingTeams = false;
    }
  }
  
  toggleTeamsSection() {
    this.showTeams = !this.showTeams;
  }
  
  viewTeamDetails(teamId: string) {
    this.router.navigate(['/teams', teamId]);
  }
  
  navigateToCreateTeam() {
    this.router.navigate(['/teams/create']);
  }
  
  getTeamPokemonCount(team: PokemonTeam): number {
    if (!team || !team.pokemons) {
      return 0;
    }
    return team.pokemons.length;
  }
  
  getFirstPokemonImage(team: PokemonTeam): string {
    if (team.isCorrupt || !team.pokemons || team.pokemons.length === 0) {
      return 'assets/img/unknown-pokemon.png';
    }
    
    const firstPokemon = team.pokemons[0];
    if (!firstPokemon || !firstPokemon.pokemon || !firstPokemon.pokemon.sprites) {
      return 'assets/img/unknown-pokemon.png';
    }
    
    return firstPokemon.pokemon.sprites.other?.['official-artwork']?.front_default || 
           firstPokemon.pokemon.sprites.front_default || 
           'assets/img/unknown-pokemon.png';
  }
  
  async deleteCorruptTeam(event: Event, team: PokemonTeam) {
    event.stopPropagation(); // Prevent navigating to team details
    
    const alert = await this.alertCtrl.create({
      header: 'Delete Team',
      message: `Are you sure you want to delete the corrupt team "${team.name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.teamsService.deleteCorruptTeam(team.id);
              await this.loadTeams(); // Reload teams after deletion
            } catch (error: any) {
              console.error('Error deleting team:', error);
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  expandSearchbar() {
    this.isSearchbarExpanded = true;
  }

  collapseSearchbar() {
    if (!this.pokemon.trim()) {
      this.isSearchbarExpanded = false;
    }
  }

  // Métodos para compatibilidad con el template
  limpiarFiltros() {
    this.clearFilters();
  }

  async cargarMasPokemon(event: any) {
    try {
      // Don't load more if already loading
      if (this.isLoading) {
        event.target.complete();
        return;
      }
      
      // For filtered content, we already load all results at once
      if (this.selectedGenerations.length > 0 || this.tiposSeleccionados.length > 0 || (this.pokemon && this.pokemon.trim())) {
        this.hasReachedEnd = true;
        event.target.disabled = true;
        const toast = await this.toastCtrl.create({
          message: 'Mostrando todos los resultados',
          duration: 2000
        });
        await toast.present();
        return;
      }

      // Remember current scroll position
      const scrollElement = await this.content.getScrollElement();
      const scrollPosition = scrollElement.scrollTop;

      // Load more Pokémon with increased offset
      this.offset += this.limit;
      
      // Set loading to true to show loading indicator
      this.isLoading = true;
      
      try {
        const response = await firstValueFrom(this.pokemonService.getPokemons(this.offset, this.limit));
        
        // Check if we've reached the end of the list (no more results)
        if (response.results.length === 0) {
          this.hasReachedEnd = true;
          event.target.disabled = true;
          
          const toast = await this.toastCtrl.create({
            message: '¡Has llegado al final de la Pokédex!',
            duration: 3000
          });
          await toast.present();
        } else {
          // Append new results to existing list
          this.pokemonList = [...this.pokemonList, ...response.results];
          
          // Check if we're approaching the end of all Pokémon (around 1010+)
          if (this.offset + this.limit >= 1010) {
            this.hasReachedEnd = true;
            event.target.disabled = true;
            
            const toast = await this.toastCtrl.create({
              message: '¡Has llegado al final de la Pokédex!',
              duration: 3000
            });
            await toast.present();
          }
          
          // Wait for DOM to update
          setTimeout(() => {
            // Restore scroll position
            this.content.scrollToPoint(0, scrollPosition, 0);
          }, 100);
        }
      } finally {
        this.isLoading = false;
      }
    } catch (error) {
      console.error('Error loading more Pokémon', error);
    } finally {
      event.target.complete();
    }
  }

  clearGenerationFilter() {
    this.selectedGenerations = [];
    this.offset = 0;
    this.cargarPokemons();
  }

  // Helper method for template to check if a generation is selected
  isGenerationSelected(generation: PokemonGeneration): boolean {
    return this.selectedGenerations.some(g => g.id === generation.id);
  }

  // Helper method to show total count of Pokémon
  getTotalPokemonCount(): string {
    if (this.selectedGenerations.length === 1) {
      const gen = this.selectedGenerations[0];
      return `${gen.displayName}: ${this.pokemonList.length} Pokémon`;
    } 
    else if (this.selectedGenerations.length > 1) {
      return `${this.pokemonList.length} Pokémon de ${this.selectedGenerations.length} generaciones`;
    }
    else if (this.tiposSeleccionados.length > 0) {
      return `${this.pokemonList.length} Pokémon de tipo ${this.tiposSeleccionados.map(t => t.name).join(' y ')}`;
    }
    else if (this.pokemon && this.pokemon.trim()) {
      return `${this.pokemonList.length} resultados para "${this.pokemon}"`;
    }
    return `Mostrando ${this.pokemonList.length} Pokémon`;
  }

  // Handle image loading errors by providing a fallback sprite
  handleImageError(event: Event, pokemonUrl: string): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      const id = this.getPokemonId(pokemonUrl);
      img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
    }
  }

  // Métodos de paginación
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    
    this.currentPage = page;
    this.offset = (page - 1) * this.pageSize;
    this.limit = this.pageSize;
    this.cargarPokemons();
  }

  goToFirstPage() {
    this.goToPage(1);
  }

  goToLastPage() {
    this.goToPage(this.totalPages);
  }

  goToPreviousPage() {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage() {
    this.goToPage(this.currentPage + 1);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  shouldShowPagination(): boolean {
    return this.showPagination && 
           this.totalPages > 1 && 
           !this.selectedGenerations.length && 
           !this.tiposSeleccionados.length && 
           !this.pokemon.trim();
  }
}

