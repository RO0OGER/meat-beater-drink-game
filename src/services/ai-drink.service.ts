import { Injectable } from '@angular/core';
import { environment } from '../enviroment/enviroments';

export interface DrinkAiSuggestion {
  type: 'mixable' | 'non-mixable' | 'dilution';
  alc_percent: number | null;
  volume_ml: number | null;
}

export type AiResult =
  | { ok: true;  data: DrinkAiSuggestion }
  | { ok: false; reason: 'rate_limit' | 'error' | 'no_key' };

@Injectable({ providedIn: 'root' })
export class AiDrinkService {

  async suggest(drinkName: string, knownVolumeMl?: number | null): Promise<AiResult> {
    const groqKey   = environment.groqKey;
    const openaiKey = environment.openaiKey;

    const key     = groqKey  || openaiKey;
    const baseUrl = groqKey  ? 'https://api.groq.com/openai/v1/chat/completions'
                             : 'https://api.openai.com/v1/chat/completions';
    const model   = groqKey  ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';

    if (!key || !drinkName.trim()) return { ok: false, reason: 'no_key' };

    const volumeNote = knownVolumeMl
      ? `3. volume_ml: already known as ${knownVolumeMl} — return that exact value.`
      : `3. volume_ml: the standard/most common bottle or can size in ml for this product (e.g. 330 for beer cans, 500 for beer bottles, 700 for spirits, 750 for wine). Use null if unknown.`;

    const prompt = `You are a drinks database. Given the drink name "${drinkName.trim()}", return factual data.

CRITICAL RULES:
- Energy drinks (Red Bull, Monster, Rockstar, Bang) are ALWAYS alc_percent=0, type="dilution"
- Soft drinks / sodas (Cola, Fanta, Sprite, Lemonade) are ALWAYS alc_percent=0, type="dilution"
- Water, juice, tea, coffee are ALWAYS alc_percent=0, type="dilution"
- Beer (Budweiser, Heineken, Corona, Bitburger, Erdinger, etc.) → alc_percent=4.7 to 5.5, type="non-mixable"
- Wine (Chardonnay, Merlot, Prosecco) → alc_percent=11 to 13.5, type="non-mixable"
- Spirits (Vodka, Rum, Gin, Whiskey, Tequila, Schnaps) → alc_percent=37.5 to 45, type="mixable"
- Liqueurs (Baileys, Amaretto, Jägermeister) → alc_percent=15 to 35, type="mixable"
- Pre-mixed cocktails / alcopops (Smirnoff Ice, Bacardi Breezer) → type="non-mixable"

Fields:
1. alc_percent: exact ABV as number (e.g. 4.8), or 0 for non-alcoholic, or null only if truly impossible to estimate
2. type: "mixable" | "non-mixable" | "dilution"
${volumeNote}

Respond with valid JSON only:
{"alc_percent": <number|null>, "type": "<mixable|non-mixable|dilution>", "volume_ml": <number|null>}`;

    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 80,
          temperature: 0,
        }),
      });

      if (res.status === 429) return { ok: false, reason: 'rate_limit' };
      if (!res.ok)            return { ok: false, reason: 'error' };

      const json = await res.json();
      const text = json.choices?.[0]?.message?.content?.trim() ?? '';
      const parsed = JSON.parse(text) as DrinkAiSuggestion;

      if (!['mixable', 'non-mixable', 'dilution'].includes(parsed.type)) {
        return { ok: false, reason: 'error' };
      }
      if (parsed.alc_percent !== null && (isNaN(parsed.alc_percent) || parsed.alc_percent < 0 || parsed.alc_percent > 100)) {
        parsed.alc_percent = null;
      }
      if (parsed.volume_ml !== null && (isNaN(parsed.volume_ml) || parsed.volume_ml <= 0)) {
        parsed.volume_ml = null;
      }

      return { ok: true, data: parsed };
    } catch {
      return { ok: false, reason: 'error' };
    }
  }
}
