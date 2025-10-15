import { Routes } from '@angular/router';
import { TeamsPage } from './teams.page';
import { TeamDetailsComponent } from './team-details/team-details.component';

export const routes: Routes = [
  {
    path: '',
    component: TeamsPage,
  },
  {
    path: ':id',
    component: TeamDetailsComponent
  }
]; 