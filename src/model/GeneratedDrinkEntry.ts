export interface GeneratedDrinkEntry {
  id?: string; // optional, da von Supabase generiert
  round_id: string;
  is_mix: boolean;
  drink_parts: DrinkPart[]; // jsonb array
  total_ml: number;
  mix_ratio: number | null;
  created_at?: string; // wird von Supabase automatisch gesetzt
}

export interface DrinkPart {
  id: string;    // ID des verwendeten RoundDrinks
  amount: number; // Menge in ml
}
