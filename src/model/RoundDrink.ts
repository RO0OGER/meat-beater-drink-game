export interface RoundDrink {
  id: string;
  round_id: string;
  drink_id?: string | null;
  drink_name: string;
  quantity_ml: number;
  used_ml: number;
  type: 'mixable' | 'non-mixable' | 'dilution';
  alc_percent: number | null;   // ABV 0–100
  created_at?: string;
}
