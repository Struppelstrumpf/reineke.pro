import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollSectionService } from '../../../../core/scroll-section.service';

@Component({
  selector: 'sf-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly scroll = inject(ScrollSectionService);

  toProducts(): void {
    this.scroll.scrollToId('products');
  }
  readonly products = [
    {
      name: 'Pulse 750',
      tag: 'All-day carry',
      price: '€28',
      desc: 'Double-wall stainless steel, 24h cold / 12h hot. Soft-touch powder coat.',
      img: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
      width: 800,
      height: 1000,
    },
    {
      name: 'Aero Straw Pro',
      tag: 'Gym & studio',
      price: '€24',
      desc: 'One-hand flip straw, leak-lock valve, fits standard cup holders.',
      img: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=80',
      width: 800,
      height: 1200,
    },
    {
      name: 'Trail Wide 1L',
      tag: 'Outdoor',
      price: '€32',
      desc: 'Wide mouth for ice, powder-coated grip ring, carabiner-ready loop.',
      img: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=800&q=80',
      width: 800,
      height: 1000,
    },
  ] as const;

  readonly features = [
    {
      title: 'Temperature locked',
      text: 'Vacuum insulation keeps drinks at target temp through long sessions.',
    },
    {
      title: 'Leak-tested',
      text: 'Every lid is pressure-checked before it ships — gym bag safe.',
    },
    {
      title: 'BPA-free materials',
      text: 'Food-grade steel and silicone. No plastic taste, easy to clean.',
    },
  ] as const;
}
