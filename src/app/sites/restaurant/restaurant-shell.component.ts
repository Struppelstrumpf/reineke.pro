import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './layout/footer/footer.component';
import { HeaderComponent } from './layout/header/header.component';

@Component({
  selector: 'pv-restaurant-shell',
  imports: [HeaderComponent, FooterComponent, RouterOutlet],
  template: `
    <div class="site-body site-body--restaurant">
      <rt-header />
      <main id="main-content" class="site-main" tabindex="-1">
        <router-outlet />
      </main>
      <rt-footer />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .site-main {
      flex: 1 1 auto;
      min-width: 0;
      width: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantShellComponent {}
