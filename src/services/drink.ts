import { Injectable } from '@angular/core';
import { Drink } from '../model/Drink';
import {SupabaseService} from './supabase';

@Injectable({
  providedIn: 'root',
})
export class DrinkService {
  constructor(private supabaseService: SupabaseService) {}

  async getAllDrinks(): Promise<Drink[]> {
    const { data, error } = await this.supabaseService.client
      .from('drinks')
      .select('*');

    if (error) {
      console.error('Fehler beim Abrufen der Drinks:', error.message);
      return [];
    }

    return data as Drink[];
  }

  async getDrinkByBarcode(barcode: number): Promise<Drink | null> {
    const { data, error } = await this.supabaseService.client
      .from('drinks')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (error) {
      console.error('Fehler beim Abrufen des Drinks:', error.message);
      return null;
    }

    console.log('Gefundener Drink:', data); // 🧪 Debug
    return data as Drink;
  }

  async postDrink(drink: Omit<Drink, 'id'>): Promise<Drink | null> {
    const { data, error } = await this.supabaseService.client
      .from('drinks')
      .insert([drink])
      .select();

    if (error) {
      console.error('Fehler beim Einfügen des Drinks:', error.message);
      return null;
    }

    return data[0] as Drink;
  }
}
