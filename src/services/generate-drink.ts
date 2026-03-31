import { Injectable } from '@angular/core';
import { RoundDrinkService } from './round-drink.service';
import { SupabaseService } from './supabase';
import { GeneratedDrinkEntry } from '../model/GeneratedDrinkEntry';

const TABLE = 'generated_drink_entries';

/** Ein Drink-Pool-Eintrag mit verbleibendem Volumen */
interface PoolEntry {
  roundDrinkId: string;
  name: string;
  type: 'mixable' | 'non-mixable' | 'dilution';
  available_ml: number;
  alc_percent: number; // 0–100
}

@Injectable({ providedIn: 'root' })
export class DrinkGeneratorService {
  static readonly TARGET  = 20;
  static readonly MIN_ML  = 100;
  static readonly MAX_ML  = 350;
  constructor(
    private roundDrinkService: RoundDrinkService,
    private supabase: SupabaseService
  ) {}

  // ────────────────────────────────────────────────────────────
  // Haupt-Einstieg – generiert immer genau 20 Drinks
  // ────────────────────────────────────────────────────────────
  async generateDrinks(roundId: string): Promise<GeneratedDrinkEntry[]> {
    if (!roundId) return [];

    const roundDrinks = await this.roundDrinkService.getRoundDrinksByRoundId(roundId);
    if (!roundDrinks.length) {
      console.warn('generateDrinks: Keine round_drinks für Runde', roundId);
      return [];
    }

    const pool: PoolEntry[] = roundDrinks
      .filter(d => (d.quantity_ml ?? 0) >= DrinkGeneratorService.MIN_ML)
      .map(d => ({
        roundDrinkId: d.id,
        name:         d.drink_name,
        type:         d.type,
        available_ml: d.quantity_ml,
        alc_percent:  d.alc_percent ?? 0,
      }));

    if (!pool.length) {
      console.warn('generateDrinks: Kein Getränk hat genug Inhalt (min', DrinkGeneratorService.MIN_ML, 'ml)');
      return [];
    }

    const generated = this.buildDrinks(roundId, pool);

    if (!generated.length) {
      console.warn('generateDrinks: 0 Drinks erzeugt', { pool });
      return [];
    }

    const rows = generated.map(g => ({
      round_id:           g.round_id,
      is_mix:             g.is_mix,
      drink_parts:        g.drink_parts,
      total_ml:           g.total_ml,
      mix_ratio:          g.mix_ratio,
      result_alc_percent: g.result_alc_percent,
    }));

    const { data, error } = await this.supabase.client.from(TABLE).insert(rows).select();
    if (error) console.error('generateDrinks: INSERT fehlgeschlagen', error.code, error.message);
    else       console.log(`generateDrinks: ${data?.length ?? 0} Drinks gespeichert`);

    return generated;
  }

  // ────────────────────────────────────────────────────────────
  // Kern-Logik: genau 20 Drinks, je 100–350 ml, random
  // ────────────────────────────────────────────────────────────
  private buildDrinks(roundId: string, pool: PoolEntry[]): GeneratedDrinkEntry[] {
    const TARGET  = DrinkGeneratorService.TARGET;
    const MIN_ML  = DrinkGeneratorService.MIN_ML;
    const MAX_ML  = DrinkGeneratorService.MAX_ML;

    const spirits  = pool.filter(d => d.type === 'mixable');
    const mixers   = pool.filter(d => d.type === 'dilution');
    const straight = pool.filter(d => d.type === 'non-mixable');

    // Wie viele Mixes sollen es sein?
    const canMix = spirits.length > 0 && mixers.length > 0;
    const mixTarget = canMix ? Math.floor(TARGET * 0.45) : 0; // ~9 von 20

    const out: GeneratedDrinkEntry[] = [];

    // ── Phase 1: Mixgetränke ───────────────────────────────
    for (let i = 0; i < mixTarget && out.length < TARGET; i++) {
      const avS = spirits.filter(s => s.available_ml >= MIN_ML / 2)
                         .sort((a, b) => b.available_ml - a.available_ml);
      const avM = mixers .filter(m => m.available_ml >= MIN_ML / 2)
                         .sort((a, b) => b.available_ml - a.available_ml);
      if (!avS.length || !avM.length) break;

      const spirit = avS[Math.floor(Math.random() * Math.min(3, avS.length))];
      const mixer  = avM[Math.floor(Math.random() * Math.min(3, avM.length))];

      const total  = this.randInt(MIN_ML / 10, MAX_ML / 10) * 10;
      const frac   = this.rand(0.25, 0.45);
      const sMl    = Math.round(total * frac / 10) * 10;
      const mMl    = total - sMl;

      if (spirit.available_ml < sMl || mixer.available_ml < mMl) continue;

      const resultAlc = spirit.alc_percent > 0
        ? Math.round((sMl * spirit.alc_percent / total) * 10) / 10
        : null;

      out.push({
        round_id: roundId, is_mix: true,
        drink_parts: [
          { id: spirit.roundDrinkId, name: spirit.name, amount: sMl, alc_percent: spirit.alc_percent },
          { id: mixer.roundDrinkId,  name: mixer.name,  amount: mMl, alc_percent: 0 },
        ],
        total_ml: total, mix_ratio: sMl / total, result_alc_percent: resultAlc,
      });
      spirit.available_ml -= sMl;
      mixer.available_ml  -= mMl;
    }

    // ── Phase 2: Straight-Drinks auf 20 auffüllen ─────────
    // Pool: non-mixable zuerst, dann übrige spirits/mixers
    const straightPool: PoolEntry[] = [
      ...straight,
      ...spirits.filter(s => s.available_ml >= MIN_ML),
      ...mixers .filter(m => m.available_ml >= MIN_ML),
    ];

    const remaining = TARGET - out.length;
    for (let i = 0; i < remaining; i++) {
      const avail = straightPool.filter(d => d.available_ml >= MIN_ML);
      if (!avail.length) break;

      // Gewichtete Zufallsauswahl – mehr ml → öfter gewählt
      const totalMl = avail.reduce((s, d) => s + d.available_ml, 0);
      let rnd   = Math.random() * totalMl;
      let drink = avail[avail.length - 1];
      for (const d of avail) { rnd -= d.available_ml; if (rnd <= 0) { drink = d; break; } }

      const cap    = Math.min(drink.available_ml, MAX_ML);
      const amount = this.randInt(MIN_ML / 10, cap / 10) * 10;

      out.push({
        round_id: roundId, is_mix: false,
        drink_parts: [{ id: drink.roundDrinkId, name: drink.name, amount, alc_percent: drink.alc_percent }],
        total_ml: amount, mix_ratio: null,
        result_alc_percent: drink.alc_percent || null,
      });
      drink.available_ml -= amount;
    }

    return out;
  }


  private rand(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ────────────────────────────────────────────────────────────
  // Lese-/Lösch-Methoden (unverändert)
  // ────────────────────────────────────────────────────────────
  async getRandomGeneratedDrink(roundId: string): Promise<GeneratedDrinkEntry | null> {
    const { data, error } = await this.supabase.client
      .from(TABLE)
      .select('*')
      .eq('round_id', roundId);

    if (error || !data?.length) return null;
    return data[Math.floor(Math.random() * data.length)] as GeneratedDrinkEntry;
  }

  async deleteGeneratedDrinkById(id: string): Promise<boolean> {
    const { error } = await this.supabase.client.from(TABLE).delete().eq('id', id);
    if (error) console.error('Fehler beim Löschen:', error.message);
    return !error;
  }

  async deleteGeneratedDrinksByRoundId(roundId: string): Promise<boolean> {
    const { error } = await this.supabase.client.from(TABLE).delete().eq('round_id', roundId);
    if (error) console.error('Fehler beim Löschen aller Drinks:', error.message);
    return !error;
  }
}
