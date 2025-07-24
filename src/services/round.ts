import { Injectable } from '@angular/core';
import { Round } from '../model/Round';
import {SupabaseService} from './supabase';

@Injectable({ providedIn: 'root' })
export class RoundService {
  constructor(private supabaseService: SupabaseService) {
  }

  // GET ALL
  async getAllRounds(): Promise<Round[]> {
    const {data, error} = await this.supabaseService.client.from('rounds').select('*');
    if (error) throw error;
    return data as Round[];
  }

  // GET BY CODE
  async getRoundByCode(code: string): Promise<Round | null> {
    const {data, error} = await this.supabaseService.client
      .from('rounds')
      .select('*')
      .eq('round_code', code)
      .single();
    if (error) {
      console.error('getRoundByCode failed:', error.message);
      return null;
    }
    return data as Round;
  }

  // SET CODE
  async setRoundCode(id: string, code: string): Promise<boolean> {
    const {error} = await this.supabaseService.client
      .from('rounds')
      .update({round_code: code})
      .eq('id', id);
    return !error;
  }

  // SET is_active
  async setIsActive(id: string, value: boolean): Promise<boolean> {
    const {error} = await this.supabaseService.client
      .from('rounds')
      .update({is_active: value})
      .eq('id', id);
    return !error;
  }

  // GET is_active
  async getIsActive(id: string): Promise<boolean | null> {
    const {data, error} = await this.supabaseService.client
      .from('rounds')
      .select('is_active')
      .eq('id', id)
      .single();
    return error ? null : data.is_active;
  }

  // 🔫 Hits
  async updateTeam1Hits(id: string, hits: number): Promise<boolean> {
    const {error} = await this.supabaseService.client
      .from('rounds')
      .update({team1_hits: hits})
      .eq('id', id);
    return !error;
  }

  async updateTeam2Hits(id: string, hits: number): Promise<boolean> {
    const {error} = await this.supabaseService.client
      .from('rounds')
      .update({team2_hits: hits})
      .eq('id', id);
    return !error;
  }

  async getTeam1Hits(id: string): Promise<number | null> {
    const {data, error} = await this.supabaseService.client
      .from('rounds')
      .select('team1_hits')
      .eq('id', id)
      .single();
    return error ? null : data.team1_hits;
  }

  async getTeam2Hits(id: string): Promise<number | null> {
    const {data, error} = await this.supabaseService.client
      .from('rounds')
      .select('team2_hits')
      .eq('id', id)
      .single();
    return error ? null : data.team2_hits;
  }

  // ⏱ Zeit
  async getRemainingTimeTeam1(id: string): Promise<number | null> {
    const {data, error} = await this.supabaseService.client
      .from('rounds')
      .select('remaining_time_team1')
      .eq('id', id)
      .single();
    return error ? null : data.remaining_time_team1;
  }

  async getRemainingTimeTeam2(id: string): Promise<number | null> {
    const {data, error} = await this.supabaseService.client
      .from('rounds')
      .select('remaining_time_team2')
      .eq('id', id)
      .single();
    return error ? null : data.remaining_time_team2;
  }

  async setRemainingTimeByCode(roundCode: string, team: 'team1' | 'team2', seconds: number): Promise<boolean> {
    const column = team === 'team1' ? 'remaining_time_team1' : 'remaining_time_team2';

    const { error } = await this.supabaseService.client
      .from('rounds')
      .update({ [column]: seconds })
      .eq('round_code', roundCode);

    return !error;
  }

  // 👥 Spieleranzahl
  async getNumPlayersTeam1(id: string): Promise<number | null> {
    const {data, error} = await this.supabaseService.client
      .from('rounds')
      .select('num_players_team1')
      .eq('id', id)
      .single();
    return error ? null : data.num_players_team1;
  }

  async getNumPlayersTeam2(id: string): Promise<number | null> {
    const {data, error} = await this.supabaseService.client
      .from('rounds')
      .select('num_players_team2')
      .eq('id', id)
      .single();
    return error ? null : data.num_players_team2;
  }

  async setNumPlayersTeam1(id: string, value: number): Promise<boolean> {
    const {error} = await this.supabaseService.client
      .from('rounds')
      .update({num_players_team1: value})
      .eq('id', id);
    return !error;
  }

  async setNumPlayersTeam2(id: string, value: number): Promise<boolean> {
    const {error} = await this.supabaseService.client
      .from('rounds')
      .update({num_players_team2: value})
      .eq('id', id);
    return !error;
  }

  async getIdByRoundCode(code: string): Promise<string | null> {
    const {data, error} = await this.supabaseService.client
      .from('rounds')
      .select('id')
      .eq('round_code', code)
      .single();

    if (error) {
      console.error('Fehler beim Abrufen der ID via round_code:', error.message);
      return null;
    }

    return data.id;
  }

  async createRound(
    round_code: string,
    num_players_team1: number,
    num_players_team2: number,
    time_team1: number,
    time_team2: number
  ): Promise<string | null> {
    const {data, error} = await this.supabaseService.client
      .from('rounds')
      .insert({
        round_code,
        num_players_team1,
        num_players_team2,
        remaining_time_team1: time_team1,
        remaining_time_team2: time_team2,
        team1_hits: 0,
        team2_hits: 0,
        is_active: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Fehler beim Erstellen der Runde:', error.message);
      return null;
    }

    return data.id;
  }
  async getRemainingTimeByCode(
    roundCode: string,
    team: 'team1' | 'team2'
  ): Promise<number | null> {
    const column = team === 'team1' ? 'remaining_time_team1' : 'remaining_time_team2';

    type TimeColumn = 'remaining_time_team1' | 'remaining_time_team2';
    type TimeResult = Pick<Round, TimeColumn>;

    const { data, error } = await this.supabaseService.client
      .from('rounds')
      .select(column)
      .eq('round_code', roundCode)
      .single<TimeResult>();

    if (error || !data) {
      console.error(`Fehler beim Abrufen der Zeit für ${team}:`, error?.message);
      return null;
    }

    // Typisch sicher: garantiert number durch Pick<Round, TimeColumn>
    return data[column as TimeColumn];
  }

  async deleteRoundById(id: string): Promise<boolean> {
    const { error } = await this.supabaseService.client
      .from('rounds')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Fehler beim Löschen der Runde:', error.message);
      return false;
    }

    return true;
  }

}
