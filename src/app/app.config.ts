import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { WsBackendSyncService } from './sites/weisser-schaefer/ws-backend-sync.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [WsBackendSyncService],
      useFactory: (sync: WsBackendSyncService) => () => sync.init(),
    },
  ],
};
