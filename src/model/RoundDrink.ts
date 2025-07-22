export interface RoundDrink {
  id: string;
  round_id: string;
  drink_id?: string | null;
  drink_name: string;
  quantity_ml: number;
  used_ml: number;
  type: 'mixable' | 'non-mixable' | 'dilution';
  created_at?: string;
}
