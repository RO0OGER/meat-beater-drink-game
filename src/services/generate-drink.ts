import { Injectable } from '@angular/core';
import { RoundDrinkService } from './round-drink.service';
import { SupabaseService } from './supabase';
import { GeneratedDrinkEntry } from '../model/GeneratedDrinkEntry';

@Injectable({ providedIn: 'root' })
export class DrinkGeneratorService {
  constructor(
    private roundDrinkService: RoundDrinkService,
    private supabase: SupabaseService
  ) {}

  async generateDrinks(roundId: string): Promise<GeneratedDrinkEntry[]> {
    if (!roundId) {
      console.error('Ungültige roundId übergeben');
      return [];
    }

    const drinks = await this.roundDrinkService.getRoundDrinksByRoundId(roundId);

    const grouped = new Map<string, {
      drink_id: string;
      type: string;
      available_ml: number;
      round_drink_ids: string[];
    }>();

    for (const d of drinks) {
      if (!d.drink_id || !d.id || !d.type) continue;
      const existing = grouped.get(d.drink_id);
      if (existing) {
        existing.available_ml += d.quantity_ml ?? 0;
        existing.round_drink_ids.push(d.id);
      } else {
        grouped.set(d.drink_id, {
          drink_id: d.drink_id,
          type: d.type,
          available_ml: d.quantity_ml ?? 0,
          round_drink_ids: [d.id],
        });
      }
    }

    const available = Array.from(grouped.values()).filter(d => d.available_ml >= 40);
    const generated: GeneratedDrinkEntry[] = [];

    const useDrink = (drinkId: string, amount: number) => {
      const drink = available.find(d => d.drink_id === drinkId);
      if (drink) drink.available_ml -= amount;
    };

    const MAX_ITER = 500;
    let iter = 0;

    while (iter++ < MAX_ITER) {
      const amount = Math.floor(Math.random() * (250 - 100 + 1)) + 100;
      const nonMix = available.find(d => d.type === 'non-mixable' && d.available_ml >= amount);

      if (nonMix) {
        generated.push({
          round_id: roundId,
          is_mix: false,
          drink_parts: [{ id: nonMix.round_drink_ids[0], amount }],
          total_ml: amount,
          mix_ratio: null,
        });
        useDrink(nonMix.drink_id, amount);
        continue;
      }

      const mix = available.find(d => d.type === 'mixable' && d.available_ml >= 40);
      const dilution = available.find(d => d.type === 'dilution' && d.available_ml >= 40);

      if (mix && dilution) {
        const mixRatio = Math.random() * (0.30 - 0.2) + 0.2;
        const totalMl = 200;
        const alcoholMl = Math.round(totalMl * mixRatio);
        const dilutionMl = totalMl - alcoholMl;

        if (mix.available_ml >= alcoholMl && dilution.available_ml >= dilutionMl) {
          generated.push({
            round_id: roundId,
            is_mix: true,
            drink_parts: [
              { id: mix.round_drink_ids[0], amount: alcoholMl },
              { id: dilution.round_drink_ids[0], amount: dilutionMl },
            ],
            total_ml: totalMl,
            mix_ratio: mixRatio,
          });

          useDrink(mix.drink_id, alcoholMl);
          useDrink(dilution.drink_id, dilutionMl);
          continue;
        }
      }

      break;
    }

    for (const entry of generated) {
      const { error } = await this.supabase.client
        .from('generated_drinks')
        .insert([entry]);

      if (error) {
        console.error('Fehler beim Speichern in Supabase:', error);
      }
    }

    return generated;
  }


  async getRandomGeneratedDrink(roundId: string): Promise<GeneratedDrinkEntry | null> {
    const { data, error } = await this.supabase.client
      .from('generated_drinks')
      .select('*')
      .eq('round_id', roundId);

    if (error || !data || data.length === 0) {
      console.error('Fehler beim Abrufen der Drinks oder keine Daten vorhanden:', error);
      return null;
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex] as GeneratedDrinkEntry;
  }
  async deleteGeneratedDrinkById(id: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('generated_drinks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Fehler beim Löschen des generierten Drinks:', error);
      return false;
    }

    return true;
  }
  async deleteGeneratedDrinksByRoundId(roundId: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('generated_drinks')
      .delete()
      .eq('round_id', roundId);

    if (error) {
      console.error('Fehler beim Löschen aller Drinks für Runde:', error);
      return false;
    }

    return true;
  }

  async deleteGeneratedDrinksByRoundCode(roundCode: string): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from('rounds')
      .select('id')
      .eq('round_code', roundCode)
      .single();

    if (error || !data) {
      console.error('❌ Fehler beim Abrufen der Runde via round_code:', error?.message);
      return false;
    }

    return this.deleteGeneratedDrinksByRoundId(data.id);
  }
}
