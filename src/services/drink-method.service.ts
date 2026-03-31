import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';
import { DrinkMethod } from '../model/DrinkMethod';

@Injectable({ providedIn: 'root' })
export class DrinkMethodService {
  private cache: DrinkMethod[] = [];

  constructor(private supabase: SupabaseService) {}

  async getAll(): Promise<DrinkMethod[]> {
    if (this.cache.length) return this.cache;
    const { data, error } = await this.supabase.client
      .from('drink_methods')
      .select('*');
    if (error || !data) return [];
    this.cache = data as DrinkMethod[];
    return this.cache;
  }

  async getRandom(): Promise<DrinkMethod | null> {
    const all = await this.getAll();
    if (!all.length) return null;
    return all[Math.floor(Math.random() * all.length)];
  }
}
