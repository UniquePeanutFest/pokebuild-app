import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from, mergeMap } from 'rxjs';
import { tap, map, catchError, switchMap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

// Interfaces para tipar las respuestas
export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokemonBasic[];
}

export interface PokemonBasic {
  name: string;
  url: string;
}

export interface PokemonGeneration {
  id: number;
  name: string;
  displayName: string;
  region: string;
  rangeStart: number;
  rangeEnd: number;
}

export interface EvolutionPokemon {
  id: number;
  name: string;
  evolutionDetails?: {
    level?: number;
    item?: string;
    trigger?: string;
    condition?: string;
  };
}

export interface PokemonDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: PokemonType[];
  sprites: PokemonSprites;
  stats: PokemonStat[];
  abilities: PokemonAbility[];
  moves: any[];
  item?: ItemDetail | null;
  adjustedStats?: { [key: string]: number };
  is_baby?: boolean;
  evolves_to?: any[];
  evolved_from?: any;
  species: {
    name: string;
    url: string;
  };
}

export interface PokemonType {
  slot: number;
  type: {
    name: string;
    url: string;
  };
}

export interface PokemonSprites {
  front_default: string;
  back_default: string;
  front_shiny: string;
  back_shiny: string;
  other: {
    'official-artwork': {
      front_default: string;
    };
    home: {
      front_default: string;
    };
  };
  versions: {
    'generation-v': {
      'black-white': {
        animated: {
          front_default: string;
          back_default: string;
        };
      };
    };
  };
}

export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
}

export interface PokemonAbility {
  ability: {
    name: string;
    url: string;
  };
  is_hidden: boolean;
  slot: number;
}

export interface PokemonTypeFilter {
  name: string;
  selected: boolean;
  color: string;
}

export interface PokemonVariant {
  id: number;
  name: string;
  sprite: string;
  stats?: PokemonStat[];
  abilities?: {
    name: string;
    description: string;
  }[];
  types?: PokemonType[];
  evolution_method?: string;
}

export interface PokemonEvolutionData {
  base: EvolutionPokemon;
  mega?: PokemonVariant[];
  gigamax?: PokemonVariant;
}

// Interfaces para Items
export interface ItemListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ItemBasic[];
}

export interface ItemBasic {
  name: string;
  url: string;
}

export interface ItemDetail {
  id: number;
  name: string;
  sprites: {
    default: string;
  };
  cost: number;
  category: {
    name: string;
    url: string;
  };
  effect_entries: {
    effect: string;
    short_effect: string;
    language: {
      name: string;
      url: string;
    };
  }[];
  names: {
    name: string;
    language: {
      name: string;
      url: string;
    };
  }[];
  flavor_text_entries: {
    text: string;
    language: {
      name: string;
      url: string;
    };
  }[];
  attributes: {
    name: string;
    url: string;
  }[];
  is_berry?: boolean;
  berryInfo?: any;
}

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  private readonly baseUrl = 'https://pokeapi.co/api/v2';
  private cache: { [key: string]: { data: any; timestamp: number } } = {};
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutos

  // Definición de generaciones de Pokémon
  readonly pokemonGenerations: PokemonGeneration[] = [
    { id: 1, name: 'generation-i', displayName: 'Generación I', region: 'Kanto', rangeStart: 1, rangeEnd: 151 },
    { id: 2, name: 'generation-ii', displayName: 'Generación II', region: 'Johto', rangeStart: 152, rangeEnd: 251 },
    { id: 3, name: 'generation-iii', displayName: 'Generación III', region: 'Hoenn', rangeStart: 252, rangeEnd: 386 },
    { id: 4, name: 'generation-iv', displayName: 'Generación IV', region: 'Sinnoh', rangeStart: 387, rangeEnd: 493 },
    { id: 5, name: 'generation-v', displayName: 'Generación V', region: 'Unova', rangeStart: 494, rangeEnd: 649 },
    { id: 6, name: 'generation-vi', displayName: 'Generación VI', region: 'Kalos', rangeStart: 650, rangeEnd: 721 },
    { id: 7, name: 'generation-vii', displayName: 'Generación VII', region: 'Alola', rangeStart: 722, rangeEnd: 809 },
    { id: 8, name: 'generation-viii', displayName: 'Generación VIII', region: 'Galar', rangeStart: 810, rangeEnd: 898 },
    { id: 9, name: 'generation-ix', displayName: 'Generación IX', region: 'Paldea', rangeStart: 899, rangeEnd: 1010 }
  ];

  // Tabla de efectividades de tipos (x2 damage, x0.5 damage, x0 damage)
  readonly typeEffectiveness: { [key: string]: { 
    strengths: string[],  // Tipos contra los que este tipo hace daño x2
    weaknesses: string[], // Tipos contra los que este tipo hace daño x0.5
    immunities: string[]  // Tipos contra los que este tipo hace daño x0
  } } = {
    normal: {
      strengths: [],
      weaknesses: ['rock', 'steel'],
      immunities: ['ghost']
    },
    fire: {
      strengths: ['grass', 'ice', 'bug', 'steel'],
      weaknesses: ['fire', 'water', 'rock', 'dragon'],
      immunities: []
    },
    water: {
      strengths: ['fire', 'ground', 'rock'],
      weaknesses: ['water', 'grass', 'dragon'],
      immunities: []
    },
    electric: {
      strengths: ['water', 'flying'],
      weaknesses: ['electric', 'grass', 'dragon'],
      immunities: ['ground']
    },
    grass: {
      strengths: ['water', 'ground', 'rock'],
      weaknesses: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
      immunities: []
    },
    ice: {
      strengths: ['grass', 'ground', 'flying', 'dragon'],
      weaknesses: ['fire', 'water', 'ice', 'steel'],
      immunities: []
    },
    fighting: {
      strengths: ['normal', 'ice', 'rock', 'dark', 'steel'],
      weaknesses: ['poison', 'flying', 'psychic', 'bug', 'fairy'],
      immunities: ['ghost']
    },
    poison: {
      strengths: ['grass', 'fairy'],
      weaknesses: ['poison', 'ground', 'rock', 'ghost'],
      immunities: ['steel']
    },
    ground: {
      strengths: ['fire', 'electric', 'poison', 'rock', 'steel'],
      weaknesses: ['grass', 'bug'],
      immunities: ['flying']
    },
    flying: {
      strengths: ['grass', 'fighting', 'bug'],
      weaknesses: ['electric', 'rock', 'steel'],
      immunities: []
    },
    psychic: {
      strengths: ['fighting', 'poison'],
      weaknesses: ['psychic', 'steel'],
      immunities: ['dark']
    },
    bug: {
      strengths: ['grass', 'psychic', 'dark'],
      weaknesses: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'],
      immunities: []
    },
    rock: {
      strengths: ['fire', 'ice', 'flying', 'bug'],
      weaknesses: ['fighting', 'ground', 'steel'],
      immunities: []
    },
    ghost: {
      strengths: ['psychic', 'ghost'],
      weaknesses: ['dark'],
      immunities: ['normal']
    },
    dragon: {
      strengths: ['dragon'],
      weaknesses: ['steel'],
      immunities: ['fairy']
    },
    dark: {
      strengths: ['psychic', 'ghost'],
      weaknesses: ['fighting', 'dark', 'fairy'],
      immunities: []
    },
    steel: {
      strengths: ['ice', 'rock', 'fairy'],
      weaknesses: ['fire', 'water', 'electric', 'steel'],
      immunities: []
    },
    fairy: {
      strengths: ['fighting', 'dragon', 'dark'],
      weaknesses: ['fire', 'poison', 'steel'],
      immunities: []
    }
  };

  readonly pokemonTypes: PokemonTypeFilter[] = [
    { name: 'bug', color: '#92BC2C', selected: false },
    { name: 'dark', color: '#595761', selected: false },
    { name: 'dragon', color: '#0C69C8', selected: false },
    { name: 'electric', color: '#F2D94E', selected: false },
    { name: 'fairy', color: '#EE90E6', selected: false },
    { name: 'fighting', color: '#D3425F', selected: false },
    { name: 'fire', color: '#FBA54C', selected: false },
    { name: 'flying', color: '#A1BBEC', selected: false },
    { name: 'ghost', color: '#5F6DBC', selected: false },
    { name: 'grass', color: '#5FBD58', selected: false },
    { name: 'ground', color: '#DA7C4D', selected: false },
    { name: 'ice', color: '#75D0C1', selected: false },
    { name: 'normal', color: '#A0A29F', selected: false },
    { name: 'poison', color: '#B763CF', selected: false },
    { name: 'psychic', color: '#FA8581', selected: false },
    { name: 'rock', color: '#C9BB8A', selected: false },
    { name: 'steel', color: '#5695A3', selected: false },
    { name: 'water', color: '#539DDF', selected: false }
  ];

  constructor(private http: HttpClient) { }

  getPokemons(offset: number = 0, limit: number = 20): Observable<PokemonListResponse> {
    const url = `${this.baseUrl}/pokemon?limit=${limit}&offset=${offset}`;
    return this.getCachedData<PokemonListResponse>(url);
  }

  getPokemonByNameOrId(identifier: string | number): Observable<PokemonDetail> {
    const url = `${this.baseUrl}/pokemon/${identifier.toString().toLowerCase()}`;
    return this.getCachedData<PokemonDetail>(url);
  }

  getPokemonSpecies(id: number): Observable<any> {
    const url = `${this.baseUrl}/pokemon-species/${id}`;
    return this.getCachedData(url);
  }

  getAbilityDetails(url: string): Observable<any> {
    return this.getCachedData(url);
  }
  
  getMoveDetails(url: string): Observable<any> {
    return this.getCachedData(url);
  }

  getPokemonEvolutionChain(url: string): Observable<any> {
    return this.getCachedData(url);
  }

  async getPokemonsByType(type: string): Promise<PokemonDetail[]> {
    try {
      const typeData = await firstValueFrom(this.http.get<any>(`${this.baseUrl}/type/${type}`));
      
      // Increase limit to 100 to get more Pokémon of this type (for better filtering)
      const pokemonPromises = typeData.pokemon
        .slice(0, 100)
        .map((entry: { pokemon: PokemonBasic }) => 
          firstValueFrom(this.getPokemonByNameOrId(entry.pokemon.name))
        );
      
      return await Promise.all(pokemonPromises);
    } catch (error) {
      console.error(`Error fetching Pokémon of type ${type}:`, error);
      return [];
    }
  }

  async searchPokemon(query: string): Promise<PokemonDetail[]> {
    const response = await firstValueFrom(this.getPokemons(0, 1200));
    const filteredResults = response.results
      .filter(pokemon => pokemon.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 20);
    
    const pokemonDetails = await Promise.all(
      filteredResults.map(result => 
        firstValueFrom(this.getPokemonByNameOrId(result.name))
      )
    );
    
    return pokemonDetails;
  }

  private getCachedData<T>(url: string): Observable<T> {
    const cached = this.cache[url];
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return of(cached.data);
    }

    return this.http.get<T>(url).pipe(
      tap(response => {
        this.cache[url] = {
          data: response,
          timestamp: Date.now()
        };
      }),
      catchError(error => {
        console.error('Error en la llamada a la API:', error);
        throw error;
      })
    );
  }

  getSprites(pokemon: PokemonDetail): {[key: string]: string} {
    return {
      default: pokemon.sprites.front_default,
      shiny: pokemon.sprites.front_shiny,
      official: pokemon.sprites.other['official-artwork'].front_default,
      animated: pokemon.sprites.versions['generation-v']['black-white'].animated.front_default,
      home: pokemon.sprites.other.home.front_default
    };
  }

  getTypeColor(type: string | undefined): string {
    if (!type) return '#777777';
    
    const colors: { [key: string]: string } = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC'
    };
    return colors[type.toLowerCase()] || '#777777';
  }

  clearCache(): void {
    this.cache = {};
  }

  clearPokemonCache(identifier: string | number): void {
    const url = `${this.baseUrl}/pokemon/${identifier.toString().toLowerCase()}`;
    delete this.cache[url];
  }

  async getPokemonsByTypes(selectedTypes: string[]): Promise<PokemonDetail[]> {
    if (selectedTypes.length === 0) {
      const response = await firstValueFrom(this.getPokemons(0, 20));
      return Promise.all(
        response.results.map(pokemon => 
          firstValueFrom(this.getPokemonByNameOrId(pokemon.name))
        )
      );
    }

    // Get Pokémon for the first type directly (no firstValueFrom needed since it's already a Promise)
    const firstTypeResult = await this.getPokemonsByType(selectedTypes[0]);
    let matchingPokemon = [...firstTypeResult];
    
    // Filter by additional types
    for (let i = 1; i < selectedTypes.length; i++) {
      const typeResult = await this.getPokemonsByType(selectedTypes[i]);
      // Keep only Pokémon that exist in both sets (using IDs for comparison)
      matchingPokemon = matchingPokemon.filter(pokemon => 
        typeResult.some(p => p.id === pokemon.id)
      );
    }

    return matchingPokemon.slice(0, 20); // Limit to 20 results
  }

  // Helper to get the proper Gigantamax sprite URL
  getGigantamaxSprite(pokemon: PokemonDetail): string | null {
    // Check for special gmax property first
    if ((pokemon.sprites as any).gmax) {
      return (pokemon.sprites as any).gmax;
    }
    
    // Check if the Pokemon name contains -gmax
    if (pokemon.name.includes('-gmax')) {
      return pokemon.sprites.other?.['official-artwork']?.front_default || 
             pokemon.sprites.front_default || 
             null;
    }
    
    // Try to get the official artwork as fallback for gigantamax forms
    return pokemon.sprites.other?.['official-artwork']?.front_default || 
           pokemon.sprites.front_default || 
           null;
  }

  async getPokemonVariants(id: number): Promise<{ mega: PokemonVariant[], gigamax: PokemonVariant | null }> {
    try {
      const species = await firstValueFrom(this.getPokemonSpecies(id));
      const varieties = species.varieties || [];
      
      const mega: PokemonVariant[] = [];
      let gigamax: PokemonVariant | null = null;

      // Obtener información de métodos de mega evolución
      const megaEvolutionMethods: { [key: string]: string } = {};
      
      // Buscar información en la descripción de la especie
      const entries = species.flavor_text_entries || [];
      const megaInfo = entries.find((entry: any) => 
        entry.text && (entry.text.includes('Mega') || entry.text.includes('mega'))
      );
      
      // Si hay información sobre mega evolución, guardarla
      if (megaInfo) {
        megaEvolutionMethods['default'] = megaInfo.text;
      }

      for (const variety of varieties) {
        if (variety.pokemon.name.includes('-mega')) {
          const megaPokemon = await firstValueFrom(this.getPokemonByNameOrId(variety.pokemon.name));
          const megaName = variety.pokemon.name;
          
          // Determinar qué tipo de mega piedra usa
          let evolutionMethod = 'Requiere Mega Piedra';
          if (megaName.includes('mega-x')) {
            evolutionMethod = 'Requiere Mega Piedra X';
          } else if (megaName.includes('mega-y')) {
            evolutionMethod = 'Requiere Mega Piedra Y';
          } else {
            // Buscar nombres específicos de mega piedras
            const pokemonBaseName = megaPokemon.name.split('-mega')[0];
            evolutionMethod = `Requiere ${pokemonBaseName}ita`;
          }
          
          // Obtener detalles de habilidades
          const abilitiesDetails = [];
          for (const abilityEntry of megaPokemon.abilities) {
            try {
              const abilityData = await firstValueFrom(
                this.getAbilityDetails(abilityEntry.ability.url)
              );
              
              // Buscar descripción en español o inglés
              const description = abilityData.flavor_text_entries.find(
                (entry: any) => entry.language.name === 'es'
              )?.flavor_text || 
              abilityData.flavor_text_entries.find(
                (entry: any) => entry.language.name === 'en'
              )?.flavor_text || 
              'No hay descripción disponible';
              
              abilitiesDetails.push({
                name: abilityEntry.ability.name,
                description: description
              });
            } catch (error) {
              console.error(`Error obteniendo detalles de habilidad para Mega Evolución:`, error);
            }
          }
          
          mega.push({
            id: megaPokemon.id,
            name: megaPokemon.name,
            sprite: megaPokemon.sprites.front_default,
            stats: megaPokemon.stats,
            abilities: abilitiesDetails,
            types: megaPokemon.types,
            evolution_method: evolutionMethod
          });
        } else if (variety.pokemon.name.includes('-gmax')) {
          const gmaxPokemon = await firstValueFrom(this.getPokemonByNameOrId(variety.pokemon.name));
          
          // Obtener detalles de habilidades
          const abilitiesDetails = [];
          for (const abilityEntry of gmaxPokemon.abilities) {
            try {
              const abilityData = await firstValueFrom(
                this.getAbilityDetails(abilityEntry.ability.url)
              );
              
              // Buscar descripción en español o inglés
              const description = abilityData.flavor_text_entries.find(
                (entry: any) => entry.language.name === 'es'
              )?.flavor_text || 
              abilityData.flavor_text_entries.find(
                (entry: any) => entry.language.name === 'en'
              )?.flavor_text || 
              'No hay descripción disponible';
              
              abilitiesDetails.push({
                name: abilityEntry.ability.name,
                description: description
              });
            } catch (error) {
              console.error(`Error obteniendo detalles de habilidad para Gigantamax:`, error);
            }
          }
          
          gigamax = {
            id: gmaxPokemon.id,
            name: gmaxPokemon.name,
            sprite: this.getGigantamaxSprite(gmaxPokemon) || gmaxPokemon.sprites.front_default,
            stats: gmaxPokemon.stats,
            abilities: abilitiesDetails,
            types: gmaxPokemon.types,
            evolution_method: 'Requiere Factor Gigamax'
          };
        }
      }

      return { mega, gigamax };
    } catch (error) {
      console.error('Error getting Pokemon variants:', error);
      return { mega: [], gigamax: null };
    }
  }

  /**
   * Calcula las debilidades de un Pokémon en base a sus tipos
   * @param types - Array de tipos del Pokémon
   * @returns Objeto con debilidades clasificadas (x4, x2, x0.5, x0.25, x0)
   */
  calculateTypeWeaknesses(types: PokemonType[]): {
    superEffective: string[],     // x4 damage (double weakness)
    effective: string[],          // x2 damage
    resistant: string[],          // x0.5 damage
    superResistant: string[],     // x0.25 damage
    immune: string[]              // x0 damage
  } {
    if (!types || types.length === 0) {
      return {
        superEffective: [],
        effective: [],
        resistant: [],
        superResistant: [],
        immune: []
      };
    }

    // Para almacenar el factor de daño para cada tipo
    const damageFactors: { [type: string]: number } = {};
    
    // Inicializar todos los tipos con factor de daño 1
    this.pokemonTypes.forEach(type => {
      damageFactors[type.name] = 1;
    });

    // Calcular los factores de daño para cada tipo del Pokémon
    types.forEach(pokemonType => {
      const typeName = pokemonType.type.name;
      const typeData = this.typeEffectiveness[typeName];
      
      if (!typeData) return;
      
      // Aplicar debilidades (aumenta el factor de daño)
      typeData.weaknesses.forEach(weakness => {
        damageFactors[weakness] *= 2; // Débil contra este tipo
      });
      
      // Aplicar resistencias (reduce el factor de daño)
      typeData.strengths.forEach(strength => {
        damageFactors[strength] /= 2; // Resistente contra este tipo
      });
      
      // Aplicar inmunidades (factor de daño 0)
      typeData.immunities.forEach(immunity => {
        damageFactors[immunity] = 0; // Inmune a este tipo
      });
    });

    // Clasificar los tipos según su factor de daño
    const result = {
      superEffective: [] as string[],
      effective: [] as string[],
      resistant: [] as string[],
      superResistant: [] as string[],
      immune: [] as string[]
    };

    // Clasificar cada tipo según su factor de daño
    Object.entries(damageFactors).forEach(([type, factor]) => {
      if (factor === 0) {
        result.immune.push(type);
      } else if (factor === 0.25) {
        result.superResistant.push(type);
      } else if (factor === 0.5) {
        result.resistant.push(type);
      } else if (factor === 2) {
        result.effective.push(type);
      } else if (factor === 4) {
        result.superEffective.push(type);
      }
    });

    return result;
  }

  // Nuevos métodos para los items
  getItems(offset: number = 0, limit: number = 20): Observable<ItemListResponse> {
    return this.getCachedData<ItemListResponse>(`${this.baseUrl}/item?offset=${offset}&limit=${limit}`);
  }

  getItemByNameOrId(identifier: string | number): Observable<ItemDetail> {
    return this.getCachedData<ItemDetail>(`${this.baseUrl}/item/${identifier}`);
  }

  getItemsByCategory(category: string): Observable<any> {
    return this.getCachedData<any>(`${this.baseUrl}/item-category/${category}`);
  }

  async searchItems(query: string): Promise<ItemDetail[]> {
    const normalizedQuery = query.toLowerCase().trim();
    let items: ItemDetail[] = [];
    
    try {
      // Intentar buscar por nombre/id exacto primero
      try {
        const item = await firstValueFrom(this.getItemByNameOrId(normalizedQuery));
        items.push(item);
        return items;
      } catch (error) {
        // Si no se encuentra por nombre exacto, continuamos con la búsqueda general
      }
      
      // Obtener todos los items y filtrar por nombre
      const response = await firstValueFrom(this.getItems(0, 100));
      const itemsPromises = response.results
        .filter(item => item.name.includes(normalizedQuery))
        .map(item => firstValueFrom(this.getItemByNameOrId(item.name)));
      
      items = await Promise.all(itemsPromises);
      return items;
    } catch (error) {
      console.error('Error al buscar items:', error);
      return [];
    }
  }

  // Métodos para obtener items específicos por categoría
  async getBattleItems(): Promise<ItemDetail[]> {
    try {
      const categoryData = await firstValueFrom(this.getItemsByCategory('battle'));
      const itemsPromises = categoryData.items.map((item: ItemBasic) => 
        firstValueFrom(this.getItemByNameOrId(item.name))
      );
      return await Promise.all(itemsPromises);
    } catch (error) {
      console.error('Error al obtener battle items:', error);
      return [];
    }
  }

  async getHoldItems(): Promise<ItemDetail[]> {
    try {
      const categoryData = await firstValueFrom(this.getItemsByCategory('held-items'));
      const itemsPromises = categoryData.items.map((item: ItemBasic) => 
        firstValueFrom(this.getItemByNameOrId(item.name))
      );
      return await Promise.all(itemsPromises);
    } catch (error) {
      console.error('Error al obtener hold items:', error);
      return [];
    }
  }

  // Obtener nombre simple de un item
  getItemName(item: ItemDetail): string {
    return item.name.replace(/-/g, ' ');
  }

  // Método para obtener items recomendados para un tipo de Pokémon
  async getRecommendedItemsForPokemon(pokemon: PokemonDetail): Promise<ItemDetail[]> {
    try {
      // Obtener items útiles según el tipo del Pokémon
      const holdItems = await this.getHoldItems();
      
      // Calcular categoría del Pokémon (similar a lo que ya teníamos)
      let category = this.determinePokemonCategory(pokemon);
      
      // Filtrar items según la categoría
      return this.filterItemsByCategory(holdItems, category);
    } catch (error) {
      console.error('Error al obtener items recomendados:', error);
      return [];
    }
  }

  // Determinar la categoría de un Pokémon basado en sus stats
  private determinePokemonCategory(pokemon: PokemonDetail): string {
    if (!pokemon || !pokemon.stats) return 'general';
    
    const attack = pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat || 0;
    const spAttack = pokemon.stats.find(s => s.stat.name === 'special-attack')?.base_stat || 0;
    const defense = pokemon.stats.find(s => s.stat.name === 'defense')?.base_stat || 0;
    const spDefense = pokemon.stats.find(s => s.stat.name === 'special-defense')?.base_stat || 0;
    const speed = pokemon.stats.find(s => s.stat.name === 'speed')?.base_stat || 0;
    const hp = pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat || 0;
    
    let category = 'general';
    
    if (attack > spAttack && attack > 100) {
      category = 'physical';
    } else if (spAttack > attack && spAttack > 100) {
      category = 'special';
    }
    
    if (defense > 100 && spDefense < 80) {
      category = 'physical-tank';
    } else if (spDefense > 100 && defense < 80) {
      category = 'special-tank';
    } else if (defense > 90 && spDefense > 90) {
      category = 'tank';
    }
    
    if (hp > 100 && defense > 80 && spDefense > 80) {
      category = 'bulky';
    }
    
    if (speed > 100 && (attack > 90 || spAttack > 90)) {
      category = 'sweeper';
    }
    
    if (hp < 70 || (defense < 70 && spDefense < 70)) {
      category = 'frail';
    }
    
    // Si el Pokémon es un configurador (tiene movimientos de aumento de stats)
    const knownSetupMoves = ['swords-dance', 'dragon-dance', 'nasty-plot', 'calm-mind', 'quiver-dance'];
    const hasSetupMove = pokemon.moves?.some(move => 
      knownSetupMoves.includes(move.move.name)
    );
    
    if (hasSetupMove) {
      category = 'setup';
    }
    
    return category;
  }

  // Filtrar items por categoría de Pokémon
  private filterItemsByCategory(items: ItemDetail[], category: string): ItemDetail[] {
    const itemCategories: {[key: string]: string[]} = {
      'physical': ['choice-band', 'muscle-band', 'expert-belt', 'life-orb'],
      'special': ['choice-specs', 'wise-glasses', 'expert-belt', 'life-orb'],
      'tank': ['leftovers', 'rocky-helmet', 'black-sludge', 'sitrus-berry'],
      'bulky': ['leftovers', 'rocky-helmet', 'eviolite', 'assault-vest'],
      'physical-tank': ['rocky-helmet', 'leftovers', 'eviolite'],
      'special-tank': ['assault-vest', 'leftovers', 'light-clay'],
      'sweeper': ['life-orb', 'expert-belt', 'focus-sash', 'choice-scarf'],
      'frail': ['focus-sash', 'focus-band', 'sitrus-berry'],
      'setup': ['focus-sash', 'white-herb', 'mental-herb', 'power-herb']
    };
    
    // Items comunes que sirven para cualquier Pokémon
    const defaultItems = ['leftovers', 'sitrus-berry', 'life-orb', 'choice-scarf'];
    
    // Obtener lista de identificadores de items para esta categoría
    const recommendedItemIds = category in itemCategories 
      ? itemCategories[category] 
      : defaultItems;
    
    // Filtrar items de la lista completa
    return items.filter(item => {
      // Buscar por nombre aproximado, ya que los ids pueden diferir de la API
      return recommendedItemIds.some(id => 
        item.name.includes(id) || 
        item.names.some(n => n.name.toLowerCase().includes(id))
      );
    }).slice(0, 3); // Limitar a 3 recomendaciones
  }

  // Obtener Pokémon por generación
  async getPokemonsByGeneration(generationId: number): Promise<PokemonDetail[]> {
    try {
      const generation = this.pokemonGenerations.find(gen => gen.id === generationId);
      
      if (!generation) {
        throw new Error(`Generación ${generationId} no encontrada`);
      }
      
      // Construir un rango de IDs para esta generación
      const idRange = Array.from(
        { length: generation.rangeEnd - generation.rangeStart + 1 },
        (_, i) => generation.rangeStart + i
      );
      
      // Obtener los detalles de todos los Pokémon de la generación
      // Process in batches to avoid overwhelming the API
      const batchSize = 20;
      const batches = [];
      
      for (let i = 0; i < idRange.length; i += batchSize) {
        const batch = idRange.slice(i, i + batchSize);
        batches.push(batch);
      }
      
      let allPokemon: PokemonDetail[] = [];
      
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(id => firstValueFrom(this.getPokemonByNameOrId(id.toString())))
        );
        allPokemon = [...allPokemon, ...batchResults];
      }
      
      return allPokemon;
    } catch (error) {
      console.error(`Error al obtener Pokémon de la generación:`, error);
      return [];
    }
  }

  // Obtener todos los Pokémon dentro de un rango (para paginación de generación)
  async getPokemonsByRange(start: number, limit: number): Promise<PokemonDetail[]> {
    try {
      const idRange = Array.from(
        { length: limit },
        (_, i) => start + i
      );
      
      // Obtener los detalles de los Pokémon en el rango
      const pokemonDetails = await Promise.all(
        idRange.map(id => firstValueFrom(this.getPokemonByNameOrId(id.toString())))
      );
      
      return pokemonDetails;
    } catch (error) {
      console.error(`Error al obtener Pokémon en el rango:`, error);
      return [];
    }
  }

  // Get Pokémon filtered by types and/or generation (single generation)
  async getPokemonsByTypesAndGeneration(types: string[], generationId?: number): Promise<PokemonDetail[]> {
    try {
      let filteredPokemon: PokemonDetail[] = [];
      
      // If neither type nor generation filters are specified, return empty array
      if (types.length === 0 && !generationId) {
        return [];
      }
      
      // Apply type filters
      if (types.length > 0) {
        // Fetch Pokémon for each selected type
        const typePromises = types.map(type => this.getPokemonsByType(type));
        const typeResults = await Promise.all(typePromises);
        
        // Find Pokémon that match ALL selected types (intersection)
        if (typeResults.length > 0) {
          // Start with all Pokémon from first type
          let matchingPokemon = typeResults[0];
          
          // For each additional type, keep only Pokémon that exist in both sets
          for (let i = 1; i < typeResults.length; i++) {
            matchingPokemon = matchingPokemon.filter(pokemon => 
              typeResults[i].some(p => p.id === pokemon.id)
            );
          }
          
          filteredPokemon = matchingPokemon;
        }
      }
      
      // Apply generation filter if specified
      if (generationId) {
        const generationPokemon = await this.getPokemonsByGeneration(generationId);
        
        // If we already have type-filtered Pokémon, filter by generation
        if (types.length > 0) {
          filteredPokemon = filteredPokemon.filter(pokemon => 
            generationPokemon.some(p => p.id === pokemon.id)
          );
        } else {
          // Otherwise, just use the generation results
          filteredPokemon = generationPokemon;
        }
      }
      
      return filteredPokemon;
    } catch (error) {
      console.error('Error fetching filtered Pokémon:', error);
      throw error;
    }
  }
  
  // Get Pokémon filtered by types and/or multiple generations
  async getPokemonsByTypesAndGenerations(types: string[], generationIds: number[]): Promise<PokemonDetail[]> {
    try {
      let filteredPokemon: PokemonDetail[] = [];
      
      // If neither type nor generation filters are specified, return empty array
      if (types.length === 0 && generationIds.length === 0) {
        return [];
      }
      
      // Apply type filters
      if (types.length > 0) {
        // Fetch Pokémon for each selected type
        const typePromises = types.map(type => this.getPokemonsByType(type));
        const typeResults = await Promise.all(typePromises);
        
        // Find Pokémon that match ALL selected types (intersection)
        if (typeResults.length > 0) {
          // Start with all Pokémon from first type
          let matchingPokemon = typeResults[0];
          
          // For each additional type, keep only Pokémon that exist in both sets
          for (let i = 1; i < typeResults.length; i++) {
            matchingPokemon = matchingPokemon.filter(pokemon => 
              typeResults[i].some(p => p.id === pokemon.id)
            );
          }
          
          filteredPokemon = matchingPokemon;
        }
      }
      
      // Apply generation filters if specified
      if (generationIds.length > 0) {
        // Fetch Pokémon for each selected generation
        const generationPromises = generationIds.map(genId => this.getPokemonsByGeneration(genId));
        const generationResults = await Promise.all(generationPromises);
        
        // Combine all Pokémon from all selected generations (union)
        let allGenerationPokemon: PokemonDetail[] = [];
        generationResults.forEach(genPokemon => {
          allGenerationPokemon = [...allGenerationPokemon, ...genPokemon];
        });
        
        // Remove duplicates
        allGenerationPokemon = allGenerationPokemon.filter((pokemon, index, self) =>
          index === self.findIndex(p => p.id === pokemon.id)
        );
        
        // If we already have type-filtered Pokémon, filter by generations
        if (types.length > 0) {
          filteredPokemon = filteredPokemon.filter(pokemon => 
            allGenerationPokemon.some(p => p.id === pokemon.id)
          );
        } else {
          // Otherwise, just use the combined generation results
          filteredPokemon = allGenerationPokemon;
        }
      }
      
      return filteredPokemon;
    } catch (error) {
      console.error('Error fetching filtered Pokémon:', error);
      throw error;
    }
  }

  // Método para buscar Pokémon por nombre o número
  async searchPokemonByNameOrNumber(query: string): Promise<PokemonBasic[]> {
    try {
      query = query.toLowerCase().trim();
      
      // Intentar buscar por ID si es un número
      if (/^\d+$/.test(query)) {
        const pokemon = await firstValueFrom(this.getPokemonByNameOrId(query));
        return [{
          name: pokemon.name,
          url: `${this.baseUrl}/pokemon/${pokemon.id}/`
        }];
      }
      
      // Buscar por nombre
      const response = await firstValueFrom(this.getPokemons(0, 1000)); // Obtener una lista grande
      
      // Filtrar resultados que coincidan con la consulta
      const filtered = response.results.filter(p => 
        p.name.toLowerCase().includes(query)
      );
      
      return filtered.slice(0, 20); // Limitar a 20 resultados
    } catch (error) {
      console.error('Error en la búsqueda:', error);
      return [];
    }
  }

  // Métodos para las bayas
  getBerries(offset: number = 0, limit: number = 20): Observable<any> {
    return this.getCachedData<any>(`${this.baseUrl}/berry?offset=${offset}&limit=${limit}`);
  }

  getBerryByNameOrId(identifier: string | number): Observable<any> {
    return this.getCachedData<any>(`${this.baseUrl}/berry/${identifier}`);
  }

  getBerryFirmnesses(offset: number = 0, limit: number = 20): Observable<any> {
    return this.getCachedData<any>(`${this.baseUrl}/berry-firmness?offset=${offset}&limit=${limit}`);
  }

  getBerryFirmnessById(id: number): Observable<any> {
    return this.getCachedData<any>(`${this.baseUrl}/berry-firmness/${id}`);
  }

  getBerryFlavors(offset: number = 0, limit: number = 20): Observable<any> {
    return this.getCachedData<any>(`${this.baseUrl}/berry-flavor?offset=${offset}&limit=${limit}`);
  }

  getBerryFlavorById(id: number): Observable<any> {
    return this.getCachedData<any>(`${this.baseUrl}/berry-flavor/${id}`);
  }

  // Método para convertir bayas en objetos para mostrar en el selector de items
  async getAllBerries(): Promise<ItemDetail[]> {
    try {
      // Obtener lista de bayas
      const response = await firstValueFrom(this.getBerries(0, 40));
      
      // Obtener detalles de cada baya
      const berriesPromises = response.results.map(async (berry: any) => {
        const berryDetail = await firstValueFrom(this.getBerryByNameOrId(berry.name));
        // Obtener el objeto asociado a esta baya
        try {
          const itemName = `${berry.name}-berry`;
          const itemDetail = await firstValueFrom(this.getItemByNameOrId(itemName));
          
          // Añadir una propiedad para identificar que es una baya
          itemDetail.is_berry = true;
          itemDetail.berryInfo = berryDetail;
          return itemDetail;
        } catch (error) {
          console.error(`Error obteniendo objeto para baya ${berry.name}:`, error);
          return null;
        }
      });
      
      // Esperar a que se resuelvan todas las promesas y filtrar los nulos
      const berries = (await Promise.all(berriesPromises)).filter(berry => berry !== null);
      return berries;
    } catch (error) {
      console.error('Error obteniendo bayas:', error);
      return [];
    }
  }
}
