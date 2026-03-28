import { Injectable } from '@angular/core';
import { Game } from '../model/Game';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class GameService {
  constructor(private supabase: SupabaseService) {}

  async getUserGames(): Promise<Game[]> {
    const { data, error } = await this.supabase.client
      .from('games')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Fehler beim Laden der Spiele:', error.message);
      return [];
    }
    return data as Game[];
  }

  async getGameById(id: string): Promise<Game | null> {
    const { data, error } = await this.supabase.client
      .from('games')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Fehler beim Laden des Spiels:', error.message);
      return null;
    }
    return data as Game;
  }

  async createGame(name: string): Promise<Game | null> {
    const { data: { user } } = await this.supabase.client.auth.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase.client
      .from('games')
      .insert({ name, user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Fehler beim Erstellen des Spiels:', error.message);
      return null;
    }
    return data as Game;
  }

  async updateGameName(id: string, name: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('games')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Fehler beim Aktualisieren des Spiels:', error.message);
      return false;
    }
    return true;
  }

  async deleteGame(id: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('games')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Fehler beim Löschen des Spiels:', error.message);
      return false;
    }
    return true;
  }
}
