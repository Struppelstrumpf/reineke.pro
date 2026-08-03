import { Routes } from '@angular/router';
import { ZauberfuchsShellComponent } from './zauberfuchs-shell.component';
import { ZfHomeComponent } from './pages/home/home.component';

/**
 * Standalone-Domain: Shell + Home in einem Chunk (kein Doppel-Lazy-Waterfall).
 */
export const ZAUBERFUCHS_HOST_ROUTES: Routes = [
  {
    path: '',
    component: ZauberfuchsShellComponent,
    children: [
      { path: '', component: ZfHomeComponent },
      {
        path: 'abo',
        loadComponent: () => import('./pages/abo/abo.component').then((m) => m.ZfAboComponent),
      },
      {
        path: 'briefe',
        loadComponent: () =>
          import('./pages/briefe/briefe.component').then((m) => m.ZfBriefeComponent),
      },
      {
        path: 'shop',
        loadComponent: () => import('./pages/shop/shop.component').then((m) => m.ZfShopComponent),
      },
      {
        path: 'impressum',
        loadComponent: () =>
          import('./pages/impressum/impressum.component').then((m) => m.ZfImpressumComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
