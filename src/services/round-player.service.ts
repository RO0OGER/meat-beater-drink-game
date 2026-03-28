import { Injectable } from '@angular/core';
import { RoundPlayer } from '../model/RoundPlayer';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class RoundPlayerService {
  constructor(private supabase: SupabaseService) {}

  getOrCreateDeviceToken(roundId: string): string {
    const key = `player_token_${roundId}`;
    let token = localStorage.getItem(key);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(key, token);
    }
    return token;
  }

  clearDeviceToken(roundId: string): void {
    localStorage.removeItem(`player_token_${roundId}`);
  }

  async joinRound(roundId: string, name: string, team: 'team1' | 'team2'): Promise<RoundPlayer | null> {
    const deviceToken = this.getOrCreateDeviceToken(roundId);
    const { data, error } = await this.supabase.client
      .from('round_players')
      .upsert({ round_id: roundId, name, team, device_token: deviceToken }, { onConflict: 'round_id,device_token' })
      .select()
      .single();

    if (error) { console.error('joinRound failed:', error.message); return null; }
    return data as RoundPlayer;
  }

  async getMyPlayer(roundId: string): Promise<RoundPlayer | null> {
    const token = localStorage.getItem(`player_token_${roundId}`);
    if (!token) return null;
    const { data } = await this.supabase.client
      .from('round_players')
      .select('*')
      .eq('round_id', roundId)
      .eq('device_token', token)
      .maybeSingle();
    return (data as RoundPlayer) ?? null;
  }

  async getPlayersByRound(roundId: string): Promise<RoundPlayer[]> {
    const { data } = await this.supabase.client
      .from('round_players')
      .select('*')
      .eq('round_id', roundId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    return (data as RoundPlayer[]) ?? [];
  }

  async incrementDrinkCount(playerId: string): Promise<void> {
    const { data } = await this.supabase.client
      .from('round_players')
      .select('drink_count')
      .eq('id', playerId)
      .single();
    if (data) {
      await this.supabase.client
        .from('round_players')
        .update({ drink_count: (data.drink_count ?? 0) + 1 })
        .eq('id', playerId);
    }
  }
}
