import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import {
  PREVIEW_SITES,
  PREVIEW_STUDIO,
  type PreviewSiteId,
} from '../preview.config';

@Component({
  selector: 'pv-fiverr-sidebar',
  imports: [RouterLink],
  templateUrl: './fiverr-sidebar.component.html',
  styleUrl: './fiverr-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiverrSidebarComponent {
  private readonly router = inject(Router);

  readonly open = signal(true);

  private readonly siteId = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.urlToId(this.router.url)),
      startWith(this.urlToId(this.router.url)),
    ),
    { initialValue: this.urlToId(this.router.url) },
  );

  readonly studio = PREVIEW_STUDIO;
  readonly currentSite = computed(
    () => PREVIEW_SITES.find((s) => s.id === this.siteId()) ?? PREVIEW_SITES[0],
  );
  readonly otherSites = computed(() =>
    PREVIEW_SITES.filter((s) => s.id !== this.siteId()),
  );

  readonly deploySnippet =
    'docker pull ghcr.io/struppelstrumpf/reineke.pro:latest\n' +
    'docker stop reineke-pro\n' +
    'docker rm reineke-pro\n' +
    'docker run -d --name reineke-pro -p 127.0.0.1:8080:80 --restart unless-stopped ghcr.io/struppelstrumpf/reineke.pro:latest';

  readonly deployCopied = signal(false);

  toggle(): void {
    this.open.update((v) => !v);
  }

  copyDeploySnippet(): void {
    const t = this.deploySnippet;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }
    void navigator.clipboard.writeText(t).then(() => {
      this.deployCopied.set(true);
      window.setTimeout(() => this.deployCopied.set(false), 2000);
    });
  }

  private urlToId(url: string): PreviewSiteId {
    const path = url.split('?')[0].split('#')[0];
    const seg = path.split('/').filter(Boolean)[0];
    if (seg === 'pizzeria-demo') {
      return 'pizzeria';
    }
    if (seg === 'cardealer' || seg === 'restaurant') {
      return seg;
    }
    return 'sportflow';
  }
}
