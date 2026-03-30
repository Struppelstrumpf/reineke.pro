import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sportflow' },
  {
    path: 'sportflow',
    loadComponent: () =>
      import('./sites/sportflow/sportflow-shell.component').then((m) => m.SportflowShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./sites/sportflow/pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./sites/sportflow/pages/contact/contact.component').then((m) => m.ContactComponent),
      },
      {
        path: 'imprint',
        loadComponent: () =>
          import('./sites/sportflow/pages/imprint/imprint.component').then((m) => m.ImprintComponent),
      },
    ],
  },
  {
    path: 'cardealer',
    loadComponent: () =>
      import('./sites/cardealer/cardealer-shell.component').then((m) => m.CardealerShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./sites/cardealer/pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./sites/cardealer/pages/contact/contact.component').then((m) => m.ContactComponent),
      },
      {
        path: 'imprint',
        loadComponent: () =>
          import('./sites/cardealer/pages/imprint/imprint.component').then((m) => m.ImprintComponent),
      },
    ],
  },
  {
    path: 'restaurant',
    loadComponent: () =>
      import('./sites/restaurant/restaurant-shell.component').then((m) => m.RestaurantShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./sites/restaurant/pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./sites/restaurant/pages/contact/contact.component').then((m) => m.ContactComponent),
      },
      {
        path: 'imprint',
        loadComponent: () =>
          import('./sites/restaurant/pages/imprint/imprint.component').then((m) => m.ImprintComponent),
      },
    ],
  },
  {
    path: 'sportlerklause',
    loadComponent: () =>
      import('./sites/sportlerklause/sportlerklause-shell.component').then(
        (m) => m.SportlerklauseShellComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./sites/sportlerklause/pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./sites/sportlerklause/pages/contact/contact.component').then((m) => m.ContactComponent),
      },
      {
        path: 'imprint',
        loadComponent: () =>
          import('./sites/sportlerklause/pages/imprint/imprint.component').then((m) => m.ImprintComponent),
      },
    ],
  },
  {
    path: 'pizzeria-demo',
    loadComponent: () =>
      import('./core/pizzeria-demo-embed/pizzeria-demo-embed.component').then(
        (m) => m.PizzeriaDemoEmbedComponent,
      ),
  },
  { path: '**', redirectTo: 'sportflow' },
];
