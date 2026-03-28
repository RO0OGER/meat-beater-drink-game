export interface Round {
  id: string;
  game_id: string;
  round_code: string;
  team1_name: string;
  team2_name: string;
  team1_hits: number;
  team2_hits: number;
  is_active: boolean;
  remaining_time_team1: number;
  remaining_time_team2: number;
  created_at: string;
  // Multiplayer fields
  status: 'lobby' | 'playing' | 'ended';
  current_shooter_id: string | null;
  current_target_id: string | null;
  shooter_team: 'team1' | 'team2' | null;
  current_task_id: string | null;
  turn_number: number;
}
