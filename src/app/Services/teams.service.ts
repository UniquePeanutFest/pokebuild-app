import { Injectable } from '@angular/core';
import { PokemonDetail, PokemonVariant } from './pokemon.service';
import { Storage } from '@ionic/storage-angular';

// Interfaz para Pokémon con información de forma y rol
export interface TeamPokemon {
  pokemon: PokemonDetail;
  form?: 'normal' | 'mega' | 'gigantamax';
  megaVariant?: PokemonVariant;
  role?: string;
  // Stats ajustados según forma
  adjustedStats?: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
}

export interface PokemonTeam {
  id: string;
  name: string;
  pokemons: TeamPokemon[]; // Ahora almacenamos TeamPokemon en lugar de PokemonDetail
  createdAt: Date;
  updatedAt: Date;
  gameMode?: 'pve' | 'pvp';
  isCorrupt?: boolean;
  corruptionReason?: string;
}

// Interfaces actualizadas para el análisis de equipo
export interface TypeEffectiveness {
  [type: string]: number;  // Ej: { 'fire': 2, 'water': 0.5 }
}

export interface PokemonRole {
  role: string;
  description: string;
  suitability: number;  // 0-10, cuán bien cumple el Pokémon este rol
}

export interface PokemonWithRoles {
  pokemon: PokemonDetail;
  roles: PokemonRole[];
  recommendedMovesTypes: string[];
}

export interface TeamWeakness {
  type: string;
  count: number;
  severity: number;  // 1-5, qué tan grave es la debilidad
}

export interface TeamAnalysis {
  typeCount: { [type: string]: number };
  weaknesses: { [type: string]: number };
  resistances: { [type: string]: number };
  coverage: string[];
  recommendations: string[];
  // Campos adicionales para análisis detallado
  teamRoles: { [role: string]: number };  // Conteo de roles en el equipo
  missingRoles: string[];
  pokemonAnalysis: PokemonWithRoles[];
  teamWeaknesses: TeamWeakness[];
  teamStrengths: string[];
  weakAgainst?: string[];  // Tipos contra los que el equipo es débil
  strongAgainst?: string[];  // Tipos contra los que el equipo es fuerte
  balanceScore: number;  // 0-10, qué tan equilibrado está el equipo
}

@Injectable({
  providedIn: 'root'
})
export class TeamsService {
  private _storage: Storage | null = null;
  private teams: PokemonTeam[] = [];
  private initialized = false;

  // Datos de efectividad de tipos (simplificado)
  private typeEffectiveness: { [type: string]: TypeEffectiveness } = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5, fighting: 2 },
    fire: { fire: 0.5, water: 2, grass: 0.5, ice: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5, ground: 2 },
    water: { fire: 0.5, water: 0.5, grass: 2, electric: 2, ice: 0.5, steel: 0.5 },
    electric: { electric: 0.5, ground: 2, flying: 0.5, steel: 0.5 },
    grass: { fire: 2, water: 0.5, grass: 0.5, poison: 2, ground: 0.5, flying: 2, bug: 2, ice: 2 },
    ice: { fire: 2, ice: 0.5, fighting: 2, rock: 2, steel: 2 },
    fighting: { flying: 2, psychic: 2, bug: 0.5, rock: 0.5, dark: 0.5, fairy: 2 },
    poison: { grass: 0.5, fighting: 0.5, poison: 0.5, ground: 2, psychic: 2, bug: 0.5, fairy: 0.5 },
    ground: { water: 2, grass: 2, electric: 0, poison: 0.5, rock: 0.5, ice: 2 },
    flying: { electric: 2, grass: 0.5, fighting: 0.5, bug: 0.5, rock: 2, ice: 2 },
    psychic: { fighting: 0.5, psychic: 0.5, bug: 2, ghost: 2, dark: 2 },
    bug: { fire: 2, grass: 0.5, fighting: 0.5, ground: 0.5, flying: 2, rock: 2 },
    rock: { normal: 0.5, fire: 0.5, water: 2, grass: 2, fighting: 2, poison: 0.5, ground: 2, steel: 2 },
    ghost: { normal: 0, fighting: 0, poison: 0.5, bug: 0.5, ghost: 2, dark: 2 },
    dragon: { dragon: 2, ice: 2, fairy: 2 },
    dark: { fighting: 2, bug: 2, ghost: 0.5, dark: 0.5, fairy: 2 },
    steel: { fire: 2, water: 0.5, electric: 0.5, ice: 0.5, rock: 0.5, steel: 0.5, fighting: 2, ground: 2 },
    fairy: { fighting: 0.5, poison: 2, bug: 0.5, dragon: 0, dark: 0.5, steel: 2 }
  };

  // Definiciones de roles para análisis
  private roles = {
    // Roles generales
    'Atacante físico': {
      statsPriority: ['attack', 'speed'],
      description: 'Pokémon con alto ataque físico para infligir daño rápido'
    },
    'Atacante especial': {
      statsPriority: ['special-attack', 'speed'],
      description: 'Pokémon con alto ataque especial para infligir daño rápido'
    },
    'Tanque físico': {
      statsPriority: ['hp', 'defense'],
      description: 'Pokémon con alta defensa física para absorber ataques'
    },
    'Tanque especial': {
      statsPriority: ['hp', 'special-defense'],
      description: 'Pokémon con alta defensa especial para absorber ataques'
    },
    // Roles PvE
    'Sweeper PvE': {
      statsPriority: ['attack', 'special-attack', 'speed'],
      description: 'Pokémon capaz de barrer equipos enteros de la IA'
    },
    // Roles PvP
    'Setup Sweeper': {
      statsPriority: ['speed', 'attack', 'special-attack'],
      description: 'Pokémon que se potencia y luego barre al equipo rival'
    },
    'Revenge Killer': {
      statsPriority: ['speed', 'attack', 'special-attack'],
      description: 'Pokémon veloz para rematar oponentes debilitados'
    },
    'Wall Breaker': {
      statsPriority: ['attack', 'special-attack'],
      description: 'Pokémon con ataques potentes para romper defensas'
    },
    'Soporte': {
      statsPriority: ['hp', 'defense', 'special-defense'],
      description: 'Pokémon que apoya al equipo con movimientos de estado'
    }
  };

  constructor(private storage: Storage) {
    this.init();
  }

  async init() {
    // Create storage
    const storage = await this.storage.create();
    this._storage = storage;
    
    // Load teams from storage
    await this.loadTeams();
    this.initialized = true;
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }

  async loadTeams() {
    const teams = await this._storage?.get('pokemon-teams');
    if (teams) {
      this.teams = teams;
    }
  }

  async saveTeams() {
    await this._storage?.set('pokemon-teams', this.teams);
  }

  // Add a method to force a refresh of teams data from storage
  async refreshTeams(): Promise<void> {
    await this.ensureInitialized();
    await this.loadTeams();
  }

  async getTeams(): Promise<PokemonTeam[]> {
    await this.ensureInitialized();
    
    // Verificar si hay equipos corruptos y marcarlos
    const validTeams = this.teams.map(team => {
      // Intentar verificar si el equipo está corrupto
      try {
        this.isTeamCorrupt(team);
        return team;
      } catch (error: any) {
        // Si el equipo está corrupto, marcarlo
        return {
          ...team, 
          isCorrupt: true,
          corruptionReason: error.message || 'Datos del equipo corruptos'
        };
      }
    });
    
    this.teams = validTeams;
    return [...this.teams];
  }

  async getTeam(id: string): Promise<PokemonTeam | undefined> {
    await this.ensureInitialized();
    return this.teams.find(team => team.id === id);
  }

  async createTeam(name: string, gameMode: 'pve' | 'pvp' = 'pve'): Promise<PokemonTeam> {
    await this.ensureInitialized();
    
    const team: PokemonTeam = {
      id: Date.now().toString(),
      name,
      pokemons: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      gameMode
    };

    this.teams.push(team);
    await this.saveTeams();
    return team;
  }

  async updateTeam(team: PokemonTeam): Promise<PokemonTeam> {
    await this.ensureInitialized();
    
    const index = this.teams.findIndex(t => t.id === team.id);
    if (index !== -1) {
      team.updatedAt = new Date();
      this.teams[index] = team;
      await this.saveTeams();
    }
    
    return team;
  }

  async deleteTeam(id: string): Promise<void> {
    await this.ensureInitialized();
    
    this.teams = this.teams.filter(team => team.id !== id);
    await this.saveTeams();
  }

  async addPokemonToTeam(teamId: string, pokemonInfo: TeamPokemon | PokemonDetail): Promise<PokemonTeam | undefined> {
    await this.ensureInitialized();
    
    const team = await this.getTeam(teamId);
    if (team) {
      // Validate team size (max 6 Pokémon)
      if (team.pokemons.length >= 6) {
        throw new Error('El equipo ya tiene 6 Pokémon (máximo)');
      }
      
      let teamPokemon: TeamPokemon;
      
      // Convertir a TeamPokemon si es un PokemonDetail simple
      if ('pokemon' in pokemonInfo) {
        // Ya es un TeamPokemon
        teamPokemon = pokemonInfo;
      } else {
        // Es un PokemonDetail simple, convertir a TeamPokemon
        teamPokemon = { 
          pokemon: pokemonInfo,
          form: 'normal'
        };
      }
      
      // Check if Pokémon is already in the team
      const alreadyExists = team.pokemons.some(p => p.pokemon.id === teamPokemon.pokemon.id);
      if (alreadyExists) {
        throw new Error('Este Pokémon ya está en el equipo');
      }
      
      // Inicializar adjustedStats con los stats base para todos los Pokémon
      teamPokemon.adjustedStats = {
        hp: teamPokemon.pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat || 0,
        attack: teamPokemon.pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat || 0,
        defense: teamPokemon.pokemon.stats.find(s => s.stat.name === 'defense')?.base_stat || 0,
        'special-attack': teamPokemon.pokemon.stats.find(s => s.stat.name === 'special-attack')?.base_stat || 0,
        'special-defense': teamPokemon.pokemon.stats.find(s => s.stat.name === 'special-defense')?.base_stat || 0,
        speed: teamPokemon.pokemon.stats.find(s => s.stat.name === 'speed')?.base_stat || 0
      };
      
      // Si es una mega o gigantamax, ajustar stats
      if (teamPokemon.form === 'mega' && teamPokemon.megaVariant) {
        teamPokemon.adjustedStats = this.adjustStatsForMega(teamPokemon.pokemon, teamPokemon.megaVariant);
      } else if (teamPokemon.form === 'gigantamax') {
        teamPokemon.adjustedStats = this.adjustStatsForGigantamax(teamPokemon.pokemon);
      }
      
      team.pokemons.push(teamPokemon);
      team.updatedAt = new Date();
      await this.updateTeam(team);
    }
    
    return team;
  }

  // Ajustar stats para Mega Evolución
  private adjustStatsForMega(pokemon: PokemonDetail, megaVariant: PokemonVariant): any {
    if (!megaVariant.stats) {
      // Si no hay datos de stats específicos, aplicar un aumento genérico
      return {
        hp: pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat || 0,
        attack: Math.round((pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat || 0) * 1.3),
        defense: Math.round((pokemon.stats.find(s => s.stat.name === 'defense')?.base_stat || 0) * 1.2),
        'special-attack': Math.round((pokemon.stats.find(s => s.stat.name === 'special-attack')?.base_stat || 0) * 1.3),
        'special-defense': Math.round((pokemon.stats.find(s => s.stat.name === 'special-defense')?.base_stat || 0) * 1.2),
        speed: Math.round((pokemon.stats.find(s => s.stat.name === 'speed')?.base_stat || 0) * 1.1)
      };
    }
    
    // Si hay stats específicos, usarlos directamente
    return {
      hp: megaVariant.stats.find(s => s.stat.name === 'hp')?.base_stat || 
         pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat || 0,
      attack: megaVariant.stats.find(s => s.stat.name === 'attack')?.base_stat || 
              pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat || 0,
      defense: megaVariant.stats.find(s => s.stat.name === 'defense')?.base_stat || 
               pokemon.stats.find(s => s.stat.name === 'defense')?.base_stat || 0,
      'special-attack': megaVariant.stats.find(s => s.stat.name === 'special-attack')?.base_stat || 
                        pokemon.stats.find(s => s.stat.name === 'special-attack')?.base_stat || 0,
      'special-defense': megaVariant.stats.find(s => s.stat.name === 'special-defense')?.base_stat || 
                         pokemon.stats.find(s => s.stat.name === 'special-defense')?.base_stat || 0,
      speed: megaVariant.stats.find(s => s.stat.name === 'speed')?.base_stat || 
             pokemon.stats.find(s => s.stat.name === 'speed')?.base_stat || 0
    };
  }
  
  // Ajustar stats para Gigantamax
  private adjustStatsForGigantamax(pokemon: PokemonDetail): any {
    // Para Gigantamax, duplicamos el HP y aumentamos ligeramente los demás stats
    return {
      hp: (pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat || 0) * 2,
      attack: Math.round((pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat || 0) * 1.1),
      defense: Math.round((pokemon.stats.find(s => s.stat.name === 'defense')?.base_stat || 0) * 1.1),
      'special-attack': Math.round((pokemon.stats.find(s => s.stat.name === 'special-attack')?.base_stat || 0) * 1.1),
      'special-defense': Math.round((pokemon.stats.find(s => s.stat.name === 'special-defense')?.base_stat || 0) * 1.1),
      speed: pokemon.stats.find(s => s.stat.name === 'speed')?.base_stat || 0 // La velocidad no cambia
    };
  }

  async removePokemonFromTeam(teamId: string, pokemonId: number): Promise<PokemonTeam | undefined> {
    await this.ensureInitialized();
    
    const team = await this.getTeam(teamId);
    if (team) {
      team.pokemons = team.pokemons.filter(p => p.pokemon.id !== pokemonId);
      team.updatedAt = new Date();
      await this.updateTeam(team);
    }
    
    return team;
  }

  async updateTeamGameMode(teamId: string, gameMode: 'pve' | 'pvp'): Promise<PokemonTeam | undefined> {
    await this.ensureInitialized();
    
    const team = await this.getTeam(teamId);
    if (team) {
      team.gameMode = gameMode;
      team.updatedAt = new Date();
      await this.updateTeam(team);
    }
    
    return team;
  }

  // Analiza el equipo para proporcionar recomendaciones detalladas
  async analyzeTeam(teamId: string): Promise<TeamAnalysis> {
    await this.ensureInitialized();
    
    const team = await this.getTeam(teamId);
    const gameMode = team?.gameMode || 'pve';
    
    const analysis: TeamAnalysis = {
      typeCount: {},
      weaknesses: {},
      resistances: {},
      coverage: [],
      recommendations: [],
      teamRoles: {},
      missingRoles: [],
      pokemonAnalysis: [],
      teamWeaknesses: [],
      teamStrengths: [],
      balanceScore: 5
    };
    
    if (!team || team.pokemons.length === 0) {
      return analysis;
    }
    
    // Análisis de tipos
    this.analyzeTypes(team, analysis);
    
    // Análisis de roles según las estadísticas de cada Pokémon
    this.analyzeRoles(team, analysis, gameMode);
    
    // Análisis de debilidades del equipo
    this.analyzeTeamWeaknesses(analysis);
    
    // Generar recomendaciones basadas en el modo de juego
    this.generateRecommendations(team, analysis, gameMode);
    
    return analysis;
  }

  // Analiza los tipos presentes en el equipo
  private analyzeTypes(team: PokemonTeam, analysis: TeamAnalysis): void {
    // Conteo de tipos
    team.pokemons.forEach(pokemon => {
      pokemon.pokemon.types.forEach(type => {
        const typeName = type.type.name;
        analysis.typeCount[typeName] = (analysis.typeCount[typeName] || 0) + 1;
      });
    });
    
    // Analizar fortalezas y debilidades
    const allTypes = [
      'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 
      'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 
      'dragon', 'dark', 'steel', 'fairy'
    ];
    
    // Encontrar tipos no cubiertos por el equipo
    analysis.coverage = allTypes.filter(type => !analysis.typeCount[type]);
    
    // Calcular debilidades y resistencias
    allTypes.forEach(attackingType => {
      let weaknessCount = 0;
      let resistanceCount = 0;
      
      team.pokemons.forEach(pokemon => {
        const types = pokemon.pokemon.types.map(t => t.type.name);
        let effectiveness = 1;
        
        types.forEach(defenderType => {
          if (this.typeEffectiveness[defenderType] && 
              this.typeEffectiveness[defenderType][attackingType] !== undefined) {
            effectiveness *= this.typeEffectiveness[defenderType][attackingType];
          }
        });
        
        if (effectiveness > 1) {
          weaknessCount++;
        } else if (effectiveness < 1) {
          resistanceCount++;
        }
      });
      
      if (weaknessCount > 0) {
        analysis.weaknesses[attackingType] = weaknessCount;
      }
      
      if (resistanceCount > 0) {
        analysis.resistances[attackingType] = resistanceCount;
      }
    });
  }

  // Analiza los roles que cada Pokémon puede desempeñar en el equipo
  private analyzeRoles(team: PokemonTeam, analysis: TeamAnalysis, gameMode: 'pve' | 'pvp'): void {
    // Inicializar conteo de roles
    Object.keys(this.roles).forEach(role => {
      analysis.teamRoles[role] = 0;
    });
    
    // Analizar cada Pokémon
    team.pokemons.forEach(pokemon => {
      const pokemonWithRoles: PokemonWithRoles = {
        pokemon: pokemon.pokemon,
        roles: [],
        recommendedMovesTypes: []
      };
      
      // Normalizar estadísticas para comparación (0-10)
      const stats: Record<string, number> = {
        hp: this.normalizeStatValue(pokemon.adjustedStats?.hp || 0),
        attack: this.normalizeStatValue(pokemon.adjustedStats?.attack || 0),
        defense: this.normalizeStatValue(pokemon.adjustedStats?.defense || 0),
        'special-attack': this.normalizeStatValue(pokemon.adjustedStats?.['special-attack'] || 0),
        'special-defense': this.normalizeStatValue(pokemon.adjustedStats?.['special-defense'] || 0),
        speed: this.normalizeStatValue(pokemon.adjustedStats?.speed || 0)
      };
      
      // Evaluar aptitud para cada rol
      Object.entries(this.roles).forEach(([roleName, roleData]) => {
        // Filtrar roles según modo de juego
        if ((gameMode === 'pve' && roleName.includes('PvP')) || 
            (gameMode === 'pvp' && roleName.includes('PvE'))) {
          return;
        }
        
        let suitability = 0;
        
        // Calcular aptitud basada en estadísticas prioritarias
        roleData.statsPriority.forEach((statName, index) => {
          // Las primeras estadísticas tienen más peso
          const weight = roleData.statsPriority.length - index;
          suitability += (stats[statName] * weight);
        });
        
        // Normalizar a escala 0-10
        suitability = Math.min(10, Math.max(0, suitability / (roleData.statsPriority.length * 1.5)));
        
        // Si la aptitud es suficiente, añadir a roles potenciales
        if (suitability >= 5) {
          pokemonWithRoles.roles.push({
            role: roleName,
            description: roleData.description,
            suitability: Math.round(suitability * 10) / 10
          });
          
          // Incrementar conteo de roles en el equipo
          analysis.teamRoles[roleName]++;
        }
      });
      
      // Identificar movimientos recomendados basados en tipos con ventaja
      const pokemonTypes = pokemon.pokemon.types.map(t => t.type.name);
      const enemyTypes = Object.keys(this.typeEffectiveness);
      
      enemyTypes.forEach(enemyType => {
        let isStrong = false;
        
        pokemonTypes.forEach(pokemonType => {
          if (this.typeEffectiveness[enemyType] && 
              this.typeEffectiveness[enemyType][pokemonType] && 
              this.typeEffectiveness[enemyType][pokemonType] > 1) {
            isStrong = true;
          }
        });
        
        if (isStrong && !pokemonWithRoles.recommendedMovesTypes.includes(enemyType)) {
          pokemonWithRoles.recommendedMovesTypes.push(enemyType);
        }
      });
      
      // Añadir análisis de este Pokémon al resultado
      analysis.pokemonAnalysis.push(pokemonWithRoles);
    });
    
    // Identificar roles faltantes
    Object.entries(this.roles).forEach(([roleName, roleData]) => {
      // Filtrar según modo de juego
      if ((gameMode === 'pve' && roleName.includes('PvP')) || 
          (gameMode === 'pvp' && roleName.includes('PvE'))) {
        return;
      }
      
      if (analysis.teamRoles[roleName] === 0) {
        analysis.missingRoles.push(roleName);
      }
    });
  }

  // Analiza debilidades específicas del equipo
  private analyzeTeamWeaknesses(analysis: TeamAnalysis): void {
    // Identificar tipos a los que múltiples Pokémon son débiles
    Object.entries(analysis.weaknesses).forEach(([type, count]) => {
      if (count >= 2) {
        analysis.teamWeaknesses.push({
          type,
          count,
          severity: Math.min(5, Math.round(count * 1.5))
        });
      }
    });
    
    // Ordenar por severidad
    analysis.teamWeaknesses.sort((a, b) => b.severity - a.severity);
    
    // Identificar tipos contra los que el equipo es fuerte
    Object.entries(analysis.resistances).forEach(([type, count]) => {
      if (count >= 2) {
        analysis.teamStrengths.push(type);
      }
    });
  }

  // Genera recomendaciones basadas en el análisis y el modo de juego
  private generateRecommendations(team: PokemonTeam, analysis: TeamAnalysis, gameMode: 'pve' | 'pvp'): void {
    // Recomendaciones basadas en el número de Pokémon
    if (team.pokemons.length < 6) {
      analysis.recommendations.push(
        `Tu equipo tiene ${team.pokemons.length} Pokémon. Un equipo completo debería tener 6.`
      );
    }
    
    // Recomendaciones basadas en debilidades de tipo
    if (analysis.teamWeaknesses.length > 0) {
      const criticalWeaknesses = analysis.teamWeaknesses
        .filter(w => w.severity >= 4)
        .map(w => w.type);
      
      if (criticalWeaknesses.length > 0) {
        analysis.recommendations.push(
          `¡Atención! Tu equipo tiene debilidades críticas contra tipos: ${criticalWeaknesses.join(', ')}. ` +
          `Considera añadir Pokémon que resistan estos tipos.`
        );
      }
    }
    
    // Recomendaciones sobre formas alternativas (Mega, Gigantamax)
    const hasMegaOrGmax = team.pokemons.some(p => 
      p.form === 'mega' || p.form === 'gigantamax'
    );
    
    const hasTeracristalizacion = team.pokemons.some(p => p.role?.includes('Tera'));
    
    // Recomendaciones sobre Dynamax/Gigantamax
    if (!hasMegaOrGmax && gameMode === 'pvp') {
      const suitableDynamaxCandidates = this.findDynamaxCandidates(team);
      if (suitableDynamaxCandidates.length > 0) {
        const candidateNames = suitableDynamaxCandidates.map(p => p.pokemon.name).join(', ');
        
        analysis.recommendations.push(
          `Considera designar un Pokémon para Dinamaxizar en combate. Buenos candidatos son: ${candidateNames}. ` +
          `La mecánica Dynamax duplica los PS y permite usar movimientos Max con efectos secundarios beneficiosos.`
        );
        
        // Recomendaciones específicas sobre Max Moves
        analysis.recommendations.push(
          `Los ataques Max pueden proporcionar bonificaciones de campo: Max Airstream (+1 Velocidad), ` +
          `Max Quake (+1 Def. Esp.), Max Knuckle (+1 Ataque). Aprovéchalos para potenciar todo tu equipo.`
        );
        
        // Recomendaciones de Gigantamax para Pokémon específicos
        const gmaxCandidates = team.pokemons.filter(p => 
          ['charizard', 'lapras', 'gengar', 'snorlax', 'pikachu', 'machamp', 'coalossal'].includes(p.pokemon.name.toLowerCase())
        );
        
        if (gmaxCandidates.length > 0) {
          const gmaxNames = gmaxCandidates.map(p => p.pokemon.name).join(', ');
          analysis.recommendations.push(
            `Tienes ${gmaxNames} que pueden usar formas Gigantamax con movimientos G-Max únicos. ` +
            `Estos movimientos tienen efectos especiales como poner pantallas (G-Max Resonance de Lapras) ` +
            `o causar daño residual (G-Max Wildfire de Charizard).`
          );
        }
      }
    }
    
    // Recomendaciones sobre Teracristalización
    if (!hasTeracristalizacion && gameMode === 'pvp') {
      analysis.recommendations.push(
        `Considera asignar tipos Tera estratégicos a tus Pokémon. La Teracristalización permite cambiar el tipo ` +
        `durante el combate, ganando STAB en ese nuevo tipo y manteniendo los STAB originales si coinciden.`
      );
      
      // Sugerencias ofensivas de Teracristalización
      const physicalAttackers = team.pokemons.filter(p => 
        (p.adjustedStats?.attack || 0) > (p.adjustedStats?.['special-attack'] || 0)
      );
      
      const specialAttackers = team.pokemons.filter(p => 
        (p.adjustedStats?.['special-attack'] || 0) > (p.adjustedStats?.attack || 0)
      );
      
      if (physicalAttackers.length > 0) {
        const attackerName = physicalAttackers[0].pokemon.name;
        analysis.recommendations.push(
          `Para ${attackerName}, considera Tera Normal para potenciar movimientos como Extreme Speed o ` +
          `Tera Lucha para movimientos como Close Combat, obteniendo STAB adicional.`
        );
      }
      
      if (specialAttackers.length > 0) {
        const attackerName = specialAttackers[0].pokemon.name;
        analysis.recommendations.push(
          `Para ${attackerName}, considera Tera Hada para potenciar Moonblast o Tera Fuego para ` +
          `movimientos como Flamethrower, aumentando significativamente su poder.`
        );
      }
      
      // Sugerencias defensivas de Teracristalización
      if (analysis.teamWeaknesses.length > 0) {
        const weakness = analysis.teamWeaknesses[0].type;
        analysis.recommendations.push(
          `Para contrarrestar tu debilidad a ${weakness}, considera asignar un tipo Tera que resista o sea inmune a ${weakness}. ` +
          `Por ejemplo, Tera Fantasma para ser inmune a Lucha, o Tera Volador para ser inmune a Tierra.`
        );
      }
    }
    
    // Recomendaciones sobre combinaciones poderosas según el estudio
    const recommendPowerfulCombos = this.recommendPowerfulCombinations(team);
    if (recommendPowerfulCombos) {
      analysis.recommendations.push(recommendPowerfulCombos);
    }
    
    // Recomendaciones según el modo de juego
    if (gameMode === 'pve') {
      // Recomendaciones específicas para PvE
      analysis.weakAgainst = ['dragon', 'ghost', 'dark'].filter(type => 
        analysis.weaknesses[type] && analysis.weaknesses[type] >= 2
      );
      
      analysis.strongAgainst = ['grass', 'bug', 'electric'].filter(type => 
        analysis.resistances[type] && analysis.resistances[type] >= 2
      );
      
      // Verificar si tiene un sweeper fuerte para PvE
      const hasSweeper = analysis.teamRoles['Sweeper PvE'] > 0 || 
                         analysis.teamRoles['Atacante físico'] >= 2 || 
                         analysis.teamRoles['Atacante especial'] >= 2;
      
      if (!hasSweeper) {
        analysis.recommendations.push(
          `Para PvE, es recomendable tener al menos un Pokémon con alto poder ofensivo y velocidad ` +
          `para barrer los equipos de la IA. Considera añadir un Pokémon con estadísticas altas de ataque/velocidad.`
        );
      }
      
      // Recomendar diversidad de tipos para cobertura
      if (Object.keys(analysis.typeCount).length < 6) {
        analysis.recommendations.push(
          `Para PvE, es importante tener diversidad de tipos. Tu equipo usa ${Object.keys(analysis.typeCount).length} tipos ` +
          `diferentes. Considera añadir más variedad para mejorar la cobertura contra diferentes gimnasios.`
        );
      }
      
      // Recomendar núcleo Agua-Fuego-Planta si falta
      const hasWaterFireGrass = Boolean(analysis.typeCount['water'] && analysis.typeCount['fire'] && analysis.typeCount['grass']);
      
      if (!hasWaterFireGrass) {
        const missing = [];
        if (!analysis.typeCount['water']) missing.push('Agua');
        if (!analysis.typeCount['fire']) missing.push('Fuego');
        if (!analysis.typeCount['grass']) missing.push('Planta');
        
        analysis.recommendations.push(
          `Un núcleo Agua-Fuego-Planta es muy eficaz en PvE. Tu equipo no tiene tipos: ${missing.join(', ')}. ` +
          `Considera añadir estos tipos para mejorar el equilibrio.`
        );
      }
      
    } else {
      // Recomendaciones específicas para PvP
      analysis.weakAgainst = ['fighting', 'ground', 'fire'].filter(type => 
        analysis.weaknesses[type] && analysis.weaknesses[type] >= 2
      );
      
      analysis.strongAgainst = ['water', 'flying', 'psychic'].filter(type => 
        analysis.resistances[type] && analysis.resistances[type] >= 2
      );
      
      // Verificar balance de roles
      const hasDefensiveRole = analysis.teamRoles['Tanque físico'] > 0 || analysis.teamRoles['Tanque especial'] > 0;
      const hasOffensiveRole = analysis.teamRoles['Atacante físico'] > 0 || analysis.teamRoles['Atacante especial'] > 0;
      const hasSetupRole = analysis.teamRoles['Setup Sweeper'] > 0;
      const hasRevengeKiller = analysis.teamRoles['Revenge Killer'] > 0;
      
      if (!hasDefensiveRole) {
        analysis.recommendations.push(
          `Para PvP, es importante tener al menos un Pokémon defensivo que pueda absorber ataques. ` +
          `Tu equipo carece de tanques físicos o especiales.`
        );
      }
      
      if (!hasSetupRole && !hasRevengeKiller) {
        analysis.recommendations.push(
          `Tu equipo PvP podría beneficiarse de un Pokémon que pueda potenciarse (Setup Sweeper) ` +
          `o un Revenge Killer rápido para rematar oponentes debilitados.`
        );
      }
      
      // Verificar balance físico/especial
      const physicalAttackers = analysis.teamRoles['Atacante físico'] || 0;
      const specialAttackers = analysis.teamRoles['Atacante especial'] || 0;
      
      if (physicalAttackers >= 3 && specialAttackers <= 1) {
        analysis.recommendations.push(
          `Tu equipo depende demasiado de ataques físicos. Considera añadir más atacantes especiales ` +
          `para evitar ser bloqueado por muros físicos.`
        );
      } else if (specialAttackers >= 3 && physicalAttackers <= 1) {
        analysis.recommendations.push(
          `Tu equipo depende demasiado de ataques especiales. Considera añadir más atacantes físicos ` +
          `para evitar ser bloqueado por muros especiales.`
        );
      }
      
      // Recomendación específica para PvP sobre weather y Dynamax
      if (this.hasWeatherSetter(team)) {
        analysis.recommendations.push(
          `Tu equipo incluye Pokémon que establecen clima. Considera usar Dynamax con movimientos como ` +
          `Max Geyser (lluvia), Max Flare (sol), Max Rockfall (arena) o Max Hailstorm (granizo) ` +
          `para establecer o extender condiciones climáticas.`
        );
      }
    }
    
    // Calcular puntuación de balance general
    let balanceScore = 5;
    
    // Ajuste basado en el número de Pokémon - un equipo con pocos Pokémon no puede estar bien balanceado
    if (team.pokemons.length <= 1) {
      balanceScore = 1; // Puntaje mínimo para un solo Pokémon
    } else if (team.pokemons.length <= 2) {
      balanceScore = Math.min(balanceScore, 3); // Máximo 3/10 para 2 Pokémon
    } else if (team.pokemons.length <= 3) {
      balanceScore = Math.min(balanceScore, 5); // Máximo 5/10 para 3 Pokémon
    } else if (team.pokemons.length <= 4) {
      balanceScore = Math.min(balanceScore, 7); // Máximo 7/10 para 4 Pokémon
    } else if (team.pokemons.length <= 5) {
      balanceScore = Math.min(balanceScore, 9); // Máximo 9/10 para 5 Pokémon
    }
    
    // Ajustar puntuación con los nuevos criterios sobre mecánicas modernas
    if (hasMegaOrGmax || hasTeracristalizacion) {
      balanceScore += 1;
    }
    
    // Factores que mejoran la puntuación (pero sólo si ya tenemos suficientes Pokémon)
    if (team.pokemons.length >= 3) {
      if (Object.keys(analysis.typeCount).length >= 6) balanceScore += 1;
      if (analysis.teamStrengths.length >= 3) balanceScore += 1;
      
      // Bonus para equipos completos con buena diversidad
      if (team.pokemons.length === 6 && Object.keys(analysis.typeCount).length >= 8) {
        balanceScore += 1;
      }
    } else {
      // Si hay pocos Pokémon, los factores positivos tienen menos impacto
      if (team.pokemons.length === 6) balanceScore += 1;
      if (Object.keys(analysis.typeCount).length >= 6) balanceScore += 0.5;
      if (analysis.teamWeaknesses.length <= 2) balanceScore += 0.5;
      if (analysis.teamStrengths.length >= 3) balanceScore += 0.5;
    }
    
    // Factores que reducen la puntuación
    if (analysis.teamWeaknesses.filter(w => w.severity >= 4).length > 0) balanceScore -= 2;
    if (analysis.missingRoles.length > 3) balanceScore -= 2;
    
    // Normalizar puntuación
    analysis.balanceScore = Math.min(10, Math.max(1, balanceScore));
    
    // Establecer mensajes de balance según la puntuación
    if (analysis.balanceScore < 4) {
      analysis.recommendations.push(
        `Tu equipo tiene un balance bajo (${analysis.balanceScore}/10). Considera añadir más Pokémon y diversidad de tipos.`
      );
    } else if (analysis.balanceScore >= 8) {
      analysis.recommendations.push(
        `¡Felicidades! Tu equipo tiene un excelente balance (${analysis.balanceScore}/10).`
      );
    }
  }
  
  // Determina si el equipo tiene algún Pokémon que establezca clima
  private hasWeatherSetter(team: PokemonTeam): boolean {
    // Lista de habilidades que establecen clima
    const weatherAbilities = [
      'drought', 'drizzle', 'sand-stream', 'snow-warning',  // Habilidades de clima
      'desolate-land', 'primordial-sea', 'delta-stream'     // Clima de legendarios
    ];
    
    return team.pokemons.some(pokemon => 
      pokemon.pokemon.abilities.some(ability => 
        weatherAbilities.includes(ability.ability.name.toLowerCase())
      )
    );
  }
  
  // Encuentra candidatos adecuados para Dynamax
  private findDynamaxCandidates(team: PokemonTeam): TeamPokemon[] {
    // Los mejores candidatos para Dynamax suelen ser:
    // 1. Pokémon con buenos stats (especialmente HP alto)
    // 2. Pokémon con movimientos que tienen buenos efectos Max
    // 3. Pokémon que pueden aprovechar los boost de stats
    
    return team.pokemons.filter(pokemon => {
      const hp = pokemon.adjustedStats?.hp || 0;
      const attack = pokemon.adjustedStats?.attack || 0;
      const spAttack = pokemon.adjustedStats?.['special-attack'] || 0;
      
      // Criterion simple: Buen HP + al menos un buen stat ofensivo
      return hp >= 80 && (attack >= 90 || spAttack >= 90);
    });
  }
  
  // Proporciona recomendaciones sobre combinaciones poderosas según el estudio
  private recommendPowerfulCombinations(team: PokemonTeam): string | null {
    // Verificar si el equipo ya tiene alguna de las combinaciones mencionadas en el estudio
    
    // Chi-Yu + Flutter Mane
    const hasChiYu = team.pokemons.some(p => p.pokemon.name.toLowerCase() === 'chi-yu');
    const hasFlutterMane = team.pokemons.some(p => p.pokemon.name.toLowerCase() === 'flutter mane');
    
    if (hasChiYu && !hasFlutterMane) {
      return 'Considera añadir Flutter Mane a tu equipo: su alto poder especial se beneficia enormemente de la habilidad Cuenta Ruina de Chi-Yu, que reduce la Defensa Especial de los oponentes en un 25%.';
    }
    
    if (hasFlutterMane && !hasChiYu) {
      return 'Considera añadir Chi-Yu a tu equipo: su habilidad Cuenta Ruina reduce la Defensa Especial de los oponentes en un 25%, beneficiando enormemente a Flutter Mane.';
    }
    
    // Dondozo + Tatsugiri
    const hasDondozo = team.pokemons.some(p => p.pokemon.name.toLowerCase() === 'dondozo');
    const hasTatsugiri = team.pokemons.some(p => p.pokemon.name.toLowerCase() === 'tatsugiri');
    
    if (hasDondozo && !hasTatsugiri) {
      return 'Considera añadir Tatsugiri a tu equipo: su habilidad Commander permite a Dondozo obtener +2 en todas sus estadísticas cuando están juntos.';
    }
    
    if (hasTatsugiri && !hasDondozo) {
      return 'Considera añadir Dondozo a tu equipo: con Tatsugiri y su habilidad Commander, Dondozo obtiene +2 en todas sus estadísticas.';
    }
    
    // Sugerencias para Incineroar (muy popular en VGC)
    const hasIncineroar = team.pokemons.some(p => p.pokemon.name.toLowerCase() === 'incineroar');
    
    if (!hasIncineroar && team.pokemons.length < 6) {
      return 'Incineroar es uno de los Pokémon más utilizados en VGC gracias a su habilidad Intimidación, versatilidad de movimientos (Fake Out, Parting Shot) y buen bulk. Considera añadirlo a tu equipo para un mejor control.';
    }
    
    // Si el equipo ya tiene buenas combinaciones o no se detectan patrones claros
    return null;
  }

  // Función utilitaria para normalizar valores de estadísticas a escala 0-10
  private normalizeStatValue(value: number): number {
    // Base stats suelen estar entre 30-255, normalizar a 0-10
    return Math.min(10, Math.max(0, (value - 30) / 22.5));
  }

  /**
   * Verifica si un equipo tiene datos corruptos
   * @param team Equipo a verificar
   * @returns true si el equipo es válido, lanza un error si está corrupto
   */
  isTeamCorrupt(team: PokemonTeam): boolean {
    // Verificar si el equipo tiene las propiedades básicas
    if (!team.id || !team.name || !team.pokemons) {
      throw new Error('Estructura del equipo incompleta');
    }
    
    // Verificar que cada Pokémon tenga una estructura válida
    for (const teamPokemon of team.pokemons) {
      if (!teamPokemon.pokemon) {
        throw new Error('Datos de Pokémon incompletos');
      }
      
      // Verificar propiedades esenciales del Pokémon
      if (!teamPokemon.pokemon.id || !teamPokemon.pokemon.name || !teamPokemon.pokemon.types) {
        throw new Error('Datos de Pokémon corruptos o incompletos');
      }
      
      // Verificar tipos del Pokémon
      if (!Array.isArray(teamPokemon.pokemon.types) || teamPokemon.pokemon.types.length === 0) {
        throw new Error('Datos de tipos de Pokémon corruptos');
      }
      
      // Verificar stats del Pokémon
      if (!Array.isArray(teamPokemon.pokemon.stats) || teamPokemon.pokemon.stats.length === 0) {
        throw new Error('Datos de estadísticas del Pokémon corruptos');
      }
    }
    
    return true;
  }
  
  /**
   * Elimina un equipo corrupto por su ID
   * @param id ID del equipo corrupto a eliminar
   */
  async deleteCorruptTeam(id: string): Promise<void> {
    await this.ensureInitialized();
    
    // Eliminar el equipo corrupto
    await this.deleteTeam(id);
    
    // Guardar los cambios en el almacenamiento
    await this.saveTeams();
  }
} 