import { Injectable } from '@angular/core';
import { RoundDrink } from '../model/RoundDrink';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class RoundDrinkService {
  constructor(private supabaseService: SupabaseService) {}

  async getRoundDrinksByRoundId(roundId: string): Promise<RoundDrink[]> {
    const { data, error } = await this.supabaseService.client
      .from('round_drinks')
      .select('*')
      .eq('round_id', roundId);

    if (error) {
      console.error('Fehler beim Abrufen nach round_id:', error.message);
      return [];
    }
    return data as RoundDrink[];
  }

  async updateUsedMlById(id: string, used_ml: number): Promise<boolean> {
    const { error } = await this.supabaseService.client
      .from('round_drinks')
      .update({ used_ml })
      .eq('id', id);

    if (error) {
      console.error('Fehler beim Aktualisieren von used_ml:', error.message);
      return false;
    }
    return true;
  }

  async getUsedMlById(id: string): Promise<number | null> {
    const { data, error } = await this.supabaseService.client
      .from('round_drinks')
      .select('used_ml')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Fehler beim Abrufen von used_ml:', error.message);
      return null;
    }
    return data.used_ml;
  }

  async getQuantityMlById(id: string): Promise<number | null> {
    const { data, error } = await this.supabaseService.client
      .from('round_drinks')
      .select('quantity_ml')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Fehler beim Abrufen von quantity_ml:', error.message);
      return null;
    }
    return data.quantity_ml;
  }

  async setQuantityMlById(id: string, quantity_ml: number): Promise<boolean> {
    const { error } = await this.supabaseService.client
      .from('round_drinks')
      .update({ quantity_ml })
      .eq('id', id);

    if (error) {
      console.error('Fehler beim Setzen von quantity_ml:', error.message);
      return false;
    }
    return true;
  }

  async deleteRoundDrinkById(id: string): Promise<boolean> {
    const { error } = await this.supabaseService.client
      .from('round_drinks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Fehler beim Löschen des RoundDrink-Eintrags:', error.message);
      return false;
    }
    return true;
  }

  async getRoundDrinksWithDrinkNames(roundId: string): Promise<(RoundDrink & { drink_name: string })[]> {
    const { data, error } = await this.supabaseService.client
      .from('round_drinks')
      .select('*, drink_id(name)')
      .eq('round_id', roundId);

    if (error) {
      console.error('Fehler beim Abrufen der Drinks mit Namen:', error.message);
      return [];
    }

    return (data as any[]).map((item) => ({
      ...item,
      drink_name: item.drinks?.name ?? 'Unbekannt',
    }));
  }
  async getRoundDrinkById(id: string): Promise<RoundDrink & { drink_name: string } | null> {
    const { data, error } = await this.supabaseService.client
      .from('round_drinks')
      .select('*, drink_id(name)')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Fehler beim Abrufen von round_drink mit drink_name:', error?.message);
      return null;
    }

    return {
      ...data,
      drink_name: data.drink_id?.name ?? 'Unbekannt',
    };
  }

  async deleteAllRoundDrinksByRoundId(roundId: string): Promise<boolean> {
    const { error } = await this.supabaseService.client
      .from('round_drinks')
      .delete()
      .eq('round_id', roundId);

    if (error) {
      console.error('Fehler beim Löschen aller RoundDrinks für Runde:', error.message);
      return false;
    }

    return true;
  }
}
