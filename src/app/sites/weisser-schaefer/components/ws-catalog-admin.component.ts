import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { WeisserSchaeferCatalogService } from '../weisser-schaefer-catalog.service';
import { WeisserSchaeferInventoryService } from '../weisser-schaefer-inventory.service';
import { WeisserSchaeferSessionService } from '../weisser-schaefer-session.service';
import type { WsProductStock } from '../ws-product-stock';
import {
  normalizeProductStock,
  WS_PRODUCT_STOCK_OPTIONS,
  wsProductStockLabel,
} from '../ws-product-stock';

@Component({
  selector: 'pv-ws-catalog-admin',
  imports: [CurrencyPipe],
  templateUrl: './ws-catalog-admin.component.html',
  styleUrls: ['../ws-shared.scss', './ws-catalog-admin.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsCatalogAdminComponent {
  readonly catalog = inject(WeisserSchaeferCatalogService);
  readonly inventory = inject(WeisserSchaeferInventoryService);
  private readonly session = inject(WeisserSchaeferSessionService);

  readonly stockOptions = WS_PRODUCT_STOCK_OPTIONS;
  readonly normalizeProductStock = normalizeProductStock;
  readonly stockLabel = wsProductStockLabel;
  readonly categoryMsg = signal('');
  readonly categoryError = signal('');
  readonly newCategoryName = signal('');

  readonly editingId = signal<string | 'new' | null>(null);
  readonly formError = signal('');
  readonly formCategoryId = signal('');
  readonly formName = signal('');
  readonly formSpec = signal('');
  readonly formUnit = signal('');
  readonly formPrice = signal('');
  readonly formStock = signal<WsProductStock>('verfügbar');
  readonly productDeleteDialogOpen = signal(false);
  readonly productDeleteDialogName = signal('');
  readonly productDeleteDialogInput = signal('');
  readonly productDeleteDialogRequiredPhrase = signal('LOESCHEN');
  private pendingDeleteProductId: string | null = null;

  readonly showForm = computed(() => this.editingId() !== null);

  startNewProduct(categoryId?: string): void {
    const defaultCategory = categoryId ?? this.catalog.sortedCategories()[0]?.id ?? '';
    this.editingId.set('new');
    this.formError.set('');
    this.formCategoryId.set(defaultCategory);
    this.formName.set('');
    this.formSpec.set('');
    this.formUnit.set('Hank (100 m)');
    this.formPrice.set('');
    this.formStock.set('verfügbar');
  }

  startEdit(productId: string): void {
    const product = this.catalog.productById(productId);
    if (!product) {
      return;
    }
    this.editingId.set(productId);
    this.formError.set('');
    this.formCategoryId.set(product.categoryId);
    this.formName.set(product.name);
    this.formSpec.set(product.spec);
    this.formUnit.set(product.unit);
    this.formPrice.set(String(product.price));
    this.formStock.set(normalizeProductStock(product.stock));
  }

  cancelForm(): void {
    this.editingId.set(null);
    this.formError.set('');
  }

  saveProduct(): void {
    const id = this.editingId();
    const price = Number(this.formPrice().replace(',', '.'));
    const active =
      id && id !== 'new' ? (this.catalog.productById(id)?.active ?? true) : true;
    const err = this.catalog.saveProduct({
      id: id === 'new' ? undefined : id ?? undefined,
      categoryId: this.formCategoryId(),
      name: this.formName(),
      spec: this.formSpec(),
      unit: this.formUnit(),
      price,
      stock: this.formStock(),
      active,
    });
    if (err) {
      this.formError.set(err);
      return;
    }
    this.editingId.set(null);
    this.session.showToast(id === 'new' ? 'Produkt angelegt' : 'Produkt gespeichert');
  }

  addCategory(): void {
    const err = this.catalog.createCategory(this.newCategoryName());
    if (err) {
      this.categoryError.set(err);
      this.categoryMsg.set('');
      return;
    }
    this.categoryError.set('');
    this.categoryMsg.set('Kategorie angelegt.');
    this.newCategoryName.set('');
  }

  renameCategory(id: string, event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    const err = this.catalog.renameCategory(id, name);
    if (err) {
      this.session.showToast(err);
    }
  }

  removeCategory(id: string): void {
    const err = this.catalog.deleteCategory(id);
    if (err) {
      this.session.showToast(err);
      return;
    }
    this.session.showToast('Kategorie gelöscht');
  }

  deactivate(productId: string): void {
    this.catalog.setProductActive(productId, false);
    if (this.editingId() === productId) {
      this.cancelForm();
    }
    this.session.showToast('Produkt deaktiviert');
  }

  activate(productId: string): void {
    this.catalog.setProductActive(productId, true);
    this.session.showToast('Produkt aktiviert');
  }

  requestRemoveProduct(productId: string): void {
    const product = this.catalog.productById(productId);
    if (!product) {
      return;
    }
    this.pendingDeleteProductId = productId;
    this.productDeleteDialogName.set(product.name);
    this.productDeleteDialogInput.set('');
    this.productDeleteDialogOpen.set(true);
  }

  closeProductDeleteDialog(): void {
    this.productDeleteDialogOpen.set(false);
    this.productDeleteDialogName.set('');
    this.productDeleteDialogInput.set('');
    this.pendingDeleteProductId = null;
  }

  canConfirmProductDelete(): boolean {
    return (
      this.productDeleteDialogInput().trim().toUpperCase() ===
      this.productDeleteDialogRequiredPhrase()
    );
  }

  confirmRemoveProduct(): void {
    const productId = this.pendingDeleteProductId;
    if (!productId || !this.canConfirmProductDelete()) {
      return;
    }
    this.catalog.deleteProduct(productId);
    if (this.editingId() === productId) {
      this.cancelForm();
    }
    this.closeProductDeleteDialog();
    this.session.showToast('Produkt gelöscht');
  }
}
