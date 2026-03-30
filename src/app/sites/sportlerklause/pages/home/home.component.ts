import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollSectionService } from '../../../../core/scroll-section.service';

@Component({
  selector: 'sk-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly scroll = inject(ScrollSectionService);

  toMenus(): void {
    this.scroll.scrollToId('menus');
  }

  readonly plates = [
    {
      name: 'Hausgemachter Bratklops',
      line: 'Zwei Spiegeleier · Brötchen · kleine Salatbeilage',
      price: '€8,90',
      img: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=880&q=80',
      w: 880,
      h: 587,
    },
    {
      name: 'Jägerschnitzel (Tagesempfehlung)',
      line: 'Pilzrahm · Kroketten oder Pommes',
      price: '€12,50',
      img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=880&q=80',
      w: 880,
      h: 585,
    },
    {
      name: 'Frische Salatteller',
      line: 'Saisonal · dazu Brot & Kräuteröl',
      price: 'ab €7,20',
      img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=880&q=80',
      w: 880,
      h: 1170,
    },
  ] as const;

  readonly hourBlocks: ReadonlyArray<{
    title: string;
    lines: readonly string[];
    muted?: boolean;
  }> = [
    {
      title: 'Montag – Donnerstag',
      lines: ['7:00 – 14:00 Uhr', 'Küche schließt 13:30 Uhr'],
    },
    {
      title: 'Freitag',
      lines: ['7:00 – 13:00 Uhr', 'Küche schließt 12:00 Uhr'],
    },
    {
      title: 'Wochenende',
      lines: ['Samstag, Sonntag & Feiertag geschlossen'],
      muted: true,
    },
  ];

  readonly spots = [
    {
      title: 'Biergarten',
      copy: 'Wenn die Sonne auf den Harz fällt: draußen sitzen, drinnen bestellen — so stellt man sich den Feierabend vor.',
    },
    {
      title: 'Vereinsfeiern',
      copy: 'Ab 10 Personen öffnen wir gern auch abends oder am Wochenende — von der Grillrunde bis zur Familienfeier.',
    },
    {
      title: 'Welterbe vor der Tür',
      copy: 'Quedlinburg ist nur einen Spaziergang entfernt — ideal für Gäste, die Stadt & Stulle kombinieren wollen.',
    },
  ] as const;
}
