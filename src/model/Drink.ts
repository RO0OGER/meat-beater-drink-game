export interface Drink {
  id: string;
  name: string;
  barcode: string | null;
  volume_ml: number;
  type: 'mixable' | 'non-mixable' | 'dilution';
  alc_percent: number | null;   // ABV 0–100, z.B. 40 für Vodka, 5 für Bier
  created_by: string | null;
  is_global: boolean;
  created_at: string;
}
