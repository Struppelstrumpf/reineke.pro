import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WeisserSchaeferAuthService } from '../../weisser-schaefer-auth.service';
import { WeisserSchaeferCatalogService } from '../../weisser-schaefer-catalog.service';
import { WeisserSchaeferInventoryService } from '../../weisser-schaefer-inventory.service';
import { WeisserSchaeferSessionService } from '../../weisser-schaefer-session.service';
import type { WsProduct } from '../../ws-catalog.types';
import {
  wsProductCanOrder,
  wsProductIsOrderableForFilter,
  wsProductMaxOrderQty,
  wsProductStockBadgeClass,
  wsProductStockLabel,
} from '../../ws-product-stock';

@Component({
  selector: 'pv-ws-shop',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './shop.component.html',
  styleUrls: ['../../ws-shared.scss', './shop.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsShopComponent {
  private readonly router = inject(Router);
  readonly auth = inject(WeisserSchaeferAuthService);
  readonly session = inject(WeisserSchaeferSessionService);
  readonly catalog = inject(WeisserSchaeferCatalogService);
  readonly inventory = inject(WeisserSchaeferInventoryService);

  readonly note = signal('');
  readonly cartOpen = signal(false);
  readonly search = signal('');
  readonly categoryFilter = signal<string>('alle');
  readonly orderableOnly = signal(false);

  readonly stockLabel = wsProductStockLabel;
  readonly stockBadgeClass = wsProductStockBadgeClass;

  readonly shopView = computed(() => {
    const q = this.search().trim().toLowerCase();
    const categoryId = this.categoryFilter();
    const orderableOnly = this.orderableOnly();

    return this.catalog
      .shopGroups()
      .filter((group) => categoryId === 'alle' || group.category.id === categoryId)
      .map((group) => ({
        ...group,
        products: group.products.filter((product) => {
          const warehouseQty = this.inventory.quantity(product.id);
          if (orderableOnly && !wsProductIsOrderableForFilter(product, warehouseQty)) {
            return false;
          }
          if (!q) {
            return true;
          }
          return (
            product.name.toLowerCase().includes(q) ||
            product.spec.toLowerCase().includes(q) ||
            product.id.toLowerCase().includes(q)
          );
        }),
      }))
      .filter((group) => group.products.length > 0);
  });

  readonly hasProducts = computed(() => this.shopView().length > 0);
  readonly hasActiveFilters = computed(
    () =>
      this.search().trim().length > 0 ||
      this.categoryFilter() !== 'alle' ||
      this.orderableOnly(),
  );

  readonly isGuest = computed(() => !this.auth.isLoggedIn());

  warehouseQty(productId: string): number {
    return this.inventory.quantity(productId);
  }

  canOrderProduct(product: WsProduct): boolean {
    return wsProductCanOrder(product, this.warehouseQty(product.id));
  }

  cartQty(productId: string): number {
    return this.session.cart().find((line) => line.productId === productId)?.qty ?? 0;
  }

  maxAddQty(product: WsProduct): number {
    const max = wsProductMaxOrderQty(product, this.warehouseQty(product.id), this.cartQty(product.id));
    return max ?? Number.MAX_SAFE_INTEGER;
  }

  add(product: WsProduct): void {
    if (!wsProductCanOrder(product, this.warehouseQty(product.id))) {
      this.session.showToast('Dieses Produkt ist derzeit nicht bestellbar');
      return;
    }
    if (this.maxAddQty(product) < 1) {
      this.session.showToast('Maximale Lagermenge erreicht');
      return;
    }
    const err = this.session.addToCart({
      productId: product.id,
      name: product.name,
      qty: 1,
      unit: product.unit,
    });
    if (err) {
      this.session.showToast(err);
      return;
    }
    this.cartOpen.set(true);
  }

  checkout(): void {
    if (!this.auth.canOrder()) {
      this.session.showToast('Bitte anmelden, um die Bestellung abzuschließen.');
      void this.router.navigateByUrl('/demo/weisser-schaefer/anmelden');
      return;
    }
    const order = this.session.placeOrder(this.note());
    if (order) {
      this.note.set('');
      this.cartOpen.set(false);
    }
  }

  cartSubtotal(): number {
    return this.session.cart().reduce((sum, line) => {
      const product = this.catalog.productById(line.productId);
      return sum + (product?.price ?? 0) * line.qty;
    }, 0);
  }

  setCategory(categoryId: string): void {
    this.categoryFilter.set(categoryId);
  }

  resetFilters(): void {
    this.search.set('');
    this.categoryFilter.set('alle');
    this.orderableOnly.set(false);
  }

  stockHint(product: WsProduct): string {
    const qty = this.warehouseQty(product.id);
    if (product.stock === 'Bestand') {
      return qty > 0 ? `${qty} Stück im Lager` : 'Aktuell nicht im Lager';
    }
    if (product.stock === 'auf Anfrage') {
      return 'Lieferung nach Rücksprache';
    }
    if (product.stock === 'Ausverkauft') {
      return 'Derzeit nicht bestellbar';
    }
    return 'Sofort bestellbar';
  }

  productMediaClass(categoryName: string): string {
    const value = categoryName.toLowerCase();
    if (value.includes('schaf')) {
      return 'shop__media--sheep';
    }
    if (value.includes('lamm')) {
      return 'shop__media--lamb';
    }
    if (value.includes('ziege')) {
      return 'shop__media--goat';
    }
    return 'shop__media--neutral';
  }

  productImage(product: WsProduct): string | null {
    const image = product.imageUrl?.trim();
    return image && image.length > 0 ? image : null;
  }

  productInitials(productName: string): string {
    const parts = productName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '');
    return parts.join('') || 'WS';
  }
}
