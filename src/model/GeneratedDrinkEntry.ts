export interface GeneratedDrinkEntry {
  id?: string;
  round_id: string;
  is_mix: boolean;
  drink_parts: DrinkPart[];
  total_ml: number;
  mix_ratio: number | null;          // Anteil Spirit (0–1), für Anzeige
  result_alc_percent: number | null; // Resultierender ABV% des fertigen Drinks
  created_at?: string;
}

export interface DrinkPart {
  id: string;          // round_drink ID
  name: string;        // Getränkename
  amount: number;      // ml
  alc_percent: number; // ABV% dieses Anteils (0 wenn kein Alkohol)
}
