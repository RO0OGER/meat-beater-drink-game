/**
 * Löscht alle Runden-Daten aus Supabase.
 * Reihenfolge: round_players → round_drinks → rounds
 *
 * Ausführen: node scripts/clean-rounds.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kxisuwdykhhqycgzupsa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aXN1d2R5a2hocXljZ3p1cHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjQzMDUsImV4cCI6MjA5MDEwMDMwNX0.uEZwW7YonEQJpwMpkyzjfnbpOrYoK5K97Q9ovWeaCWU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function clean() {
  console.log('🧹 Starte Cleanup...\n');

  const steps = [
    { table: 'round_players', label: 'Spieler' },
    { table: 'round_drinks',  label: 'Getränke' },
    { table: 'rounds',        label: 'Runden'   },
  ];

  for (const { table, label } of steps) {
    const { error, count } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // delete all rows
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error(`❌ Fehler bei ${label} (${table}): ${error.message}`);
    } else {
      console.log(`✅ ${label} (${table}) geleert`);
    }
  }

  console.log('\n✨ Cleanup abgeschlossen.');
}

clean();
