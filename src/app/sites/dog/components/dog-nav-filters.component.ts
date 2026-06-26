import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DOG_SPOT_EMOJI,
  DOG_SPOT_LABELS,
  type DogSpotKind,
} from '../dog.data';
import { DogExploreService } from '../dog-explore.service';
import { DogAuthService } from '../dog-auth.service';

@Component({
  selector: 'pv-dog-nav-filters',
  imports: [FormsModule],
  templateUrl: './dog-nav-filters.component.html',
  styleUrl: './dog-nav-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogNavFiltersComponent {
  readonly explore = inject(DogExploreService);
  readonly auth = inject(DogAuthService);
  readonly embedded = input(false);
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');

  readonly spotLabels = DOG_SPOT_LABELS;
  readonly spotEmoji = DOG_SPOT_EMOJI;
  readonly radiusOptions = [2, 5, 10, 15, 25];
  readonly kindKeys = Object.keys(DOG_SPOT_LABELS) as DogSpotKind[];

  readonly popupOpen = signal(false);

  readonly allKindsOn = computed(() =>
    this.kindKeys.every((k) => this.explore.filters().kinds[k]),
  );

  readonly allFiltersOn = computed(() => {
    const f = this.explore.filters();
    return this.allKindsOn() && f.ownPins && f.otherUserPins;
  });

  readonly activeFilterCount = computed(() => {
    const f = this.explore.filters();
    let count = this.kindKeys.filter((k) => f.kinds[k]).length;
    if (f.ownPins) count += 1;
    if (f.otherUserPins) count += 1;
    return count;
  });

  readonly activeKindCount = computed(
    () => this.kindKeys.filter((k) => this.explore.filters().kinds[k]).length,
  );

  togglePopup(): void {
    this.popupOpen.update((v) => !v);
  }

  closePopup(): void {
    this.popupOpen.set(false);
  }

  toggleKind(kind: DogSpotKind): void {
    this.explore.toggleKind(kind);
  }

  toggleOwnPins(): void {
    if (!this.auth.user()) return;
    this.explore.toggleOwnPins();
  }

  toggleOtherUserPins(): void {
    this.explore.toggleOtherUserPins();
  }

  setAllKinds(on: boolean): void {
    this.explore.setAllKinds(on);
  }

  onRadiusChange(value: number): void {
    this.explore.setRadius(value);
    void this.explore.reloadWithLoader();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.popupOpen()) return;
    const el = this.root()?.nativeElement;
    if (el && !el.contains(event.target as Node)) {
      this.closePopup();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closePopup();
  }
}
