import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollSectionService } from '../../../../core/scroll-section.service';

@Component({
  selector: 'rt-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly scroll = inject(ScrollSectionService);

  toMenu(): void {
    this.scroll.scrollToId('menu');
  }
  readonly plates = [
    {
      name: 'Ember-roasted beets',
      line: 'Goat curd · hazelnuts · orange oil',
      price: '€14',
      img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=880&q=80',
      w: 880,
      h: 585,
    },
    {
      name: 'Oak-grilled sea bass',
      line: 'Charred lemon · fennel pollen · capers',
      price: '€29',
      img: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=880&q=80',
      w: 880,
      h: 587,
    },
    {
      name: 'Slow braised short rib',
      line: 'Red wine jus · celeriac · pickled mustard',
      price: '€32',
      img: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=880&q=80',
      w: 880,
      h: 1172,
    },
  ] as const;

  readonly visit = [
    {
      title: 'The room',
      copy: 'Brick, linen, and low light — built for conversation, not turnaround times.',
    },
    {
      title: 'The cellar',
      copy: 'Small producers, natural-leaning bottles, staff picks under €45.',
    },
    {
      title: 'The fire',
      copy: 'Most mains kiss the wood oven; vegetarians get the same heat and care.',
    },
  ] as const;
}
