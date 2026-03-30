import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Vollflächige Einbettung der statischen Demo unter /pizzeria-demo/index.html (public/).
 * Keine echten Geschäftsdaten — reines Portfolio-Showcase.
 */
@Component({
  selector: 'pv-pizzeria-demo-embed',
  template: `
    <iframe
      class="pizzeria-demo-frame"
      title="Pizzeria-Landingpage — Portfolio-Design-Demo (fiktive Daten)"
      src="/pizzeria-demo/index.html"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
    ></iframe>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100dvh;
        min-height: 100dvh;
        background: #0a0a0a;
      }

      .pizzeria-demo-frame {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
      }
    `,
  ],
  host: { class: 'site-body--pizzeria' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PizzeriaDemoEmbedComponent {}
