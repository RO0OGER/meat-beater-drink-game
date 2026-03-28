import { Injectable } from '@angular/core';
import { Round } from '../model/Round';
import { RoundPlayer } from '../model/RoundPlayer';
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
        num_players_team1: 0,
        num_players_team2: 0,
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

  async getRoundByCode(code: string): Promise<Round | null> {
    const { data, error } = await this.supabase.client
      .from('rounds')
      .select('*')
      .eq('round_code', code)
      .maybeSingle();
    return (data as Round) ?? null;
  }

  /** Sets status=playing and picks first shooter from team1. */
  async startGame(roundId: string, players: RoundPlayer[], taskId: string | null): Promise<boolean> {
    const team1 = players.filter(p => p.team === 'team1');
    if (!team1.length) return false;
    return this.updateRound(roundId, {
      status: 'playing',
      turn_number: 0,
      current_shooter_id: team1[0].id,
      shooter_team: 'team1',
      current_target_id: null,
      current_task_id: taskId,
    } as Partial<Round>);
  }

  /** After a hit: picks a random player from the defending team and sets them as target. */
  async registerHit(roundId: string, shooterTeam: 'team1' | 'team2', players: RoundPlayer[], taskId: string): Promise<boolean> {
    const defendingTeam = shooterTeam === 'team1' ? 'team2' : 'team1';
    const targets = players.filter(p => p.team === defendingTeam);
    if (!targets.length) return false;
    const target = targets[Math.floor(Math.random() * targets.length)];
    return this.updateRound(roundId, {
      current_target_id: target.id,
      current_task_id: taskId,
    } as Partial<Round>);
  }

  /** After a miss or after the target drinks: advances to the next shooter. */
  async advanceTurn(roundId: string, players: RoundPlayer[]): Promise<boolean> {
    const round = await this.getRoundById(roundId);
    if (!round) return false;

    const nextTurn = (round.turn_number ?? 0) + 1;
    const nextTeam: 'team1' | 'team2' = nextTurn % 2 === 0 ? 'team1' : 'team2';
    const teamPlayers = players.filter(p => p.team === nextTeam);
    if (!teamPlayers.length) return false;

    const idx = Math.floor(nextTurn / 2) % teamPlayers.length;
    return this.updateRound(roundId, {
      turn_number: nextTurn,
      current_shooter_id: teamPlayers[idx].id,
      shooter_team: nextTeam,
      current_target_id: null,
      current_task_id: null,
    } as Partial<Round>);
  }

  async endGame(roundId: string): Promise<boolean> {
    return this.updateRound(roundId, { status: 'ended' } as Partial<Round>);
  }
}
