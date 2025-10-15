import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { PokemonDetail, PokemonService, ItemDetail } from '../Services/pokemon.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-item-selector-modal',
  templateUrl: './item-selector-modal.component.html',
  styleUrls: ['./item-selector-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class ItemSelectorModalComponent implements OnInit {
  @Input() pokemon: PokemonDetail | null = null;
  @Input() currentItem: ItemDetail | null = null;

  isLoading = false;
  error = '';

  // Para la búsqueda
  searchTerm = '';
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription | undefined;

  // Items
  allItems: ItemDetail[] = [];
  filteredItems: ItemDetail[] = [];
  recommendedItems: ItemDetail[] = [];
  selectedItem: ItemDetail | null = null;

  // Categorías de items
  itemCategories = [
    { id: 'all', name: 'Todos' },
    { id: 'combat', name: 'Combate' },
    { id: 'berry', name: 'Bayas' },
    { id: 'hold', name: 'Para sostener' },
    { id: 'recommended', name: 'Recomendados' }
  ];
  selectedCategory = 'all';

  // Smogon item sets populares
  smogonPopularItems = [
    { id: 'choice-specs', name: 'Choice Specs', description: 'Aumenta Atq. Esp. 50%, pero limita a un solo movimiento', category: 'special' },
    { id: 'choice-band', name: 'Choice Band', description: 'Aumenta Ataque 50%, pero limita a un solo movimiento', category: 'physical' },
    { id: 'choice-scarf', name: 'Choice Scarf', description: 'Aumenta Velocidad 50%, pero limita a un solo movimiento', category: 'sweeper' },
    { id: 'life-orb', name: 'Life Orb', description: 'Aumenta potencia 30%, pero reduce PS 10% por ataque', category: 'offense' },
    { id: 'leftovers', name: 'Leftovers', description: 'Recupera 1/16 de PS cada turno', category: 'tank' },
    { id: 'focus-sash', name: 'Focus Sash', description: 'Permite sobrevivir un golpe letal con 1 PS (uso único)', category: 'frail' },
    { id: 'assault-vest', name: 'Assault Vest', description: 'Aumenta Def. Esp. 50%, pero impide usar movimientos de estado', category: 'special-tank' },
    { id: 'weakness-policy', name: 'Weakness Policy', description: 'Al recibir ataque super efectivo, aumenta Atq./Atq.Esp. +2', category: 'setup' },
    { id: 'rocky-helmet', name: 'Rocky Helmet', description: 'Daña al atacante 1/6 de sus PS si recibe contacto físico', category: 'physical-tank' },
    { id: 'expert-belt', name: 'Expert Belt', description: 'Aumenta 20% daño de ataques super efectivos', category: 'offense' },
    { id: 'heavy-duty-boots', name: 'Heavy-Duty Boots', description: 'Evita daño por hazards (púas, rocas, etc.)', category: 'utility' },
    { id: 'light-clay', name: 'Light Clay', description: 'Extiende la duración de pantallas (Reflect/Light Screen)', category: 'support' },
    { id: 'eviolite', name: 'Eviolite', description: 'Aumenta Def./Def.Esp. 50% en Pokémon no evolucionados', category: 'defense' },
    { id: 'sitrus-berry', name: 'Sitrus Berry', description: 'Restaura 25% de PS cuando bajan a menos de la mitad', category: 'berry' },
    { id: 'black-sludge', name: 'Black Sludge', description: 'Restaura 1/16 PS por turno para tipo Veneno, daña a los demás', category: 'poison' }
  ];

  constructor(
    private modalCtrl: ModalController,
    private pokemonService: PokemonService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.setupSearch();
    this.loadItems();

    // Si ya hay un item seleccionado, mostrarlo
    if (this.currentItem) {
      this.selectedItem = this.currentItem;
    }
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  setupSearch() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchItems(term);
    });
  }

  onSearchInput(event: any) {
    const term = event.target.value;
    this.searchSubject.next(term);
  }

  async loadItems() {
    this.isLoading = true;

    try {
      // Cargar todos los items de batalla y para sostener
      const holdItems = await this.pokemonService.getHoldItems();
      
      // Cargar las bayas
      const berries = await this.pokemonService.getAllBerries();
      
      // Combinar ambos arrays
      this.allItems = [...holdItems, ...berries];
      
      // Aplicar filtro inicial
      this.filterItems();
      
      // Si tenemos un Pokémon, cargar recomendaciones
      if (this.pokemon) {
        this.recommendedItems = await this.pokemonService.getRecommendedItemsForPokemon(this.pokemon);
        this.findSmogonItems();
      }
    } catch (error) {
      console.error('Error al cargar items:', error);
      this.error = 'Error al cargar los items. Intenta de nuevo.';
    } finally {
      this.isLoading = false;
    }
  }

  // Filtrar items según la categoría seleccionada
  filterItems() {
    if (this.selectedCategory === 'all') {
      this.filteredItems = [...this.allItems];
    } else if (this.selectedCategory === 'recommended') {
      this.filteredItems = [...this.recommendedItems];
    } else {
      // Filtrar por categoría
      this.filteredItems = this.allItems.filter(item => {
        if (this.selectedCategory === 'berry') {
          return item.name.includes('berry');
        } else if (this.selectedCategory === 'combat') {
          return !item.name.includes('berry') && this.isCombatItem(item);
        } else if (this.selectedCategory === 'hold') {
          return this.isHoldItem(item);
        }
        return true;
      });
    }

    // Si hay término de búsqueda, aplicar filtro adicional
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      this.filteredItems = this.filteredItems.filter(item => 
        item.name.toLowerCase().includes(term) ||
        this.getItemName(item).toLowerCase().includes(term)
      );
    }
  }

  searchItems(term: string) {
    this.searchTerm = term;
    this.filterItems();
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.filterItems();
  }

  // Verificar si un item es de combate
  private isCombatItem(item: ItemDetail): boolean {
    const combatKeywords = ['band', 'specs', 'scarf', 'orb', 'plate', 'vest', 'sash', 'herb', 'leftovers', 'eviolite'];
    return combatKeywords.some(keyword => item.name.includes(keyword));
  }

  // Verificar si un item es para sostener
  private isHoldItem(item: ItemDetail): boolean {
    const nonHoldKeywords = ['ball', 'potion', 'medicine', 'coin'];
    return !nonHoldKeywords.some(keyword => item.name.includes(keyword));
  }

  // Relacionar nuestros items recomendados con el set de Smogon
  private findSmogonItems() {
    // Obtener la categoría del Pokémon
    const category = this.determinePokemonCategory();
    
    // Filtrar los sets de Smogon que coincidan con esta categoría
    const suggestedItemIds = this.smogonPopularItems
      .filter(item => {
        if (item.category === category) return true;
        if (category === 'physical' && ['offense', 'physical'].includes(item.category)) return true;
        if (category === 'special' && ['offense', 'special'].includes(item.category)) return true;
        if (category === 'tank' && ['defense', 'tank'].includes(item.category)) return true;
        return false;
      })
      .map(item => item.id);
    
    // Añadir estos items a los recomendados si no están ya
    for (const itemId of suggestedItemIds) {
      // Buscar en los items existentes
      const matchingItem = this.allItems.find(item => 
        item.name.includes(itemId) || this.getItemName(item).toLowerCase().includes(itemId)
      );
      
      if (matchingItem && !this.recommendedItems.some(i => i.id === matchingItem.id)) {
        this.recommendedItems.push(matchingItem);
      }
    }
  }

  // Determinar categoría basada en los stats (simplificado)
  private determinePokemonCategory(): string {
    if (!this.pokemon) return 'general';
    
    const attack = this.pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat || 0;
    const spAttack = this.pokemon.stats.find(s => s.stat.name === 'special-attack')?.base_stat || 0;
    const defense = this.pokemon.stats.find(s => s.stat.name === 'defense')?.base_stat || 0;
    const spDefense = this.pokemon.stats.find(s => s.stat.name === 'special-defense')?.base_stat || 0;
    const speed = this.pokemon.stats.find(s => s.stat.name === 'speed')?.base_stat || 0;
    
    // Lógica simplificada
    if (attack > spAttack && attack > 100) {
      return 'physical';
    } else if (spAttack > attack && spAttack > 100) {
      return 'special';
    } else if (defense > 100 || spDefense > 100) {
      return 'tank';
    } else if (speed > 100) {
      return 'sweeper';
    }
    
    return 'general';
  }

  // Seleccionar un item
  selectItem(item: ItemDetail) {
    this.selectedItem = item;
  }

  // Confirmar la selección y cerrar el modal
  async confirmSelection() {
    if (this.selectedItem) {
      this.dismiss(this.selectedItem);
    } else {
      const toast = await this.toastCtrl.create({
        message: 'Por favor, selecciona un objeto primero',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      
      await toast.present();
    }
  }

  // Desasignar el objeto (pasando null)
  async removeItem() {
    const toast = await this.toastCtrl.create({
      message: 'Objeto removido',
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    
    await toast.present();
    this.dismiss(null);
  }

  // Cerrar el modal sin hacer nada
  cancel() {
    this.dismiss();
  }

  // Cerrar el modal y devolver el ítem seleccionado
  dismiss(item?: ItemDetail | null) {
    this.modalCtrl.dismiss(item);
  }

  // Obtener el nombre traducido del item
  getItemName(item: ItemDetail): string {
    return this.pokemonService.getItemName(item);
  }

  // Obtener la descripción del item
  getItemDescription(item: ItemDetail): string {
    // Buscar descripción en español
    const effectEntry = item.effect_entries.find(
      entry => entry.language.name === 'es' || entry.language.name === 'en'
    );
    
    if (effectEntry) {
      return effectEntry.short_effect;
    }
    
    // Buscar en Smogon si está disponible
    const smogonItem = this.smogonPopularItems.find(
      si => si.id === item.name || this.getItemName(item).toLowerCase().includes(si.id)
    );
    
    if (smogonItem) {
      return smogonItem.description;
    }
    
    return 'Sin descripción disponible';
  }
}
