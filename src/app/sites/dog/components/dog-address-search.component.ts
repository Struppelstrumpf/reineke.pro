import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DogExploreService } from '../dog-explore.service';
import { DogGeocodeService, type DogAddressSuggestion } from '../dog-geocode.service';

@Component({
  selector: 'pv-dog-address-search',
  templateUrl: './dog-address-search.component.html',
  styleUrl: './dog-address-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogAddressSearchComponent {
  readonly mobile = input(false);
  readonly searchRequested = output<void>();

  readonly explore = inject(DogExploreService);
  private readonly geocode = inject(DogGeocodeService);
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');

  readonly suggestions = signal<DogAddressSuggestion[]>([]);
  readonly dropdownOpen = signal(false);
  readonly loadingSuggestions = signal(false);
  readonly activeIndex = signal(-1);

  private debounceTimer = 0;
  private requestSeq = 0;

  onInput(value: string): void {
    this.explore.addressQuery.set(value);
    this.activeIndex.set(-1);
    window.clearTimeout(this.debounceTimer);
    if (value.trim().length < 2) {
      this.suggestions.set([]);
      this.dropdownOpen.set(false);
      this.loadingSuggestions.set(false);
      return;
    }
    this.loadingSuggestions.set(true);
    this.dropdownOpen.set(true);
    this.debounceTimer = window.setTimeout(() => void this.fetchSuggestions(value.trim()), 280);
  }

  onFocus(): void {
    if (this.suggestions().length) {
      this.dropdownOpen.set(true);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    const items = this.suggestions();
    if (!this.dropdownOpen() || !items.length) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.submitSearch();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((i) => (i + 1) % items.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((i) => (i <= 0 ? items.length - 1 : i - 1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.activeIndex();
      if (idx >= 0 && items[idx]) {
        this.pick(items[idx]);
      } else {
        this.submitSearch();
      }
      return;
    }
    if (event.key === 'Escape') {
      this.closeDropdown();
    }
  }

  pick(item: DogAddressSuggestion): void {
    this.explore.addressQuery.set(item.label);
    this.closeDropdown();
    void this.explore.goToCoordinates(item.lat, item.lng);
  }

  submitSearch(): void {
    this.closeDropdown();
    this.searchRequested.emit();
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
    this.activeIndex.set(-1);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const el = this.root()?.nativeElement;
    if (el && !el.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  private async fetchSuggestions(query: string): Promise<void> {
    const seq = ++this.requestSeq;
    const items = await this.geocode.suggest(query);
    if (seq !== this.requestSeq) return;
    this.suggestions.set(items);
    this.loadingSuggestions.set(false);
    this.dropdownOpen.set(items.length > 0);
  }
}
