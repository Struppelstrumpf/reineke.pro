import { Routes } from '@angular/router';
import { isZauberfuchsHost } from './core/site-host';

const zauberfuchsChildren: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./sites/zauberfuchs/pages/home/home.component').then((m) => m.ZfHomeComponent),
  },
  {
    path: 'abo',
    loadComponent: () =>
      import('./sites/zauberfuchs/pages/abo/abo.component').then((m) => m.ZfAboComponent),
  },
  {
    path: 'briefe',
    loadComponent: () =>
      import('./sites/zauberfuchs/pages/briefe/briefe.component').then((m) => m.ZfBriefeComponent),
  },
  {
    path: 'shop',
    loadComponent: () =>
      import('./sites/zauberfuchs/pages/shop/shop.component').then((m) => m.ZfShopComponent),
  },
  {
    path: 'impressum',
    loadComponent: () =>
      import('./sites/zauberfuchs/pages/impressum/impressum.component').then(
        (m) => m.ZfImpressumComponent,
      ),
  },
];

const zauberfuchsShellLoad = () =>
  import('./sites/zauberfuchs/zauberfuchs-shell.component').then((m) => m.ZauberfuchsShellComponent);

/** Eigenständige Domain zauberfuchs.net — ohne Portfolio. */
const zauberfuchsHostRoutes: Routes = [
  {
    path: '',
    loadComponent: zauberfuchsShellLoad,
    children: zauberfuchsChildren,
  },
  { path: '**', redirectTo: '' },
];

const portfolioRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pizzeria-demo' },

  {
    path: 'pizzeria-demo',
    loadComponent: () =>
      import('./core/pizzeria-demo-embed/pizzeria-demo-embed.component').then(
        (m) => m.PizzeriaDemoEmbedComponent,
      ),
  },

  {
    path: 'demo/nasebaer',
    loadComponent: () =>
      import('./sites/dog/dog-shell.component').then((m) => m.DogShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./sites/dog/pages/explore/explore.component').then((m) => m.DogExploreComponent),
      },
      {
        path: 'datenschutz',
        loadComponent: () =>
          import('./sites/dog/pages/datenschutz/datenschutz.component').then(
            (m) => m.DogDatenschutzComponent,
          ),
      },
      {
        path: 'auth/callback',
        loadComponent: () =>
          import('./sites/dog/pages/auth-callback/auth-callback.component').then(
            (m) => m.DogAuthCallbackComponent,
          ),
      },
    ],
  },
  { path: 'demo/pfotenatlas', redirectTo: 'demo/nasebaer', pathMatch: 'full' },
  { path: 'demo/nasenbaer', redirectTo: 'demo/nasebaer', pathMatch: 'full' },
  { path: 'demo/dog', redirectTo: 'demo/nasebaer', pathMatch: 'full' },

  {
    path: 'demo/fusswerk',
    loadComponent: () =>
      import('./sites/fusswerk/fusswerk-shell.component').then((m) => m.FusswerkShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./sites/fusswerk/pages/home/home.component').then((m) => m.FwHomeComponent),
      },
      {
        path: 'termin-bestaetigen',
        loadComponent: () =>
          import('./sites/fusswerk/pages/confirm/confirm.component').then((m) => m.FwConfirmComponent),
      },
      {
        path: 'studio',
        loadComponent: () =>
          import('./sites/fusswerk/pages/studio/studio.component').then((m) => m.FwStudioComponent),
      },
      {
        path: 'angebot',
        loadComponent: () =>
          import('./sites/fusswerk/pages/angebot/angebot.component').then((m) => m.FwAngebotComponent),
      },
      {
        path: 'impressum',
        loadComponent: () =>
          import('./sites/fusswerk/pages/impressum/impressum.component').then(
            (m) => m.FwImpressumComponent,
          ),
      },
      {
        path: 'datenschutz',
        loadComponent: () =>
          import('./sites/fusswerk/pages/impressum/datenschutz.component').then(
            (m) => m.FwDatenschutzComponent,
          ),
      },
    ],
  },

  {
    path: 'demo/zauberfuchs',
    loadComponent: zauberfuchsShellLoad,
    children: zauberfuchsChildren,
  },

  {
    path: 'demo/weisser-schaefer',
    loadComponent: () =>
      import('./sites/weisser-schaefer/weisser-schaefer-shell.component').then(
        (m) => m.WeisserSchaeferShellComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./sites/weisser-schaefer/pages/shop/shop.component').then((m) => m.WsShopComponent),
      },
      {
        path: 'start',
        loadComponent: () =>
          import('./sites/weisser-schaefer/pages/landing/landing.component').then(
            (m) => m.WsLandingComponent,
          ),
      },
      {
        path: 'anmelden',
        loadComponent: () =>
          import('./sites/weisser-schaefer/pages/login/login.component').then((m) => m.WsLoginComponent),
      },
      {
        path: 'registrieren',
        loadComponent: () =>
          import('./sites/weisser-schaefer/pages/register/register.component').then(
            (m) => m.WsRegisterComponent,
          ),
      },
      {
        path: 'passwort-vergessen',
        loadComponent: () =>
          import('./sites/weisser-schaefer/pages/forgot-password/forgot-password.component').then(
            (m) => m.WsForgotPasswordComponent,
          ),
      },
      {
        path: 'passwort-reset',
        loadComponent: () =>
          import('./sites/weisser-schaefer/pages/reset-password/reset-password.component').then(
            (m) => m.WsResetPasswordComponent,
          ),
      },
      {
        path: 'konto-aktivieren',
        loadComponent: () =>
          import('./sites/weisser-schaefer/pages/activate-account/activate-account.component').then(
            (m) => m.WsActivateAccountComponent,
          ),
      },
      {
        path: 'konto',
        loadComponent: () =>
          import('./sites/weisser-schaefer/pages/account/account.component').then(
            (m) => m.WsAccountComponent,
          ),
      },
      {
        path: 'shop',
        loadComponent: () =>
          import('./sites/weisser-schaefer/pages/shop/shop.component').then((m) => m.WsShopComponent),
      },
      {
        path: 'verwaltung',
        loadComponent: () =>
          import('./sites/weisser-schaefer/pages/admin/admin.component').then((m) => m.WsAdminComponent),
      },
      {
        path: 'impressum',
        loadComponent: () =>
          import('./sites/weisser-schaefer/pages/impressum/impressum.component').then(
            (m) => m.WsImpressumComponent,
          ),
      },
      {
        path: 'datenschutz',
        loadComponent: () =>
          import('./sites/weisser-schaefer/pages/datenschutz/datenschutz.component').then(
            (m) => m.WsDatenschutzComponent,
          ),
      },
      { path: 'inhaber', redirectTo: 'verwaltung', pathMatch: 'full' },
    ],
  },

  // Deactivated portfolio demos — sources remain under src/app/sites/
  { path: 'sportflow', redirectTo: 'pizzeria-demo', pathMatch: 'prefix' },
  { path: 'cardealer', redirectTo: 'pizzeria-demo', pathMatch: 'prefix' },
  { path: 'restaurant', redirectTo: 'pizzeria-demo', pathMatch: 'prefix' },
  { path: 'sportlerklause', redirectTo: 'pizzeria-demo', pathMatch: 'prefix' },
  { path: '**', redirectTo: 'pizzeria-demo' },
];

export const routes: Routes = isZauberfuchsHost() ? zauberfuchsHostRoutes : portfolioRoutes;
