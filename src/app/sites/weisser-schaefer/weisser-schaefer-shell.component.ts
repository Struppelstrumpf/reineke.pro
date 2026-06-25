import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { WsLogoComponent } from './components/ws-logo.component';
import { WsLabelPreviewComponent } from './components/ws-label-preview.component';
import { WsSupportChatWidgetComponent } from './components/ws-support-chat-widget.component';
import { WeisserSchaeferAuthService } from './weisser-schaefer-auth.service';
import { WeisserSchaeferAutoPrintService } from './weisser-schaefer-auto-print.service';
import { WeisserSchaeferInventoryService } from './weisser-schaefer-inventory.service';
import { WeisserSchaeferPrintService } from './weisser-schaefer-print.service';
import { WeisserSchaeferSessionService } from './weisser-schaefer-session.service';
import { WeisserSchaeferStockAlertService } from './weisser-schaefer-stock-alert.service';
import { WeisserSchaeferChatService } from './weisser-schaefer-chat.service';
import { buildWsLabelPages } from './ws-label-layout';

type WsCookiePrefs = {
  essential: true;
  statistics: boolean;
  marketing: boolean;
  updatedAt: string;
};

const WS_COOKIE_PREFS_KEY = 'ws-cookie-prefs-v1';

@Component({
  selector: 'pv-weisser-schaefer-shell',
  imports: [
    NgTemplateOutlet,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    WsLogoComponent,
    WsLabelPreviewComponent,
    WsSupportChatWidgetComponent,
  ],
  templateUrl: './weisser-schaefer-shell.component.html',
  styleUrls: ['./weisser-schaefer-shell.component.scss', './ws-shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeisserSchaeferShellComponent {
  readonly auth = inject(WeisserSchaeferAuthService);
  readonly session = inject(WeisserSchaeferSessionService);
  readonly print = inject(WeisserSchaeferPrintService);
  private readonly autoPrint = inject(WeisserSchaeferAutoPrintService);
  private readonly inventory = inject(WeisserSchaeferInventoryService);
  readonly chat = inject(WeisserSchaeferChatService);
  private readonly stockAlerts = inject(WeisserSchaeferStockAlertService);
  private readonly router = inject(Router);
  private staffChatNotifyInitialized = false;
  private readonly lastStaffMessageIds = new Map<string, string>();

  readonly mobileNavOpen = signal(false);
  readonly printing = signal(false);
  readonly cookieBannerOpen = signal(false);
  readonly cookieSettingsOpen = signal(false);
  readonly cookieStats = signal(false);
  readonly cookieMarketing = signal(false);

  readonly contactPhoneLabel = '+49 421 809 72 14';
  readonly contactPhoneHref = 'tel:+494218097214';
  readonly contactMail = 'vertrieb@weisser-schaefer.de';
  readonly googleReviewsUrl =
    'https://www.google.com/search?q=weisser+sch%C3%A4fer+naturdarm+bremen';
  readonly googleRatingText = '4,9 ★★★★★ · 146 Google-Bewertungen';
  readonly marketingClaims = [
    'Schneller Versand',
    'Konstante Premium-Qualität',
    'Bestellbar rund um die Uhr',
  ];

  private readonly routeKey = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url.split('?')[0].split('/').pop() ?? ''),
      startWith(this.router.url.split('?')[0].split('/').pop() ?? ''),
    ),
    { initialValue: '' },
  );

  constructor() {
    this.loadCookiePrefs();
    effect(() => {
      if (this.routeKey() === 'verwaltung') {
        this.auth.reloadUsersFromStorage();
      }
    });
    effect(() => {
      if (this.auth.isStaff() && this.autoPrint.enabled() && this.print.connected()) {
        void this.autoPrint.flushUnprinted();
      }
    });
    effect(() => {
      const isStaff = this.auth.isStaff();
      const conversations = this.chat.openConversations();
      if (!isStaff) {
        this.staffChatNotifyInitialized = false;
        this.lastStaffMessageIds.clear();
        return;
      }
      if (!this.staffChatNotifyInitialized) {
        this.staffChatNotifyInitialized = true;
        this.lastStaffMessageIds.clear();
        for (const conversation of conversations) {
          const last = conversation.messages[conversation.messages.length - 1];
          if (last) {
            this.lastStaffMessageIds.set(conversation.id, last.id);
          }
        }
        return;
      }
      let shouldNotify = false;
      const nextMap = new Map<string, string>();
      for (const conversation of conversations) {
        const last = conversation.messages[conversation.messages.length - 1];
        if (!last) {
          continue;
        }
        const previous = this.lastStaffMessageIds.get(conversation.id);
        if (last.authorRole !== 'staff' && previous && previous !== last.id) {
          shouldNotify = true;
        }
        if (!previous && last.authorRole !== 'staff') {
          shouldNotify = true;
        }
        nextMap.set(conversation.id, last.id);
      }
      this.lastStaffMessageIds.clear();
      for (const [conversationId, messageId] of nextMap.entries()) {
        this.lastStaffMessageIds.set(conversationId, messageId);
      }
      if (shouldNotify) {
        this.chat.playStaffNotification();
      }
    });
  }

  readonly newOrdersLiveCount = computed(() =>
    this.auth.isStaff() ? this.session.activeOrders().filter((order) => order.status === 'neu').length : 0,
  );
  readonly newChatLiveCount = computed(() => (this.auth.isStaff() ? this.chat.waitingForStaffCount() : 0));
  readonly lowStockLiveCount = computed(() => (this.auth.isStaff() ? this.inventory.lowStockRows().length : 0));
  readonly hasLiveNotifications = computed(
    () =>
      this.newOrdersLiveCount() > 0 || this.newChatLiveCount() > 0 || this.lowStockLiveCount() > 0,
  );

  openAdminTab(tab: 'orders' | 'inventory' | 'chat'): void {
    if (!this.auth.isStaff()) {
      return;
    }
    void this.router.navigate(['/demo/weisser-schaefer/verwaltung'], {
      queryParams: { tab },
    });
  }

  readonly printPreviewPages = computed(() => {
    const orderId = this.session.printOrderId();
    if (!orderId) {
      return [];
    }
    const order = this.session.orderById(orderId);
    return order ? buildWsLabelPages(order) : [];
  });

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  logout(): void {
    this.closeMobileNav();
    this.session.logout();
    void this.router.navigateByUrl('/demo/weisser-schaefer');
  }

  sendToPrinter(): void {
    if (this.printing()) {
      return; // Doppelklick-Schutz
    }
    const orderId = this.session.printOrderId();
    if (!orderId) {
      return;
    }
    const order = this.session.orderById(orderId);
    if (!order) {
      return;
    }
    if (!this.print.connected()) {
      this.session.showToast('Etiketten-App nicht verbunden');
      return;
    }

    // Reprint-Schutz: bereits gedruckte ODER bereits gesendete (Ausgang unklar)
    // Bestellung nur nach ausdrücklicher Bestätigung erneut drucken.
    const maybeAlreadyPrinted = Boolean(order.printedAt || order.printDispatchedAt);
    if (maybeAlreadyPrinted) {
      const ok = window.confirm(
        `Bestellung ${order.id} wurde möglicherweise bereits gedruckt.\n\n` +
          'Wirklich ERNEUT drucken? Achtung: Gefahr eines doppelten Versands!',
      );
      if (!ok) {
        return;
      }
    }

    const jobId = this.session.claimOrderForPrint(orderId, 'manual');
    if (!jobId) {
      this.session.showToast('Diese Bestellung wird gerade gedruckt …');
      return;
    }

    this.session.labelPrintBusy.set(true);
    this.printing.set(true);
    const current = this.session.orderById(orderId) ?? order;
    void this.print
      .printOrder(current, { jobId, force: maybeAlreadyPrinted })
      .then((result) => {
        this.printing.set(false);
        this.session.labelPrintBusy.set(false);
        if (result.ok) {
          this.session.confirmOrderPrinted(orderId, jobId);
          if (result.deduped) {
            this.session.showToast('Bereits gedruckt — kein erneuter Druck ausgelöst.');
          } else {
            const count = result.pages ?? 1;
            const label = count === 1 ? 'Etikett' : `${count} Etiketten`;
            this.session.showToast(`${label} gedruckt (${result.printer ?? 'Drucker'})`);
          }
          this.session.closePrint();
        } else {
          this.session.releaseOrderPrint(orderId, jobId, result.uncertain !== true);
          this.session.showToast(result.error ?? 'Druck fehlgeschlagen');
        }
      });
  }

  wakePrintApp(): void {
    this.print.wakeDesktopApp();
    this.session.showToast('Etiketten-App wird gestartet…');
  }

  toggleCookieSettings(): void {
    this.cookieSettingsOpen.update((v) => !v);
  }

  openCookieSettings(): void {
    this.cookieBannerOpen.set(true);
    this.cookieSettingsOpen.set(true);
  }

  acceptAllCookies(): void {
    this.saveCookiePrefs({ statistics: true, marketing: true });
  }

  rejectOptionalCookies(): void {
    this.saveCookiePrefs({ statistics: false, marketing: false });
  }

  saveCookieSelection(): void {
    this.saveCookiePrefs({
      statistics: this.cookieStats(),
      marketing: this.cookieMarketing(),
    });
  }

  private loadCookiePrefs(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const raw = localStorage.getItem(WS_COOKIE_PREFS_KEY);
    if (!raw) {
      this.cookieBannerOpen.set(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<WsCookiePrefs>;
      this.cookieStats.set(Boolean(parsed.statistics));
      this.cookieMarketing.set(Boolean(parsed.marketing));
      this.cookieBannerOpen.set(false);
    } catch {
      this.cookieBannerOpen.set(true);
    }
  }

  private saveCookiePrefs(input: { statistics: boolean; marketing: boolean }): void {
    const payload: WsCookiePrefs = {
      essential: true,
      statistics: input.statistics,
      marketing: input.marketing,
      updatedAt: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(WS_COOKIE_PREFS_KEY, JSON.stringify(payload));
    }
    this.cookieStats.set(payload.statistics);
    this.cookieMarketing.set(payload.marketing);
    this.cookieSettingsOpen.set(false);
    this.cookieBannerOpen.set(false);
    this.session.showToast('Datenschutz-Einstellungen gespeichert.');
  }
}
