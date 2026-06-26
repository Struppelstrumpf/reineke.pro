import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  viewChild,
} from '@angular/core';
import { DogAuthService } from '../dog-auth.service';
import { DogSocialService } from '../dog-social.service';

@Component({
  selector: 'pv-dog-auth',
  imports: [],
  templateUrl: './dog-auth.component.html',
  styleUrl: './dog-auth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogAuthComponent {
  readonly auth = inject(DogAuthService);
  readonly social = inject(DogSocialService);
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');

  toggleAccountMenu(event: Event): void {
    event.stopPropagation();
    if (this.auth.user()) {
      this.auth.menuOpen.update((v) => !v);
      return;
    }
    this.auth.openSheet('login');
  }

  openLogin(): void {
    this.auth.openSheet('login');
  }

  openProfile(): void {
    this.auth.menuOpen.set(false);
    this.social.openProfile();
  }

  logout(): void {
    void this.auth.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.auth.menuOpen()) {
      const el = this.root()?.nativeElement;
      if (el && !el.contains(event.target as Node)) {
        this.auth.menuOpen.set(false);
      }
    }
  }
}
