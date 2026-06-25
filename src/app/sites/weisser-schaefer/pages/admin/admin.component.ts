import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { wsRoleLabel, wsStatusLabel, type WsUser, type WsUserRole } from '../../weisser-schaefer-auth.types';
import { WeisserSchaeferAuthService } from '../../weisser-schaefer-auth.service';
import { WeisserSchaeferAutoPrintService } from '../../weisser-schaefer-auto-print.service';
import type { WsOrder } from '../../weisser-schaefer.data';
import { wsOrderStaffStatusOptions, wsOrderStatusOptionLabel } from '../../weisser-schaefer.data';
import { WeisserSchaeferInventoryService } from '../../weisser-schaefer-inventory.service';
import { WeisserSchaeferLabelSettingsService } from '../../weisser-schaefer-label-settings.service';
import {
  WeisserSchaeferPrintService,
  WS_PRINT_APP_DOWNLOAD_URL,
} from '../../weisser-schaefer-print.service';
import { WeisserSchaeferSessionService } from '../../weisser-schaefer-session.service';
import { WeisserSchaeferStockAlertService } from '../../weisser-schaefer-stock-alert.service';
import { WeisserSchaeferChatService } from '../../weisser-schaefer-chat.service';
import { WsCatalogAdminComponent } from '../../components/ws-catalog-admin.component';
import { WsInventoryAdminComponent } from '../../components/ws-inventory-admin.component';
import { WsLabelPreviewComponent } from '../../components/ws-label-preview.component';
import { WsSupportChatAdminComponent } from '../../components/ws-support-chat-admin.component';
import { buildWsLabelPages } from '../../ws-label-layout';
import type { WsLabelAlignH, WsLabelAlignV, WsLabelOrientation } from '../../ws-label-settings';
import { labelPageDimensions } from '../../ws-label-settings';

type VerwaltungTab =
  | 'orders'
  | 'approvals'
  | 'users'
  | 'catalog'
  | 'inventory'
  | 'printer'
  | 'chat';
type StatusFilter = 'alle' | WsOrder['status'];
type OrdersView = 'active' | 'archive';
type UserLockFilter = 'alle' | 'aktiv' | 'gesperrt';

function normalizePrinterName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s+/g, ' ');
}

function resolvePrinterOption(value: string, options: string[]): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (options.includes(trimmed)) {
    return trimmed;
  }
  const normalized = normalizePrinterName(trimmed);
  const matched = options.find((option) => normalizePrinterName(option) === normalized);
  return matched ?? trimmed;
}

@Component({
  selector: 'pv-ws-verwaltung',
  imports: [
    DatePipe,
    WsLabelPreviewComponent,
    WsCatalogAdminComponent,
    WsInventoryAdminComponent,
    WsSupportChatAdminComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['../../ws-shared.scss', './admin.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsAdminComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(WeisserSchaeferAuthService);
  readonly session = inject(WeisserSchaeferSessionService);
  readonly print = inject(WeisserSchaeferPrintService);
  readonly autoPrint = inject(WeisserSchaeferAutoPrintService);
  readonly inventory = inject(WeisserSchaeferInventoryService);
  readonly stockAlerts = inject(WeisserSchaeferStockAlertService);
  readonly chat = inject(WeisserSchaeferChatService);
  readonly labelSettings = inject(WeisserSchaeferLabelSettingsService);

  readonly roleLabel = wsRoleLabel;
  readonly statusLabel = wsStatusLabel;
  readonly orderStatusOptionLabel = wsOrderStatusOptionLabel;
  readonly orderStaffStatusOptions = wsOrderStaffStatusOptions;

  readonly tab = signal<VerwaltungTab>('orders');
  readonly ordersView = signal<OrdersView>('active');
  readonly statusFilter = signal<StatusFilter>('alle');
  readonly search = signal('');
  readonly processingOrders = signal(false);
  readonly userSearch = signal('');
  readonly userRoleFilter = signal<'alle' | WsUserRole>('alle');
  readonly userLockFilter = signal<UserLockFilter>('alle');
  readonly createUserFormOpen = signal(false);
  readonly selectedUserIds = signal<string[]>([]);
  readonly bulkRoleTarget = signal<WsUserRole>('employee');
  readonly userDialogOpen = signal(false);
  readonly userDialogTitle = signal('');
  readonly userDialogMessage = signal('');
  readonly userDialogInput = signal('');
  readonly userDialogConfirmLabel = signal('Bestätigen');
  readonly userDialogRequiredPhrase = signal('BESTAETIGEN');
  readonly selectedPrinter = signal('');
  readonly appDownloadUrlDraft = signal(WS_PRINT_APP_DOWNLOAD_URL);

  readonly staffEmail = signal('');
  readonly staffName = signal('');
  readonly staffRole = signal<'employee' | 'admin'>('employee');
  readonly staffPassword = signal('');
  readonly staffError = signal('');
  readonly staffMsg = signal('');

  readonly inviteEmail = signal('');
  readonly inviteError = signal('');
  readonly inviteSuccess = signal(false);
  readonly inviteToken = signal('');
  readonly inviteEmailHtml = signal('');
  readonly inviteActivationUrl = signal('');
  private pendingUserDialogAction: (() => void) | null = null;

  readonly filteredOrders = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const source =
      this.ordersView() === 'archive'
        ? this.session.archivedOrders()
        : this.session.activeOrders();
    return source
      .filter((o) => status === 'alle' || o.status === status)
      .filter(
        (o) =>
          !q ||
          o.id.toLowerCase().includes(q) ||
          o.customer.toLowerCase().includes(q) ||
          o.lines.some((l) => l.name.toLowerCase().includes(q)),
      );
  });

  readonly activeCount = computed(() => this.session.activeOrders().length);

  readonly archiveCount = computed(() => this.session.archivedOrders().length);

  readonly newCount = computed(
    () => this.session.activeOrders().filter((o) => o.status === 'neu').length,
  );
  readonly openChatCount = computed(() => this.chat.openConversations().length);
  readonly activeOrderCountByCustomer = computed(() => {
    const map = new Map<string, number>();
    for (const order of this.session.activeOrders()) {
      const key = order.customer.trim();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  });
  readonly selectionCount = computed(() => this.selectedUserIds().length);
  readonly alertTimes = computed(() => this.inventory.inventorySettings().alertTimes);
  readonly printerOptions = computed(() => this.print.agent()?.printers ?? []);
  readonly routingSettings = computed(() => this.print.routingSettings());
  readonly mainPrinterConfigured = computed(() => this.routingSettings().mainPrinter?.trim() ?? '');
  readonly activeMainPrinter = computed(() => {
    const options = this.printerOptions();
    const manual = this.selectedPrinter().trim();
    if (manual) {
      return resolvePrinterOption(manual, options);
    }

    const agentPrinter = this.print.agent()?.printer?.trim() ?? '';
    const savedMain = this.mainPrinterConfigured();
    if (savedMain) {
      return resolvePrinterOption(savedMain, options);
    }

    return resolvePrinterOption(agentPrinter, options);
  });
  readonly mainPrinterMissing = computed(() => {
    const active = this.activeMainPrinter();
    return Boolean(active) && !this.printerOptions().includes(active);
  });
  readonly orderRoutePrinterRaw = computed(() => this.routingSettings().orderPrinter?.trim() ?? '');
  readonly stockRoutePrinterRaw = computed(() => this.routingSettings().stockAlertPrinter?.trim() ?? '');
  readonly orderRoutePrinterValue = computed(() =>
    resolvePrinterOption(this.orderRoutePrinterRaw(), this.printerOptions()),
  );
  readonly stockRoutePrinterValue = computed(() =>
    resolvePrinterOption(this.stockRoutePrinterRaw(), this.printerOptions()),
  );
  readonly defaultTaskPrinterLabel = computed(() => {
    const active = this.activeMainPrinter();
    return active ? `Standarddrucker (App): ${active}` : 'Standarddrucker (App)';
  });
  readonly orderRoutePrinterMissing = computed(
    () => {
      const raw = this.orderRoutePrinterRaw();
      if (!raw) {
        return false;
      }
      const normalized = normalizePrinterName(raw);
      return !this.printerOptions().some((option) => normalizePrinterName(option) === normalized);
    },
  );
  readonly stockRoutePrinterMissing = computed(
    () => {
      const raw = this.stockRoutePrinterRaw();
      if (!raw) {
        return false;
      }
      const normalized = normalizePrinterName(raw);
      return !this.printerOptions().some((option) => normalizePrinterName(option) === normalized);
    },
  );
  readonly allVisibleSelected = computed(() => {
    const selectable = this.filteredUsers().filter((u) => u.id !== this.auth.currentUser()?.id);
    if (selectable.length === 0) {
      return false;
    }
    const selected = new Set(this.selectedUserIds());
    return selectable.every((entry) => selected.has(entry.id));
  });
  readonly canConfirmUserDialog = computed(
    () =>
      this.userDialogInput().trim().toUpperCase() ===
      this.userDialogRequiredPhrase().trim().toUpperCase(),
  );

  readonly filteredUsers = computed(() => {
    const q = this.userSearch().trim().toLowerCase();
    const roleFilter = this.userRoleFilter();
    const lockFilter = this.userLockFilter();
    const source = !q
      ? this.auth.allUsers()
      : this.auth.allUsers().filter(
          (u) =>
            u.contactName.toLowerCase().includes(q) ||
            u.companyName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q),
        );
    return [...source]
      .filter((entry) => roleFilter === 'alle' || entry.role === roleFilter)
      .filter((entry) => {
        if (lockFilter === 'gesperrt') {
          return entry.locked === true;
        }
        if (lockFilter === 'aktiv') {
          return entry.locked !== true;
        }
        return true;
      })
      .sort((a, b) => {
      const aPending = a.role === 'customer' && a.status === 'pending' ? 0 : 1;
      const bPending = b.role === 'customer' && b.status === 'pending' ? 0 : 1;
      if (aPending !== bPending) {
        return aPending - bPending;
      }
      return a.companyName.localeCompare(b.companyName, 'de');
      });
  });

  readonly labelPreviewPages = computed(() => {
    const sample =
      this.session.activeOrders()[0] ??
      this.session.archivedOrders()[0] ?? {
        id: 'WS-VORSCHAU',
        customer: 'Muster-Fleischerei',
        createdAt: new Date().toISOString(),
        status: 'neu' as const,
        lines: [
          { qty: 2, name: 'Schweinebraten', unit: 'kg' },
          { qty: 1, name: 'Leberwurst', unit: 'Stück' },
          { qty: 3, name: 'Rinderhack', unit: 'kg' },
        ],
        note: 'Bitte kühl lagern.',
      };
    return buildWsLabelPages(sample).slice(0, 1);
  });

  readonly labelDimsLabel = computed(() => {
    const dims = labelPageDimensions(this.labelSettings.settings());
    const orient =
      this.labelSettings.settings().orientation === 'landscape' ? 'Querformat' : 'Hochformat';
    return `${dims.pageWidthMm} × ${dims.pageHeightMm} mm (${orient})`;
  });

  constructor() {
    if (!this.auth.isStaff()) {
      void this.router.navigateByUrl('/demo/weisser-schaefer/anmelden');
      return;
    }
    this.auth.reloadUsersFromStorage();
    this.appDownloadUrlDraft.set(this.routingSettings().appDownloadUrl ?? WS_PRINT_APP_DOWNLOAD_URL);
    this.applyFocusTab(this.route.snapshot.queryParamMap.get('tab'));
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.applyFocusTab(params.get('tab')));
    effect(() => {
      if (this.tab() !== 'printer') {
        return;
      }
      const current = this.activeMainPrinter();
      if (current && this.selectedPrinter() !== current) {
        this.selectedPrinter.set(current);
      }
    });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibility);
    }
  }

  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') {
      this.auth.reloadUsersFromStorage();
    }
  };

  private applyFocusTab(raw: string | null): void {
    const requested = (raw ?? 'orders').toLowerCase();
    if (requested === 'orders') {
      this.setOrdersView('active', false);
      return;
    }
    if (requested === 'archive') {
      this.setOrdersView('archive', false);
      return;
    }
    if (requested === 'inventory' && this.auth.isStaff()) {
      this.tab.set('inventory');
      return;
    }
    if (requested === 'catalog' && this.auth.isStaff()) {
      this.tab.set('catalog');
      return;
    }
    if (requested === 'chat' && this.auth.isStaff()) {
      this.tab.set('chat');
      return;
    }
    if (requested === 'approvals' && this.auth.isStaff()) {
      this.tab.set('approvals');
      return;
    }
    if (requested === 'users' && this.auth.isAdmin()) {
      this.tab.set('users');
      return;
    }
    if (requested === 'printer' && this.auth.isStaff()) {
      this.tab.set('printer');
      return;
    }
    this.setOrdersView('active', false);
  }

  setTab(next: VerwaltungTab): void {
    this.auth.reloadUsersFromStorage();
    if (next !== 'users') {
      this.clearUserSelection();
      this.createUserFormOpen.set(false);
    }
    if (next === 'orders') {
      this.ordersView.set('active');
    }
    if (next === 'printer') {
      void this.labelSettings.syncFromApp();
      this.appDownloadUrlDraft.set(this.routingSettings().appDownloadUrl ?? WS_PRINT_APP_DOWNLOAD_URL);
    }
    this.tab.set(next);
    if (next !== 'orders') {
      this.syncTabQuery(next);
    }
  }

  setOrdersView(view: OrdersView, syncUrl = true): void {
    this.ordersView.set(view);
    this.tab.set('orders');
    if (view === 'active') {
      this.statusFilter.set('alle');
    }
    if (syncUrl) {
      this.syncTabQuery(view === 'archive' ? 'archive' : 'orders');
    }
  }

  setStatusFilter(next: StatusFilter): void {
    this.statusFilter.set(next);
  }

  printOrder(orderId: string): void {
    if (!this.session.orderById(orderId)) {
      return;
    }
    this.session.openPrint(orderId);
  }

  async processNewOrders(): Promise<void> {
    if (this.processingOrders()) {
      return;
    }
    if (!this.print.connected()) {
      this.session.showToast('Etiketten-App nicht verbunden');
      return;
    }

    const pending = this.session
      .activeOrders()
      .filter((order) => order.status === 'neu')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (!pending.length) {
      this.session.showToast('Keine neuen Bestellungen');
      return;
    }

    this.processingOrders.set(true);
    let success = 0;
    let pages = 0;
    let failed = 0;

    try {
      for (const order of pending) {
        const jobId = this.session.claimOrderForPrint(order.id, 'manual');
        if (!jobId) {
          failed += 1;
          continue;
        }
        const current = this.session.orderById(order.id) ?? order;
        const result = await this.print.printOrder(current, { jobId });
        if (!result.ok) {
          this.session.releaseOrderPrint(order.id, jobId, result.uncertain !== true);
          failed += 1;
          continue;
        }
        this.session.confirmOrderPrinted(order.id, jobId);
        success += 1;
        pages += result.deduped ? 0 : (result.pages ?? 1);
      }
    } finally {
      this.processingOrders.set(false);
    }

    if (success > 0 && failed === 0) {
      const label = pages === 1 ? '1 Etikett' : `${pages} Etiketten`;
      this.session.showToast(`Bestellungen bearbeitet: ${success} (${label})`);
      return;
    }
    if (success > 0 && failed > 0) {
      this.session.showToast(
        `Bestellungen bearbeitet: ${success}/${pending.length} · ${failed} offen`,
      );
      return;
    }
    this.session.showToast('Keine Bestellung konnte gedruckt werden');
  }

  testPrint(): void {
    void this.print.testPrint().then((result) => {
      this.session.showToast(
        result.ok ? 'Testdruck erfolgreich' : (result.error ?? 'Testdruck fehlgeschlagen'),
      );
    });
  }

  approve(userId: string): void {
    const err = this.auth.approveCustomer(userId);
    if (err) {
      this.session.showToast(err);
      return;
    }
    this.auth.reloadUsersFromStorage();
    this.session.showToast('Fleischerei freigeschaltet');
  }

  inviteCustomer(): void {
    const result = this.auth.inviteCustomer(this.inviteEmail());
    if (result.error) {
      this.inviteError.set(result.error);
      this.inviteSuccess.set(false);
      this.inviteToken.set('');
      this.inviteEmailHtml.set('');
      this.inviteActivationUrl.set('');
      return;
    }
    this.inviteError.set('');
    this.inviteSuccess.set(true);
    this.inviteToken.set(result.demoToken ?? '');
    this.inviteEmailHtml.set(result.inviteEmail?.html ?? '');
    this.inviteActivationUrl.set(result.inviteEmail?.activationUrl ?? '');
    this.session.showToast('Einladung versendet (Demo)');
  }

  resetInviteForm(): void {
    this.inviteEmail.set('');
    this.inviteError.set('');
    this.inviteSuccess.set(false);
    this.inviteToken.set('');
    this.inviteEmailHtml.set('');
    this.inviteActivationUrl.set('');
  }

  addStaff(): void {
    if (!this.auth.isAdmin()) {
      this.staffError.set('Nur Administratoren können Mitarbeiter/Administratoren anlegen.');
      this.staffMsg.set('');
      return;
    }
    const err = this.auth.createStaff({
      email: this.staffEmail(),
      contactName: this.staffName(),
      role: this.staffRole(),
      password: this.staffPassword(),
    });
    if (err) {
      this.staffError.set(err);
      this.staffMsg.set('');
      return;
    }
    this.staffError.set('');
    this.staffMsg.set('Benutzer angelegt.');
    this.staffEmail.set('');
    this.staffName.set('');
    this.staffPassword.set('');
    this.createUserFormOpen.set(false);
  }

  changeRole(userId: string, role: 'customer' | 'employee' | 'admin'): void {
    const user = this.auth.allUsers().find((entry) => entry.id === userId);
    if (!user || user.role === role) {
      return;
    }
    this.openUserDialog({
      title: 'Rolle ändern',
      message: `${user.contactName} (${user.email}) auf Rolle „${this.roleLabel(role)}“ setzen?`,
      confirmLabel: 'Rolle ändern',
      action: () => {
        const err = this.auth.setUserRole(userId, role);
        if (err) {
          this.session.showToast(err);
          return;
        }
        this.session.showToast('Rolle wurde geändert.');
      },
    });
  }

  userStatusLabel(user: WsUser): string {
    if (user.locked) {
      return 'Gesperrt';
    }
    return user.role === 'customer' ? this.statusLabel(user.status) : 'Aktiv';
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUserIds().includes(userId);
  }

  toggleUserSelection(userId: string, checked: boolean): void {
    if (checked) {
      this.selectedUserIds.update((list) => (list.includes(userId) ? list : [...list, userId]));
      return;
    }
    this.selectedUserIds.update((list) => list.filter((id) => id !== userId));
  }

  toggleSelectAllVisible(checked: boolean): void {
    const visibleIds = this.filteredUsers()
      .filter((entry) => entry.id !== this.auth.currentUser()?.id)
      .map((entry) => entry.id);
    if (checked) {
      this.selectedUserIds.update((list) => {
        const merged = new Set([...list, ...visibleIds]);
        return [...merged];
      });
      return;
    }
    this.selectedUserIds.update((list) => list.filter((id) => !visibleIds.includes(id)));
  }

  clearUserSelection(): void {
    this.selectedUserIds.set([]);
  }

  requestToggleUserLock(user: WsUser): void {
    if (user.id === this.auth.currentUser()?.id) {
      this.session.showToast('Eigener Account kann nicht gesperrt werden.');
      return;
    }
    const lock = !user.locked;
    this.openUserDialog({
      title: lock ? 'Benutzer sperren' : 'Benutzer freigeben',
      message: `${user.contactName} (${user.email}) wirklich ${lock ? 'sperren' : 'freigeben'}?`,
      confirmLabel: lock ? 'Sperren' : 'Freigeben',
      action: () => {
        const err = this.auth.setUserLocked(user.id, lock);
        if (err) {
          this.session.showToast(err);
          return;
        }
        this.session.showToast(lock ? 'Benutzer wurde gesperrt.' : 'Benutzer wurde freigegeben.');
      },
    });
  }

  requestDeleteUser(user: WsUser): void {
    if (user.id === this.auth.currentUser()?.id) {
      this.session.showToast('Eigener Account kann nicht gelöscht werden.');
      return;
    }
    this.openUserDialog({
      title: 'Benutzer löschen',
      message:
        `Benutzer ${user.contactName} (${user.email}) dauerhaft löschen? ` +
        'Diese Aktion kann nicht rückgängig gemacht werden.',
      confirmLabel: 'Dauerhaft löschen',
      action: () => {
        const err = this.auth.deleteUser(user.id);
        if (err) {
          this.session.showToast(err);
          return;
        }
        this.selectedUserIds.update((list) => list.filter((id) => id !== user.id));
        this.session.showToast('Benutzer wurde gelöscht.');
      },
    });
  }

  applyBulkRoleChange(): void {
    const selected = this.selectedUsers();
    if (!selected.length) {
      this.session.showToast('Bitte zuerst Benutzer auswählen.');
      return;
    }
    const target = this.bulkRoleTarget();
    this.openUserDialog({
      title: 'Rollen für Auswahl ändern',
      message: `${selected.length} Benutzer auf Rolle „${this.roleLabel(target)}“ setzen?`,
      confirmLabel: 'Rollen ändern',
      action: () => {
        let success = 0;
        let failed = 0;
        for (const user of selected) {
          const err = this.auth.setUserRole(user.id, target);
          if (err) {
            failed += 1;
          } else {
            success += 1;
          }
        }
        this.finishBulkActionToast(success, failed, 'Rollen aktualisiert');
      },
    });
  }

  applyBulkLock(locked: boolean): void {
    const selected = this.selectedUsers();
    if (!selected.length) {
      this.session.showToast('Bitte zuerst Benutzer auswählen.');
      return;
    }
    const actionLabel = locked ? 'sperren' : 'freigeben';
    this.openUserDialog({
      title: `Auswahl ${actionLabel}`,
      message: `${selected.length} Benutzer wirklich ${actionLabel}?`,
      confirmLabel: locked ? 'Sperren' : 'Freigeben',
      action: () => {
        let success = 0;
        let failed = 0;
        for (const user of selected) {
          const err = this.auth.setUserLocked(user.id, locked);
          if (err) {
            failed += 1;
          } else {
            success += 1;
          }
        }
        this.finishBulkActionToast(success, failed, locked ? 'Benutzer gesperrt' : 'Benutzer freigegeben');
      },
    });
  }

  applyBulkDelete(): void {
    const selected = this.selectedUsers();
    if (!selected.length) {
      this.session.showToast('Bitte zuerst Benutzer auswählen.');
      return;
    }
    this.openUserDialog({
      title: 'Auswahl löschen',
      message: `${selected.length} Benutzer dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmLabel: 'Dauerhaft löschen',
      action: () => {
        let success = 0;
        let failed = 0;
        const deletedIds = new Set<string>();
        for (const user of selected) {
          const err = this.auth.deleteUser(user.id);
          if (err) {
            failed += 1;
          } else {
            success += 1;
            deletedIds.add(user.id);
          }
        }
        if (deletedIds.size > 0) {
          this.selectedUserIds.update((list) => list.filter((id) => !deletedIds.has(id)));
        }
        this.finishBulkActionToast(success, failed, 'Benutzer gelöscht');
      },
    });
  }

  closeUserDialog(): void {
    this.userDialogOpen.set(false);
    this.userDialogTitle.set('');
    this.userDialogMessage.set('');
    this.userDialogInput.set('');
    this.userDialogConfirmLabel.set('Bestätigen');
    this.userDialogRequiredPhrase.set('BESTAETIGEN');
    this.pendingUserDialogAction = null;
  }

  toggleCreateUserForm(): void {
    if (!this.auth.isAdmin()) {
      return;
    }
    this.createUserFormOpen.update((value) => !value);
    this.staffError.set('');
    this.staffMsg.set('');
  }

  userActiveOrderCount(user: WsUser): number {
    if (user.role !== 'customer') {
      return 0;
    }
    return this.activeOrderCountByCustomer().get(user.companyName.trim()) ?? 0;
  }

  confirmUserDialog(): void {
    if (!this.canConfirmUserDialog()) {
      return;
    }
    const action = this.pendingUserDialogAction;
    this.closeUserDialog();
    action?.();
  }

  private selectedUsers(): WsUser[] {
    const selectedIds = new Set(this.selectedUserIds());
    const currentId = this.auth.currentUser()?.id;
    return this.auth
      .allUsers()
      .filter((user) => selectedIds.has(user.id))
      .filter((user) => user.id !== currentId);
  }

  private finishBulkActionToast(success: number, failed: number, successLabel: string): void {
    if (success > 0 && failed === 0) {
      this.session.showToast(`${successLabel}: ${success}`);
      return;
    }
    if (success > 0) {
      this.session.showToast(`${successLabel}: ${success} · Fehler: ${failed}`);
      return;
    }
    this.session.showToast('Keine Änderung durchgeführt.');
  }

  private syncTabQuery(tab: string): void {
    const current = this.route.snapshot.queryParamMap.get('tab') ?? '';
    if (current === tab) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private openUserDialog(config: {
    title: string;
    message: string;
    confirmLabel: string;
    action: () => void;
  }): void {
    this.userDialogTitle.set(config.title);
    this.userDialogMessage.set(config.message);
    this.userDialogConfirmLabel.set(config.confirmLabel);
    this.userDialogRequiredPhrase.set('BESTAETIGEN');
    this.userDialogInput.set('');
    this.pendingUserDialogAction = config.action;
    this.userDialogOpen.set(true);
  }

  setOrderStatus(orderId: string, status: WsOrder['status']): void {
    this.session.updateOrderStatus(orderId, status);
  }

  restoreOrder(orderId: string): void {
    this.session.restoreOrder(orderId);
  }

  async savePrinter(): Promise<void> {
    const name = this.selectedPrinter().trim() || this.activeMainPrinter();
    if (!name) {
      return;
    }
    const ok = await this.print.setPrinter(name);
    if (ok) {
      this.print.setMainPrinter(name);
    }
    this.session.showToast(ok ? `Drucker: ${name}` : 'Drucker konnte nicht gesetzt werden');
  }

  wakeApp(): void {
    this.print.wakeDesktopApp();
    this.session.showToast('Etiketten-App wird gestartet…');
  }

  setOrderTaskPrinter(value: string): void {
    this.print.setTaskPrinter('orders', value || null);
    const label = value || 'Standarddrucker';
    this.session.showToast(`Bestell-Drucker: ${label}`);
  }

  setStockAlertTaskPrinter(value: string): void {
    this.print.setTaskPrinter('stockAlerts', value || null);
    const label = value || 'Standarddrucker';
    this.session.showToast(`Lagerwarn-Drucker: ${label}`);
  }

  setAutoPrintEnabled(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.autoPrint.setEnabled(checked);
    this.session.showToast(
      checked
        ? 'Automatischer Etikettendruck bei neuen Bestellungen aktiv'
        : 'Automatischer Etikettendruck deaktiviert',
    );
  }

  toggleStockAlerts(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.inventory.setAlertsEnabled(checked);
    this.session.showToast(
      checked ? 'Lagerwarnungen per Etikett aktiviert' : 'Lagerwarnungen deaktiviert',
    );
    if (checked) {
      void this.stockAlerts.flush();
    }
  }

  updateAlertTime(index: number, value: string): void {
    const next = [...this.alertTimes()];
    next[index] = value;
    this.inventory.setAlertTimes(next);
  }

  addAlertTime(): void {
    const existing = new Set(this.alertTimes());
    let free = '08:00';
    for (let offset = 0; offset < 24; offset += 1) {
      const hour = (8 + offset) % 24;
      const candidate = `${String(hour).padStart(2, '0')}:00`;
      if (!existing.has(candidate)) {
        free = candidate;
        break;
      }
    }
    this.inventory.setAlertTimes([...this.alertTimes(), free]);
  }

  removeAlertTime(index: number): void {
    if (this.alertTimes().length <= 1) {
      return;
    }
    this.inventory.setAlertTimes(this.alertTimes().filter((_, i) => i !== index));
  }

  saveDownloadUrl(): void {
    this.print.setDownloadUrl(this.appDownloadUrlDraft());
    this.session.showToast('Download-Link gespeichert');
  }

  setLabelWidth(value: string): void {
    this.labelSettings.update({ widthMm: Number(value) });
  }

  setLabelHeight(value: string): void {
    this.labelSettings.update({ heightMm: Number(value) });
  }

  setLabelOrientation(value: WsLabelOrientation): void {
    this.labelSettings.update({ orientation: value });
  }

  setLabelScale(value: string): void {
    this.labelSettings.update({ scalePercent: Number(value) });
  }

  setLabelPadding(value: string): void {
    this.labelSettings.update({ paddingMm: Number(value) });
  }

  setLabelAlignH(value: WsLabelAlignH): void {
    this.labelSettings.update({ alignH: value });
  }

  setLabelAlignV(value: WsLabelAlignV): void {
    this.labelSettings.update({ alignV: value });
  }

  applyLabelPreset(alignH: WsLabelAlignH, alignV: WsLabelAlignV): void {
    this.labelSettings.update({ alignH, alignV });
  }

  async saveLabelSettings(): Promise<void> {
    await this.labelSettings.persist();
    this.session.showToast(
      this.print.connected()
        ? 'Etiketten-Einstellungen gespeichert und an Druck-App übertragen'
        : 'Etiketten-Einstellungen lokal gespeichert (App nicht verbunden)',
    );
  }

  resetLabelSettings(): void {
    this.labelSettings.reset();
    void this.saveLabelSettings();
  }
}
