import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import player from 'lottie-web';



import { routes } from './app.routes';
import {provideLottieOptions} from 'ngx-lottie';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideLottieOptions({
      player: () => player
    })
  ]
};
