import { Routes } from '@angular/router';
import { StartScreen } from '../game/start-screen/start-screen';
import { CreateRound } from '../game/create-round-screen/create-round';
import { AddDrinksComponent } from '../game/add-drinks/add-drinks';
import {AddManually} from '../game/add-drinks-to-round/add-manually/add-manually';
import {BarcodeIsMissing} from '../game/add-drinks-to-round/barcode-is-missing/barcode-is-missing';
import {AddWithScanner} from '../game/add-drinks-to-round/add-with-scanner/add-with-scanner';
import {GamePage} from '../game/game-page/game-page';
import {HitTeam1} from '../game/game-page/hit-team1/hit-team1';
import {HitTeam2} from '../game/game-page/hit-team2/hit-team2';
import {
  AnimationScreenStartRound
} from '../animation-screens/animation-screen-start-round/animation-screen-start-round';
import {AnimationScreenTask} from '../animation-screens/animation-screen-task/animation-screen-task';
import {
  AnimationScreenDrinkMixAndAmount
} from '../animation-screens/animation-screen-drink-mix-and-amount/animation-screen-drink-mix-and-amount';
import {AnimationScreenHit} from '../animation-screens/animation-screen-hit/animation-screen-hit';
import {TaskScreen} from '../game/game-page/task-screen/task-screen';
import {DrinkScreen} from '../game/game-page/drink-screen/drink-screen';
import {GameCountdown} from '../game/game-page/game-countdown/game-countdown';
import {RoundEnd} from '../game/round-end/round-end';
import {SettingsPage} from '../game/settings-page/settings-page';
import {Impressum} from './impressum/impressum';

export const routes: Routes = [
  { path: '', component: StartScreen },
  { path: 'create-round', component: CreateRound },
  { path: 'add-drinks/:round_code', component: AddDrinksComponent },
  { path: 'add-drink-manual/:round_code', component: AddManually },
  { path: 'barcode-is-missing/:round_code', component: BarcodeIsMissing },
  { path: 'add-drink-scan/:round_code', component: AddWithScanner },
  { path: 'game/:round_code', component: GamePage },
  { path: 'hit-team1/:round_code', component: HitTeam1},
  { path: 'hit-team2/:round_code', component: HitTeam2},
  { path: 'animation/start-round/:round_code', component:  AnimationScreenStartRound},
  { path: 'animation/task/:team/:round_code', component:  AnimationScreenTask},
  { path: 'animation/drink-mix-and-amount/:team/:round_code/:task_id', component: AnimationScreenDrinkMixAndAmount },
  { path: 'animation-hit/:team/:round_code', component: AnimationScreenHit },
  { path: 'task/:team/:round_code', component:  TaskScreen},
  { path: 'drink/:team/:round_code/:task_id', component: DrinkScreen },
  { path: 'game-countdown/:team/:round_code/:task_id', component: GameCountdown },
  { path: 'round-end/:team/:round_code', component: RoundEnd },
  { path: 'settings/:round_code', component: SettingsPage },
  { path: 'impressum', component: Impressum },

];
