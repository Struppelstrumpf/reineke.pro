import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BookingModalComponent } from './core/booking-modal/booking-modal.component';
import { BookingModalService } from './core/booking-modal/booking-modal.service';
import { DemoCodeModalComponent } from './core/demo-access/demo-code-modal.component';
import { DemoThemeService } from './core/demo-access/demo-theme.service';
import { FiverrSidebarComponent } from './core/fiverr-sidebar/fiverr-sidebar.component';
import { WelcomeOverlayComponent } from './core/welcome-overlay/welcome-overlay.component';

@Component({
  selector: 'pv-root',
  imports: [
    RouterOutlet,
    FiverrSidebarComponent,
    WelcomeOverlayComponent,
    BookingModalComponent,
    DemoCodeModalComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly title = 'Reineke GbR — Portfolio';
  readonly booking = inject(BookingModalService);
  // Initialisiert das gespeicherte Farblayout beim App-Start.
  readonly demoTheme = inject(DemoThemeService);
}
