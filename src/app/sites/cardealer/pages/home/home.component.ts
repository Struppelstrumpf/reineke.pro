import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollSectionService } from '../../../../core/scroll-section.service';

@Component({
  selector: 'cd-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly scroll = inject(ScrollSectionService);

  toStock(): void {
    this.scroll.scrollToId('stock');
  }
  readonly vehicles = [
    {
      name: 'Executive Saloon',
      meta: 'Hybrid · 18k km · 2023',
      price: '€41,900',
      note: 'Full dealer history, winter pack',
      img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=80',
      w: 900,
      h: 600,
    },
    {
      name: 'Performance Coupé',
      meta: 'Petrol · 32k km · 2021',
      price: '€54,500',
      note: 'Ceramic brakes, extended warranty',
      img: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=900&q=80',
      w: 900,
      h: 600,
    },
    {
      name: 'Family AWD',
      meta: 'Diesel · 48k km · 2020',
      price: '€36,200',
      note: '7 seats, tow bar, roof rails',
      img: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=900&q=80',
      w: 900,
      h: 600,
    },
  ] as const;

  readonly services = [
    {
      title: '112-point inspection',
      text: 'Brakes, drivetrain, electronics, and safety kit checked before a car is listed.',
    },
    {
      title: 'Title & finance desk',
      text: 'Part-exchange valuations, PCP and HP quotes, and clear settlement letters.',
    },
    {
      title: 'Delivery & handover',
      text: 'Number plates fitted, tank filled, Bluetooth paired — walk out ready to drive.',
    },
  ] as const;
}
