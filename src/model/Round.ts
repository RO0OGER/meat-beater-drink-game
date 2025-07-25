export interface Round {
  id: string;
  round_code: string;
  team1_hits: number;
  team2_hits: number;
  is_active: boolean;
  remaining_time_team1: number;
  remaining_time_team2: number;
  num_players_team1: number;
  num_players_team2: number;
}
