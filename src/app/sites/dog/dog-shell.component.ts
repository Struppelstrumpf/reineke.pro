import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DogAuthComponent } from './components/dog-auth.component';
import { DogFriendsHubComponent } from './components/dog-friends-hub.component';
import { DogFriendsNavComponent } from './components/dog-friends-nav.component';
import { DogProfileSheetComponent } from './components/dog-profile-sheet.component';
import { DogAuthSheetComponent } from './components/dog-auth-sheet.component';
import { DogCookieBannerComponent } from './components/dog-cookie-banner.component';
import { DogLogoComponent } from './components/dog-logo.component';
import { DogMobileNavComponent } from './components/dog-mobile-nav.component';
import { DogNavFiltersComponent } from './components/dog-nav-filters.component';
import { DogPetWidgetComponent } from './components/dog-pet-widget.component';
import { DogSearchLoaderComponent } from './components/dog-search-loader.component';
import { DogPinFabComponent } from './components/dog-pin-fab.component';
import { DogAddressSearchComponent } from './components/dog-address-search.component';
import { DogThemeToggleComponent } from './components/dog-theme-toggle.component';
import { DogExploreService } from './dog-explore.service';
import { DogMobileService } from './dog-mobile.service';
import { DogThemeService } from './dog-theme.service';

@Component({
  selector: 'pv-dog-shell',
  imports: [
    RouterOutlet,
    DogLogoComponent,
    DogNavFiltersComponent,
    DogSearchLoaderComponent,
    DogThemeToggleComponent,
    DogPetWidgetComponent,
    DogCookieBannerComponent,
    DogAuthComponent,
    DogAuthSheetComponent,
    DogFriendsNavComponent,
    DogFriendsHubComponent,
    DogProfileSheetComponent,
    DogPinFabComponent,
    DogAddressSearchComponent,
    DogMobileNavComponent,
  ],
  templateUrl: './dog-shell.component.html',
  styleUrls: ['./dog-shell.component.scss', './dog-shared.scss'],
  host: {
    '[attr.data-dog-theme]': 'theme.mode()',
    '[class.dog-shell--panel-collapsed]': '!explore.panelOpen()',
    '[class.dog-shell--mobile]': 'mobile.isMobile()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogShellComponent {
  readonly theme = inject(DogThemeService);
  readonly explore = inject(DogExploreService);
  readonly mobile = inject(DogMobileService);

  search(): void {
    void this.explore.searchAddress();
  }

  locate(): void {
    void this.explore.locateUser();
  }
}
