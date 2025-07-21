import { Routes } from '@angular/router';
import {StartScreen} from '../game/start-screen/start-screen';
import {CreateRound} from '../game/create-round-screen/create-round';
import {AddDrinksComponent} from '../game/add-drinks/add-drinks';


export const routes: Routes = [
  { path: '', component: StartScreen },
  { path: 'create-round', component: CreateRound },
  { path: 'add-drinks/:round_code', component: AddDrinksComponent,}
];
