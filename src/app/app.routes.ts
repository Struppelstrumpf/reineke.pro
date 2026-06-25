import { Routes } from '@angular/router';



export const routes: Routes = [

  { path: '', pathMatch: 'full', redirectTo: 'pizzeria-demo' },

  {

    path: 'pizzeria-demo',

    loadComponent: () =>

      import('./core/pizzeria-demo-embed/pizzeria-demo-embed.component').then(

        (m) => m.PizzeriaDemoEmbedComponent,

      ),

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

          import('./sites/weisser-schaefer/pages/shop/shop.component').then(

            (m) => m.WsShopComponent,

          ),

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

          import('./sites/weisser-schaefer/pages/login/login.component').then(

            (m) => m.WsLoginComponent,

          ),

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

          import('./sites/weisser-schaefer/pages/shop/shop.component').then(

            (m) => m.WsShopComponent,

          ),

      },

      {

        path: 'verwaltung',

        loadComponent: () =>

          import('./sites/weisser-schaefer/pages/admin/admin.component').then(

            (m) => m.WsAdminComponent,

          ),

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

