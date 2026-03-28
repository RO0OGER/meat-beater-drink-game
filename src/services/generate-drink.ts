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
  constructor(
    private roundDrinkService: RoundDrinkService,
    private supabase: SupabaseService
  ) {}

  // ────────────────────────────────────────────────────────────
  // Haupt-Einstieg
  // ────────────────────────────────────────────────────────────
  async generateDrinks(roundId: string): Promise<GeneratedDrinkEntry[]> {
    if (!roundId) return [];

    const roundDrinks = await this.roundDrinkService.getRoundDrinksByRoundId(roundId);

    // Pool aufbauen – alle Getränke unabhängig von drink_id
    const pool: PoolEntry[] = roundDrinks
      .filter(d => (d.quantity_ml ?? 0) > 0)
      .map(d => ({
        roundDrinkId: d.id,
        name: d.drink_name,
        type: d.type,
        available_ml: d.quantity_ml,
        alc_percent: d.alc_percent ?? 0,
      }));

    const spirits  = pool.filter(d => d.type === 'mixable');
    const mixers   = pool.filter(d => d.type === 'dilution');
    const straight = pool.filter(d => d.type === 'non-mixable');

    const generated: GeneratedDrinkEntry[] = [];

    // 1. Gemischte Drinks generieren
    this.generateMixes(roundId, spirits, mixers, generated);

    // 2. Unvermischte Drinks generieren
    this.generateStraight(roundId, straight, generated);

    // Batch-Insert in Supabase
    if (generated.length > 0) {
      const { error } = await this.supabase.client.from(TABLE).insert(generated);
      if (error) console.error('Fehler beim Speichern der Drinks:', error.message);
    }

    return generated;
  }

  // ────────────────────────────────────────────────────────────
  // Misch-Algorithmus
  // Ziel-ABV zufällig wählen, Spirit-Menge daraus berechnen
  // ────────────────────────────────────────────────────────────
  private generateMixes(
    roundId: string,
    spirits: PoolEntry[],
    mixers: PoolEntry[],
    out: GeneratedDrinkEntry[]
  ): void {
    const TOTAL_ML = 200;
    const MIN_SPIRIT_ML = 25;
    const MIN_MIXER_ML  = 60;

    // Solange Spirits + Mixer vorhanden
    while (true) {
      // Sortieren: meisten Vorrat zuerst → gleichmäßige Nutzung aller Flaschen
      const availSpirits = spirits
        .filter(s => s.available_ml >= MIN_SPIRIT_ML)
        .sort((a, b) => b.available_ml - a.available_ml);
      const availMixers = mixers
        .filter(m => m.available_ml >= MIN_MIXER_ML)
        .sort((a, b) => b.available_ml - a.available_ml);

      if (!availSpirits.length || !availMixers.length) break;

      // Unter den Top-3 zufällig wählen → Vielfalt
      const spirit = availSpirits[Math.floor(Math.random() * Math.min(3, availSpirits.length))];
      const mixer  = availMixers [Math.floor(Math.random() * Math.min(3, availMixers.length))];

      // ── Ziel-ABV + Spirit-Menge berechnen ──────────────────
      let spiritMl: number;
      let resultAlc: number | null = null;
      let mixRatio: number | null  = null;

      if (spirit.alc_percent > 0) {
        // Ziel-ABV zufällig zwischen 8 % und 18 %
        const targetAbv = this.rand(8, 18);

        // Formel: spirit_ml = total_ml * target_abv / spirit_abv
        spiritMl = Math.round(TOTAL_ML * (targetAbv / 100) / (spirit.alc_percent / 100));

        // Vernünftige Grenzen: 25–100 ml Spirit
        spiritMl = Math.max(MIN_SPIRIT_ML, Math.min(100, spiritMl));

        resultAlc = Math.round((spiritMl * spirit.alc_percent / TOTAL_ML) * 10) / 10;
        mixRatio  = spiritMl / TOTAL_ML;
      } else {
        // Kein ABV-Wert → Daumenregel: 1/4 Spirit
        spiritMl = Math.round(TOTAL_ML * 0.25);
      }

      const mixerMl = TOTAL_ML - spiritMl;

      // ── Genug Vorrat? ──────────────────────────────────────
      if (spirit.available_ml < spiritMl || mixer.available_ml < mixerMl) {
        // Mit dem, was noch da ist, skalieren
        const scale = Math.min(
          spirit.available_ml / spiritMl,
          mixer.available_ml  / mixerMl
        );
        const sMl = Math.floor(spiritMl * scale);
        const mMl = Math.floor(mixerMl  * scale);

        if (sMl < MIN_SPIRIT_ML || mMl < MIN_MIXER_ML) break;

        const scaledAlc = spirit.alc_percent > 0
          ? Math.round((sMl * spirit.alc_percent / (sMl + mMl)) * 10) / 10
          : null;

        out.push(this.buildMix(roundId, spirit, sMl, mixer, mMl, scaledAlc));
        spirit.available_ml -= sMl;
        mixer.available_ml  -= mMl;
        break;
      }

      out.push(this.buildMix(roundId, spirit, spiritMl, mixer, mixerMl, resultAlc, mixRatio));
      spirit.available_ml -= spiritMl;
      mixer.available_ml  -= mixerMl;
    }
  }

  private buildMix(
    roundId: string,
    spirit: PoolEntry, spiritMl: number,
    mixer:  PoolEntry, mixerMl:  number,
    resultAlc: number | null,
    mixRatio?: number | null
  ): GeneratedDrinkEntry {
    return {
      round_id: roundId,
      is_mix: true,
      drink_parts: [
        { id: spirit.roundDrinkId, amount: spiritMl, alc_percent: spirit.alc_percent },
        { id: mixer.roundDrinkId,  amount: mixerMl,  alc_percent: 0 },
      ],
      total_ml: spiritMl + mixerMl,
      mix_ratio: mixRatio ?? (spiritMl / (spiritMl + mixerMl)),
      result_alc_percent: resultAlc,
    };
  }

  // ────────────────────────────────────────────────────────────
  // Unvermischte Drinks (Bier, Wein, Softdrinks)
  // Portionsgröße je nach ABV
  // ────────────────────────────────────────────────────────────
  private generateStraight(
    roundId: string,
    straight: PoolEntry[],
    out: GeneratedDrinkEntry[]
  ): void {
    for (const drink of straight) {
      const portion = this.portionSize(drink.alc_percent);
      let remaining = drink.available_ml;

      while (remaining >= portion * 0.6) {
        const amount = Math.min(remaining, portion);
        out.push({
          round_id: roundId,
          is_mix: false,
          drink_parts: [{ id: drink.roundDrinkId, amount, alc_percent: drink.alc_percent }],
          total_ml: amount,
          mix_ratio: null,
          result_alc_percent: drink.alc_percent || null,
        });
        remaining -= amount;
      }
    }
  }

  /** Standardportionsgröße basierend auf ABV */
  private portionSize(alc: number): number {
    if (alc >= 25)  return 60;   // Schnaps / Destillat → doppelter Shot
    if (alc >= 12)  return 150;  // Wein / Sekt
    if (alc >= 3)   return 300;  // Bier / Cider
    return 330;                   // Alkoholfrei
  }

  private rand(min: number, max: number): number {
    return Math.random() * (max - min) + min;
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
