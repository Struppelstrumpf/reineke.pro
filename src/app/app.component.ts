import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FiverrSidebarComponent } from './core/fiverr-sidebar/fiverr-sidebar.component';
import { WelcomeOverlayComponent } from './core/welcome-overlay/welcome-overlay.component';

@Component({
  selector: 'pv-root',
  imports: [RouterOutlet, FiverrSidebarComponent, WelcomeOverlayComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly title = 'Reineke Fuchs — Portfolio';
}
