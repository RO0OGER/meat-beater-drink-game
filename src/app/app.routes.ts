import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';

// Auth
import { AuthPage } from '../auth/auth-page/auth-page';

// Start screen
import { StartScreen } from '../start-screen/start-screen';

// Dashboard
import { DashboardPage } from '../dashboard/dashboard';

// Round setup
import { CreateRoundPage } from '../game/create-round-screen/create-round';
import { AddDrinksComponent } from '../game/add-drinks/add-drinks';
import { AddManually } from '../game/add-drinks-to-round/add-manually/add-manually';
import { AddWithScanner } from '../game/add-drinks-to-round/add-with-scanner/add-with-scanner';

// Round management
import { RoundEnd } from '../game/round-end/round-end';
import { SettingsPage } from '../game/settings-page/settings-page';

// Multiplayer (public – no auth required)
import { JoinRoundPage } from '../game/join-round/join-round';
import { RoundLobbyPage } from '../game/round-lobby/round-lobby';
import { PlayerGameView } from '../game/player-game-view/player-game-view';

// Misc
import { Impressum } from './impressum/impressum';

export const routes: Routes = [
  // Public
  { path: 'login',                       component: AuthPage },
  { path: 'impressum',                   component: Impressum },
  { path: 'join/:roundCode',             component: JoinRoundPage },
  { path: 'round/:roundId/lobby',        component: RoundLobbyPage },
  { path: 'round/:roundId/personal',     component: PlayerGameView },

  // Start screen
  { path: '', component: StartScreen, pathMatch: 'full' },

  // Protected: Dashboard
  { path: 'dashboard',                   component: DashboardPage,    canActivate: [authGuard] },

  // Protected: Round setup
  { path: 'game/:gameId/round/new',                           component: CreateRoundPage,   canActivate: [authGuard] },
  { path: 'game/:gameId/round/:roundId/add-drinks',           component: AddDrinksComponent },
  { path: 'game/:gameId/round/:roundId/add-drink-manual',     component: AddManually },
  { path: 'game/:gameId/round/:roundId/add-drink-scan',       component: AddWithScanner },

  // Protected: Round management
  { path: 'game/:gameId/round/:roundId/end',                  component: RoundEnd,          canActivate: [authGuard] },
  { path: 'game/:gameId/round/:roundId/settings',             component: SettingsPage,      canActivate: [authGuard] },
];
