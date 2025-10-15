import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { TeamsPage } from './teams.page';
import { routes } from './teams.routes';
import { TeamDetailsComponent } from './team-details/team-details.component';
import { PokemonSelectorModalComponent } from './pokemon-selector-modal/pokemon-selector-modal.component';
import { ConfirmActionModalComponent } from './confirm-action-modal/confirm-action-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    // Componentes standalone
    TeamsPage,
    TeamDetailsComponent,
    PokemonSelectorModalComponent,
    ConfirmActionModalComponent
  ]
})
export class TeamsPageModule {} 