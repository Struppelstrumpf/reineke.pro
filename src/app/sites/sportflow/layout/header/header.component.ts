import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ScrollSectionService } from '../../../../core/scroll-section.service';

@Component({
  selector: 'sf-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly scroll = inject(ScrollSectionService);

  readonly menuOpen = signal(false);

  /** Base path for this site in the combined app */
  readonly base = '/sportflow' as const;

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  goSection(sectionId: string): void {
    this.closeMenu();
    const path = this.router.url.split('?')[0].split('#')[0].replace(/\/$/, '');
    const home = this.base;
    if (path === home || path === `${home}/`) {
      this.scroll.scrollToId(sectionId);
      return;
    }
    void this.router.navigateByUrl(home).then(() => {
      this.scroll.scrollToId(sectionId, 160);
    });
  }
}
