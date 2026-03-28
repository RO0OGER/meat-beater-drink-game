import { Injectable } from '@angular/core';
import { Round } from '../model/Round';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class RoundService {
  constructor(private supabase: SupabaseService) {}

  async getRoundById(id: string): Promise<Round | null> {
    const { data, error } = await this.supabase.client
      .from('rounds')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('getRoundById failed:', error.message);
      return null;
    }
    return data as Round;
  }

  async getRoundsByGameId(gameId: string): Promise<Round[]> {
    const { data, error } = await this.supabase.client
      .from('rounds')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getRoundsByGameId failed:', error.message);
      return [];
    }
    return data as Round[];
  }

  async createRound(
    gameId: string,
    roundCode: string,
    team1Name: string,
    team2Name: string,
    numPlayersTeam1: number,
    numPlayersTeam2: number,
    timeTeam1Seconds: number,
    timeTeam2Seconds: number
  ): Promise<Round | null> {
    const { data, error } = await this.supabase.client
      .from('rounds')
      .insert({
        game_id: gameId,
        round_code: roundCode,
        team1_name: team1Name,
        team2_name: team2Name,
        num_players_team1: numPlayersTeam1,
        num_players_team2: numPlayersTeam2,
        remaining_time_team1: timeTeam1Seconds,
        remaining_time_team2: timeTeam2Seconds,
        team1_hits: 0,
        team2_hits: 0,
        is_active: false,
      })
      .select()
      .single();

    if (error) {
      console.error('createRound failed:', error.message);
      return null;
    }
    return data as Round;
  }

  async updateRound(id: string, fields: Partial<Round>): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('rounds')
      .update(fields)
      .eq('id', id);

    if (error) {
      console.error('updateRound failed:', error.message);
      return false;
    }
    return true;
  }

  async deleteRoundById(id: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('rounds')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteRoundById failed:', error.message);
      return false;
    }
    return true;
  }

  async isCodeTaken(code: string): Promise<boolean> {
    const { data } = await this.supabase.client
      .from('rounds')
      .select('id')
      .eq('round_code', code)
      .maybeSingle();

    return !!data;
  }

  async incrementHits(roundId: string, team: 'team1' | 'team2'): Promise<boolean> {
    const round = await this.getRoundById(roundId);
    if (!round) return false;

    const field = team === 'team1' ? 'team1_hits' : 'team2_hits';
    const current = team === 'team1' ? round.team1_hits : round.team2_hits;

    return this.updateRound(roundId, { [field]: current + 1 } as Partial<Round>);
  }

  async setRemainingTime(roundId: string, team: 'team1' | 'team2', seconds: number): Promise<boolean> {
    const field = team === 'team1' ? 'remaining_time_team1' : 'remaining_time_team2';
    return this.updateRound(roundId, { [field]: seconds } as Partial<Round>);
  }

  async addRemainingTime(roundId: string, team: 'team1' | 'team2', extraSeconds: number): Promise<boolean> {
    const round = await this.getRoundById(roundId);
    if (!round) return false;

    const current = team === 'team1' ? round.remaining_time_team1 : round.remaining_time_team2;
    return this.setRemainingTime(roundId, team, current + extraSeconds);
  }
}
