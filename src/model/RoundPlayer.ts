export interface RoundPlayer {
  id: string;
  round_id: string;
  name: string;
  team: 'team1' | 'team2';
  device_token: string;
  drink_count: number;
  is_active: boolean;
  created_at: string;
}
