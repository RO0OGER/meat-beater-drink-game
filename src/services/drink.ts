import { Injectable } from '@angular/core';
import { Drink } from '../model/Drink';
import { SupabaseService } from './supabase';
import { AuthService } from './auth.service';

type DrinkType = 'mixable' | 'non-mixable' | 'dilution';

@Injectable({ providedIn: 'root' })
export class DrinkService {
  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {}

  async getDrinkByBarcode(barcode: string): Promise<Drink | null> {
    const { data, error } = await this.supabase.client
      .from('drinks')
      .select('*')
      .eq('barcode', barcode)
      .maybeSingle();

    if (error) {
      console.error('getDrinkByBarcode failed:', error.message);
      return null;
    }
    return data as Drink | null;
  }

  async lookupOpenFoodFacts(barcode: string): Promise<{
    name: string;
    volume_ml: number | null;
    alc_percent: number | null;
    type: DrinkType | null;
  } | null> {
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}` +
        `?fields=product_name,product_quantity,product_quantity_unit,nutriments,categories_tags`
      );
      if (!res.ok) return null;
      const json = await res.json();
      if (json.status !== 1 || !json.product?.product_name) return null;

      const p = json.product;

      // ── Volume ──────────────────────────────────────────────────
      let volume_ml: number | null = null;
      if (p.product_quantity) {
        const qty = parseFloat(p.product_quantity);
        if (!isNaN(qty)) {
          const unit = (p.product_quantity_unit ?? '').toLowerCase();
          volume_ml = unit === 'cl' ? Math.round(qty * 10) : Math.round(qty);
        }
      }

      // ── Alcohol ─────────────────────────────────────────────────
      // OFF stores alcohol_100g in g/100ml; convert to ABV% (÷ 0.789).
      // If someone entered the ABV directly the result would exceed 100 — cap it.
      let alc_percent: number | null = null;
      const rawAlc = p.nutriments?.['alcohol_100g'] ?? p['alcohol_100g'];
      if (rawAlc != null) {
        const alc = parseFloat(rawAlc);
        if (!isNaN(alc) && alc >= 0) {
          const converted = alc / 0.789;
          alc_percent = Math.round((converted <= 100 ? converted : alc) * 10) / 10;
        }
      }

      // ── Type from categories ─────────────────────────────────────
      const type = this.typeFromCategories(p.categories_tags ?? [], alc_percent);

      return { name: p.product_name, volume_ml, alc_percent, type };
    } catch {
      return null;
    }
  }

  private typeFromCategories(tags: string[], alc_percent: number | null): DrinkType | null {
    const t = tags.map((s: string) => s.toLowerCase());

    const isMixable = t.some(c =>
      c.includes('spirits') || c.includes('vodka') || c.includes('rum') ||
      c.includes('whisky') || c.includes('whiskey') || c.includes('gin') ||
      c.includes('tequila') || c.includes('brandy') || c.includes('cognac') ||
      c.includes('schnapps') || c.includes('schnaps') || c.includes('liqueur') ||
      c.includes('liquor') || c.includes('distilled')
    );
    if (isMixable) return 'mixable';

    const isNonMixable = t.some(c =>
      c.includes('beer') || c.includes('ale') || c.includes('lager') ||
      c.includes('stout') || c.includes('cider') || c.includes('wine') ||
      c.includes('champagne') || c.includes('prosecco') || c.includes('sekt') ||
      c.includes('alcopop') || c.includes('hard-seltzer') || c.includes('malt-beverage')
    );
    if (isNonMixable) return 'non-mixable';

    const isDilution = t.some(c =>
      c.includes('soda') || c.includes('soft-drink') || c.includes('juice') ||
      c.includes('water') || c.includes('energy-drink') || c.includes('tea') ||
      c.includes('coffee') || c.includes('syrup') || c.includes('lemonade') ||
      c.includes('cola') || c.includes('mixer') || c.includes('non-alcoholic') ||
      c.includes('alcohol-free')
    );
    if (isDilution) return 'dilution';

    // Fallback: derive from ABV
    if (alc_percent === 0) return 'dilution';
    if (alc_percent != null && alc_percent > 20) return 'mixable';
    if (alc_percent != null && alc_percent > 0)  return 'non-mixable';

    return null;
  }

  async createDrink(drink: Omit<Drink, 'id' | 'created_at' | 'created_by' | 'is_global'>): Promise<Drink | null> {
    const userId = this.auth.currentUser?.id;
    if (!userId) return null;

    const { data, error } = await this.supabase.client
      .from('drinks')
      .insert({ ...drink, created_by: userId, is_global: false })
      .select()
      .single();

    if (error) {
      console.error('createDrink failed:', error.message);
      return null;
    }
    return data as Drink;
  }
}
