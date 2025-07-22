import { Routes } from '@angular/router';
import { StartScreen } from '../game/start-screen/start-screen';
import { CreateRound } from '../game/create-round-screen/create-round';
import { AddDrinksComponent } from '../game/add-drinks/add-drinks';
import {AddManually} from '../game/add-drinks-to-round/add-manually/add-manually';
import {BarcodeIsMissing} from '../game/add-drinks-to-round/barcode-is-missing/barcode-is-missing';
import {AddWithScanner} from '../game/add-drinks-to-round/add-with-scanner/add-with-scanner';
import {GamePage} from '../game/game-page/game-page';

export const routes: Routes = [
  { path: '', component: StartScreen },
  { path: 'create-round', component: CreateRound },
  { path: 'add-drinks/:round_code', component: AddDrinksComponent },
  { path: 'add-drink-manual/:round_code', component: AddManually },
  { path: 'barcode-is-missing/:round_code', component: BarcodeIsMissing },
  { path: 'add-drink-scan/:round_code', component: AddWithScanner },
  { path: 'game/:round_code', component: GamePage },
];
