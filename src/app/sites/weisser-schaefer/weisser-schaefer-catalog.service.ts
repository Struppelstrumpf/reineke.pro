import { Injectable, computed, signal } from '@angular/core';
import type {
  WsCatalogState,
  WsCategory,
  WsProduct,
  WsProductStock,
  WsShopCategoryGroup,
} from './ws-catalog.types';
import { WS_CATALOG_KEY } from './ws-catalog.types';
import { normalizeProductStock } from './ws-product-stock';

const SEED_CATALOG: WsCatalogState = {
  categories: [
    { id: 'cat-schaf', name: 'Schaf', sortOrder: 0 },
    { id: 'cat-lamm', name: 'Lamm', sortOrder: 1 },
    { id: 'cat-ziege', name: 'Ziege', sortOrder: 2 },
  ],
  products: [
    {
      id: 'sd-24',
      categoryId: 'cat-schaf',
      name: 'Schafsdarm Natur',
      spec: 'Kaliber 24–26 mm · gesalzen',
      unit: 'Hank (100 m)',
      price: 89,
      stock: 'verfügbar',
      sortOrder: 0,
      active: true,
    },
    {
      id: 'sd-28',
      categoryId: 'cat-schaf',
      name: 'Schafsdarm Natur',
      spec: 'Kaliber 28–30 mm · gesalzen',
      unit: 'Hank (100 m)',
      price: 94,
      stock: 'verfügbar',
      sortOrder: 1,
      active: true,
    },
    {
      id: 'ld-prem',
      categoryId: 'cat-lamm',
      name: 'Lammdarm Premium',
      spec: 'Kaliber 22–24 mm · selektiert',
      unit: 'Hank (100 m)',
      price: 112,
      stock: 'Bestand',
      sortOrder: 0,
      active: true,
    },
    {
      id: 'zg-spez',
      categoryId: 'cat-ziege',
      name: 'Ziegenhülle Spezial',
      spec: 'Feinkaliber · für Wurstspezialitäten',
      unit: 'Hank (50 m)',
      price: 78,
      stock: 'auf Anfrage',
      sortOrder: 0,
      active: true,
    },
  ],
};

function sortByOrder<T extends { sortOrder: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

function reindex<T extends { sortOrder: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, sortOrder: index }));
}

function slugId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

@Injectable({ providedIn: 'root' })
export class WeisserSchaeferCatalogService {
  private readonly categories = signal<WsCategory[]>(this.loadCatalog().categories);
  private readonly products = signal<WsProduct[]>(this.loadCatalog().products);

  readonly sortedCategories = computed(() => sortByOrder(this.categories()));
  readonly activeProducts = computed(() => this.products().filter((product) => product.active));
  readonly inactiveProducts = computed(() =>
    sortByOrder(this.products().filter((product) => !product.active)),
  );

  readonly shopGroups = computed((): WsShopCategoryGroup[] => {
    const categories = this.sortedCategories();
    const products = sortByOrder(this.activeProducts());
    return categories
      .map((category) => ({
        category,
        products: products.filter((product) => product.categoryId === category.id),
      }))
      .filter((group) => group.products.length > 0);
  });

  productById(id: string): WsProduct | undefined {
    return this.products().find((product) => product.id === id);
  }

  categoryName(categoryId: string): string {
    return this.categories().find((category) => category.id === categoryId)?.name ?? '—';
  }

  createCategory(name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'Bitte einen Kategorienamen eingeben.';
    }
    if (this.categories().some((category) => category.name.toLowerCase() === trimmed.toLowerCase())) {
      return 'Diese Kategorie existiert bereits.';
    }
    const category: WsCategory = {
      id: slugId('cat'),
      name: trimmed,
      sortOrder: this.categories().length,
    };
    this.categories.update((list) => [...list, category]);
    this.persist();
    return null;
  }

  renameCategory(id: string, name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'Bitte einen Kategorienamen eingeben.';
    }
    this.categories.update((list) =>
      list.map((category) => (category.id === id ? { ...category, name: trimmed } : category)),
    );
    this.persist();
    return null;
  }

  deleteCategory(id: string): string | null {
    if (this.products().some((product) => product.categoryId === id)) {
      return 'Kategorie enthält noch Produkte.';
    }
    if (this.categories().length <= 1) {
      return 'Mindestens eine Kategorie muss bestehen bleiben.';
    }
    this.categories.update((list) => reindex(list.filter((category) => category.id !== id)));
    this.persist();
    return null;
  }

  moveCategory(id: string, direction: 'up' | 'down'): void {
    const sorted = sortByOrder(this.categories());
    const index = sorted.findIndex((category) => category.id === id);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= sorted.length) {
      return;
    }
    const next = [...sorted];
    [next[index], next[target]] = [next[target], next[index]];
    this.categories.set(reindex(next));
    this.persist();
  }

  saveProduct(input: {
    id?: string;
    categoryId: string;
    name: string;
    spec: string;
    unit: string;
    price: number;
    stock: WsProductStock;
    active: boolean;
  }): string | null {
    const name = input.name.trim();
    const spec = input.spec.trim();
    const unit = input.unit.trim();
    if (!name || !spec || !unit || !input.categoryId) {
      return 'Bitte alle Pflichtfelder ausfüllen.';
    }
    if (!Number.isFinite(input.price) || input.price < 0) {
      return 'Bitte einen gültigen Preis eingeben.';
    }

    if (input.id) {
      this.products.update((list) =>
        list.map((product) =>
          product.id === input.id
            ? {
                ...product,
                categoryId: input.categoryId,
                name,
                spec,
                unit,
                price: Math.round(input.price * 100) / 100,
                stock: input.stock,
                active: input.active,
              }
            : product,
        ),
      );
      this.persist();
      return null;
    }

    const siblings = this.products().filter(
      (product) => product.categoryId === input.categoryId && product.active === input.active,
    );
    const product: WsProduct = {
      id: slugId('prod'),
      categoryId: input.categoryId,
      name,
      spec,
      unit,
      price: Math.round(input.price * 100) / 100,
      stock: input.stock,
      sortOrder: siblings.length,
      active: input.active,
    };
    this.products.update((list) => [...list, product]);
    this.persist();
    return null;
  }

  deleteProduct(id: string): void {
    const product = this.productById(id);
    if (!product) {
      return;
    }
    this.products.update((list) => {
      const filtered = list.filter((entry) => entry.id !== id);
      return this.reindexCategoryProducts(filtered, product.categoryId, product.active);
    });
    this.persist();
  }

  setProductActive(id: string, active: boolean): void {
    const product = this.productById(id);
    if (!product || product.active === active) {
      return;
    }
    this.products.update((list) => {
      const without = list.filter((entry) => entry.id !== id);
      const reindexed = this.reindexCategoryProducts(without, product.categoryId, product.active);
      const targetSiblings = reindexed.filter(
        (entry) => entry.categoryId === product.categoryId && entry.active === active,
      ).length;
      const moved: WsProduct = {
        ...product,
        active,
        sortOrder: targetSiblings,
      };
      return [...reindexed, moved];
    });
    this.persist();
  }

  moveProduct(id: string, direction: 'up' | 'down'): void {
    const product = this.productById(id);
    if (!product) {
      return;
    }
    const siblings = sortByOrder(
      this.products().filter(
        (entry) => entry.categoryId === product.categoryId && entry.active === product.active,
      ),
    );
    const index = siblings.findIndex((entry) => entry.id === id);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= siblings.length) {
      return;
    }
    const next = [...siblings];
    [next[index], next[target]] = [next[target], next[index]];
    const reordered = reindex(next);
    this.products.update((list) => {
      const others = list.filter(
        (entry) => !(entry.categoryId === product.categoryId && entry.active === product.active),
      );
      return [...others, ...reordered];
    });
    this.persist();
  }

  productsForCategory(categoryId: string, active = true): WsProduct[] {
    return sortByOrder(
      this.products().filter(
        (product) => product.categoryId === categoryId && product.active === active,
      ),
    );
  }

  private reindexCategoryProducts(
    products: WsProduct[],
    categoryId: string,
    active: boolean,
  ): WsProduct[] {
    const siblings = sortByOrder(
      products.filter((product) => product.categoryId === categoryId && product.active === active),
    );
    const reordered = reindex(siblings);
    const others = products.filter(
      (product) => !(product.categoryId === categoryId && product.active === active),
    );
    return [...others, ...reordered];
  }

  private loadCatalog(): WsCatalogState {
    try {
      const raw = localStorage.getItem(WS_CATALOG_KEY);
      if (!raw) {
        return structuredClone(SEED_CATALOG);
      }
      const parsed = JSON.parse(raw) as WsCatalogState;
      if (!parsed.categories?.length || !parsed.products?.length) {
        return structuredClone(SEED_CATALOG);
      }
      return {
        categories: sortByOrder(parsed.categories),
        products: parsed.products.map((product) => ({
          ...product,
          stock: normalizeProductStock(product.stock),
          active: product.active !== false,
        })),
      };
    } catch {
      return structuredClone(SEED_CATALOG);
    }
  }

  private persist(): void {
    const state: WsCatalogState = {
      categories: this.categories(),
      products: this.products(),
    };
    localStorage.setItem(WS_CATALOG_KEY, JSON.stringify(state));
  }
}
