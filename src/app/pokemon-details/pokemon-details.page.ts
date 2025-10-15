import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PokemonService, PokemonDetail, PokemonVariant, EvolutionPokemon } from '../Services/pokemon.service';
import { NavController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

interface PokemonEvolutionData {
  base: EvolutionPokemon;
  mega?: PokemonVariant[];
  gigamax?: PokemonVariant;
}

@Component({
  selector: 'app-pokemon-details',
  templateUrl: './pokemon-details.page.html',
  styleUrls: ['./pokemon-details.page.scss'],
  standalone: false
})
export class PokemonDetailsPage implements OnInit {
  pokemon: PokemonDetail | null = null;
  pokemonName: string = '';
  error: string = '';
  evolutionChain: EvolutionPokemon[] = [];
  megaEvolutions: PokemonVariant[] = [];
  gigamaxForm: PokemonVariant | null = null;
  typeWeaknesses: {
    superEffective: string[],
    effective: string[],
    resistant: string[],
    superResistant: string[],
    immune: string[]
  } = {
    superEffective: [],
    effective: [],
    resistant: [],
    superResistant: [],
    immune: []
  };
  
  // Nuevas propiedades para habilidades y movimientos
  abilities: Array<{
    name: string;
    is_hidden: boolean;
    description: string;
    expanded: boolean;
  }> = [];
  
  moves: Array<{
    name: string;
    type: string;
    power: number | null;
    accuracy: number | null;
    pp: number | null;
    damage_class: string;
    description: string;
  }> = [];

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService,
    private navCtrl: NavController,
    private router: Router
  ) {}

  ngOnInit() {
    this.pokemonName = this.route.snapshot.paramMap.get('id') || '';
    if (this.pokemonName) {
      this.getPokemonDetails();
    }
  }

  async getPokemonDetails() {
    try {
      this.pokemon = await firstValueFrom(this.pokemonService.getPokemonByNameOrId(this.pokemonName));
      
      // Calcular debilidades basadas en los tipos
      if (this.pokemon && this.pokemon.types) {
        this.typeWeaknesses = this.pokemonService.calculateTypeWeaknesses(this.pokemon.types);
      }
      
      // Obtener información de la especie y variantes
      const [species, variants] = await Promise.all([
        firstValueFrom(this.pokemonService.getPokemonSpecies(this.pokemon.id)),
        this.pokemonService.getPokemonVariants(this.pokemon.id)
      ]);
      
      // Guardar variantes
      this.megaEvolutions = variants.mega;
      this.gigamaxForm = variants.gigamax;
      
      // Obtener y procesar la cadena evolutiva
      if (species.evolution_chain?.url) {
        const evolutionChain = await firstValueFrom(this.pokemonService.getPokemonEvolutionChain(species.evolution_chain.url));
        await this.processEvolutionChain(evolutionChain.chain);
      }
      
      // Obtener información detallada de habilidades
      await this.loadAbilityDetails();
      
      // Obtener información de movimientos
      await this.loadMoveDetails();
    } catch (error) {
      console.error('Error al obtener detalles del Pokémon', error);
      this.error = 'No se pudo cargar la información del Pokémon';
      this.pokemon = null;
    }
  }

  async processEvolutionChain(chain: any) {
    const evolutions: EvolutionPokemon[] = [];
    
    // Función recursiva para procesar la cadena
    const processChain = async (current: any, evolutionDetails: any = null) => {
      if (!current) return;
      
      // Obtener el ID del Pokémon actual
      const pokemon = await firstValueFrom(
        this.pokemonService.getPokemonByNameOrId(current.species.name)
      );
      
      // Crear objeto de evolución
      const evolutionData: EvolutionPokemon = {
        id: pokemon.id,
        name: current.species.name
      };
      
      // Agregar detalles de evolución si existen
      if (evolutionDetails) {
        evolutionData.evolutionDetails = {
          level: evolutionDetails.min_level || undefined,
          item: evolutionDetails.item?.name || undefined,
          trigger: evolutionDetails.trigger?.name || undefined,
          condition: ''
        };
        
        // Determinar la condición de evolución
        if (evolutionDetails.min_level) {
          evolutionData.evolutionDetails.condition = `Nivel ${evolutionDetails.min_level}`;
        } else if (evolutionDetails.item) {
          evolutionData.evolutionDetails.condition = `Usando ${evolutionDetails.item.name}`;
        } else if (evolutionDetails.trigger?.name === 'trade') {
          evolutionData.evolutionDetails.condition = 'Intercambio';
        } else if (evolutionDetails.trigger?.name === 'use-item') {
          evolutionData.evolutionDetails.condition = `Usar ${evolutionDetails.item?.name || 'objeto'}`;
        } else if (evolutionDetails.min_happiness) {
          evolutionData.evolutionDetails.condition = `Felicidad ≥ ${evolutionDetails.min_happiness}`;
        } else if (evolutionDetails.held_item) {
          evolutionData.evolutionDetails.condition = `Equipando ${evolutionDetails.held_item.name}`;
        } else {
          evolutionData.evolutionDetails.condition = 'Evolución especial';
        }
      }
      
      evolutions.push(evolutionData);

      // Procesar la siguiente evolución si existe
      if (current.evolves_to?.length > 0) {
        for (const evolution of current.evolves_to) {
          // Pasar los detalles de evolución al siguiente Pokémon en la cadena
          await processChain(evolution, evolution.evolution_details[0]);
        }
      }
    };

    await processChain(chain);
    this.evolutionChain = evolutions;
  }
  
  async loadAbilityDetails() {
    if (!this.pokemon) return;
    
    this.abilities = [];
    const abilitiesPromises = this.pokemon.abilities.map(async ability => {
      try {
        const details = await firstValueFrom(
          this.pokemonService.getAbilityDetails(ability.ability.url)
        );
        
        // Buscar la descripción en español o en inglés si no existe
        const description = details.flavor_text_entries.find(
          (entry: any) => entry.language.name === 'es'
        )?.flavor_text || 
        details.flavor_text_entries.find(
          (entry: any) => entry.language.name === 'en'
        )?.flavor_text || 
        'No hay descripción disponible';
        
        this.abilities.push({
          name: ability.ability.name,
          is_hidden: ability.is_hidden,
          description: description,
          expanded: false
        });
      } catch (error) {
        console.error(`Error al cargar detalles de habilidad ${ability.ability.name}:`, error);
      }
    });
    
    await Promise.all(abilitiesPromises);
    // Ordenar habilidades para que las ocultas estén al final
    this.abilities.sort((a, b) => (a.is_hidden === b.is_hidden) ? 0 : a.is_hidden ? 1 : -1);
  }
  
  async loadMoveDetails() {
    if (!this.pokemon) return;
    
    // Limitar a los primeros 10 movimientos para mejor rendimiento
    const limitedMoves = this.pokemon.moves?.slice(0, 10) || [];
    
    this.moves = [];
    const movesPromises = limitedMoves.map(async (moveEntry: any) => {
      try {
        const details = await firstValueFrom(
          this.pokemonService.getMoveDetails(moveEntry.move.url)
        );
        
        // Buscar la descripción en español o en inglés si no existe
        const description = details.flavor_text_entries?.find(
          (entry: any) => entry.language.name === 'es'
        )?.flavor_text || 
        details.flavor_text_entries?.find(
          (entry: any) => entry.language.name === 'en'
        )?.flavor_text || 
        'No hay descripción disponible';
        
        this.moves.push({
          name: details.name,
          type: details.type.name,
          power: details.power,
          accuracy: details.accuracy,
          pp: details.pp,
          damage_class: details.damage_class.name,
          description: description
        });
      } catch (error) {
        console.error(`Error al cargar detalles del movimiento ${moveEntry.move.name}:`, error);
      }
    });
    
    await Promise.all(movesPromises);
    
    // Ordenar movimientos por tipo
    this.moves.sort((a, b) => a.type.localeCompare(b.type));
  }
  
  toggleAbilityDetails(ability: any) {
    ability.expanded = !ability.expanded;
  }

  getPokemonGif(): string {
    if (!this.pokemon?.id) {
      return 'assets/icon/no-image.png'; 
    }
    return this.getPokemonGifById(this.pokemon.id);
  }

  getPokemonGifById(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
  }

  getSprites(): {[key: string]: string} | null {
    if (!this.pokemon) return null;
    return this.pokemonService.getSprites(this.pokemon);
  }

  goBack() {
    this.navCtrl.back();
  }

  getTypeColor(type: string | undefined): string {
    if (!type) return '#777777';
    return this.pokemonService.getTypeColor(type);
  }

  getStatPercentage(baseStat: number): number {
    return (baseStat / 255) * 100;
  }

  getStatColor(statName: string): string {
    const colors: { [key: string]: string } = {
      hp: '#FF0000',
      attack: '#F08030',
      defense: '#F8D030',
      'special-attack': '#6890F0',
      'special-defense': '#78C850',
      speed: '#F85888'
    };
    return colors[statName] || '#777777';
  }

  verDetalles(nombre: string) {
    this.navCtrl.navigateForward(['/pokemon', nombre]);
  }

  filtrarPorTipo(tipoNombre: string) {
    // Navegar a la página principal y pasar el tipo como parámetro en la URL
    this.router.navigate(['/home'], { queryParams: { tipo: tipoNombre } });
  }
}
