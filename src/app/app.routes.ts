import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';

// Auth
import { AuthPage } from '../auth/auth-page/auth-page';

// Dashboard & Game Management
import { DashboardPage } from '../dashboard/dashboard';
import { CreateGamePage } from '../game/create-game/create-game';
import { GameOverviewPage } from '../game/game-overview/game-overview';

// Round setup
import { CreateRoundPage } from '../game/create-round-screen/create-round';
import { AddDrinksComponent } from '../game/add-drinks/add-drinks';
import { AddManually } from '../game/add-drinks-to-round/add-manually/add-manually';
import { BarcodeIsMissing } from '../game/add-drinks-to-round/barcode-is-missing/barcode-is-missing';
import { AddWithScanner } from '../game/add-drinks-to-round/add-with-scanner/add-with-scanner';

// Gameplay
import { GamePage } from '../game/game-page/game-page';
import { HitPage } from '../game/game-page/hit-page/hit-page';
import { TaskScreen } from '../game/game-page/task-screen/task-screen';
import { DrinkScreen } from '../game/game-page/drink-screen/drink-screen';
import { GameCountdown } from '../game/game-page/game-countdown/game-countdown';
import { RoundEnd } from '../game/round-end/round-end';
import { SettingsPage } from '../game/settings-page/settings-page';

// Animations
import { AnimationScreenStartRound } from '../animation-screens/animation-screen-start-round/animation-screen-start-round';
import { AnimationScreenTask } from '../animation-screens/animation-screen-task/animation-screen-task';
import { AnimationScreenHit } from '../animation-screens/animation-screen-hit/animation-screen-hit';
import { AnimationScreenDrinkMixAndAmount } from '../animation-screens/animation-screen-drink-mix-and-amount/animation-screen-drink-mix-and-amount';

// Misc
import { Impressum } from './impressum/impressum';

export const routes: Routes = [
  // Public
  { path: 'login', component: AuthPage },
  { path: 'impressum', component: Impressum },

  // Protected: default redirect
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Protected: Dashboard & game management
  { path: 'dashboard',                          component: DashboardPage,       canActivate: [authGuard] },
  { path: 'game/new',                           component: CreateGamePage,      canActivate: [authGuard] },
  { path: 'game/:gameId',                       component: GameOverviewPage,    canActivate: [authGuard] },

  // Protected: Round setup
  { path: 'game/:gameId/round/new',                             component: CreateRoundPage,     canActivate: [authGuard] },
  { path: 'game/:gameId/round/:roundId/add-drinks',             component: AddDrinksComponent,  canActivate: [authGuard] },
  { path: 'game/:gameId/round/:roundId/add-drink-manual',       component: AddManually,         canActivate: [authGuard] },
  { path: 'game/:gameId/round/:roundId/add-drink-scan',         component: AddWithScanner,      canActivate: [authGuard] },
  { path: 'game/:gameId/round/:roundId/barcode-missing',        component: BarcodeIsMissing,    canActivate: [authGuard] },

  // Protected: Gameplay
  { path: 'game/:gameId/round/:roundId/play',                            component: GamePage,       canActivate: [authGuard] },
  { path: 'game/:gameId/round/:roundId/hit/:team',                       component: HitPage,        canActivate: [authGuard] },
  { path: 'game/:gameId/round/:roundId/task/:team',                      component: TaskScreen,     canActivate: [authGuard] },
  { path: 'game/:gameId/round/:roundId/drink/:team/:taskId',             component: DrinkScreen,    canActivate: [authGuard] },
  { path: 'game/:gameId/round/:roundId/countdown/:team/:taskId',         component: GameCountdown,  canActivate: [authGuard] },
  { path: 'game/:gameId/round/:roundId/end/:team',                       component: RoundEnd,       canActivate: [authGuard] },
  { path: 'game/:gameId/round/:roundId/settings',                        component: SettingsPage,   canActivate: [authGuard] },

  // Protected: Animations (carry gameId + roundId for the next navigation)
  { path: 'animation/start-round/:gameId/:roundId',                     component: AnimationScreenStartRound,         canActivate: [authGuard] },
  { path: 'animation/task/:team/:gameId/:roundId',                      component: AnimationScreenTask,               canActivate: [authGuard] },
  { path: 'animation/hit/:team/:gameId/:roundId',                       component: AnimationScreenHit,                canActivate: [authGuard] },
  { path: 'animation/drink/:team/:gameId/:roundId/:taskId',             component: AnimationScreenDrinkMixAndAmount,  canActivate: [authGuard] },
];
