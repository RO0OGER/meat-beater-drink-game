import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase';
import { DrinkService } from '../../../services/drink';
import { AiDrinkService, AiResult } from '../../../services/ai-drink.service';

type DrinkType = 'mixable' | 'non-mixable' | 'dilution';

@Component({
  selector: 'app-add-manually',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-manually.html',
  styleUrls: ['./add-manually.scss'],
})
export class AddManually implements OnInit {
  gameId  = '';
  roundId = '';
  roundDrinks: any[] = [];

  barcode         = '';
  barcodeQuantity = 0;
  manualDrinkName = '';
  manualQuantity  = 0;
  manualType: DrinkType | '' = '';
  manualAlcPercent: number | null = null;
  aiLoading    = signal(false);
  aiApplied    = signal(false);
  aiError      = signal('');
  aiVolumeMl: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
    private drinkService: DrinkService,
    private aiDrink: AiDrinkService
  ) {}

  async ngOnInit() {
    this.gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    this.roundId = this.route.snapshot.paramMap.get('roundId') ?? '';
    await this.loadRoundDrinks();
  }

  async loadRoundDrinks() {
    const { data } = await this.supabase.client
      .from('round_drinks')
      .select('*')
      .eq('round_id', this.roundId);
    this.roundDrinks = data ?? [];
  }

  async addByBarcode() {
    if (!this.barcode.trim()) return;

    // 1. Check local Supabase catalog
    const drink = await this.drinkService.getDrinkByBarcode(this.barcode.trim());
    if (drink) {
      await this.supabase.client.from('round_drinks').insert({
        round_id:    this.roundId,
        drink_id:    drink.id,
        drink_name:  drink.name,
        quantity_ml: this.barcodeQuantity || drink.volume_ml,
        used_ml: 0,
        type: drink.type,
      });
      this.barcode = '';
      this.barcodeQuantity = 0;
      await this.loadRoundDrinks();
      return;
    }

    // 2. Fallback: Open Food Facts API
    const api = await this.drinkService.lookupOpenFoodFacts(this.barcode.trim());

    const queryParams: Record<string, string> = { barcode: this.barcode, redirect: 'manual' };
    if (api?.name)        queryParams['name']   = api.name;
    if (api?.volume_ml)   queryParams['volume'] = String(api.volume_ml);
    if (api?.alc_percent != null) queryParams['alc'] = String(api.alc_percent);

    this.router.navigate(
      ['/game', this.gameId, 'round', this.roundId, 'barcode-missing'],
      { queryParams }
    );
  }

  async askAiForManual() {
    if (!this.manualDrinkName.trim()) return;
    this.aiLoading.set(true);
    this.aiApplied.set(false);
    this.aiError.set('');
    const result = await this.aiDrink.suggest(this.manualDrinkName);
    this.aiLoading.set(false);

    if (!result.ok) {
      if (result.reason === 'rate_limit') {
        this.aiError.set('KI-Limit erreicht – bitte kurz warten.');
      } else if (result.reason !== 'no_key') {
        this.aiError.set('KI-Anfrage fehlgeschlagen.');
      }
      return;
    }

    if (!this.manualType) this.manualType = result.data.type;
    if (this.manualAlcPercent == null && result.data.alc_percent !== null) {
      this.manualAlcPercent = result.data.alc_percent;
    }
    if (this.manualQuantity <= 0 && result.data.volume_ml !== null) {
      this.manualQuantity = result.data.volume_ml;
      this.aiVolumeMl = result.data.volume_ml;
    }
    this.aiApplied.set(true);
  }

  async addManually() {
    if (!this.manualDrinkName.trim() || this.manualQuantity <= 0 || !this.manualType) return;

    const insertData: any = {
      round_id: this.roundId,
      drink_name: this.manualDrinkName,
      quantity_ml: this.manualQuantity,
      used_ml: 0,
      type: this.manualType,
    };
    if (this.manualAlcPercent != null && this.manualAlcPercent >= 0) {
      insertData.alc_percent = this.manualAlcPercent;
    }

    await this.supabase.client.from('round_drinks').insert(insertData);

    this.manualDrinkName  = '';
    this.manualQuantity   = 0;
    this.manualType       = '';
    this.manualAlcPercent = null;
    this.aiVolumeMl       = null;
    this.aiApplied.set(false);
    await this.loadRoundDrinks();
  }

  async deleteDrink(id: string) {
    await this.supabase.client.from('round_drinks').delete().eq('id', id);
    await this.loadRoundDrinks();
  }

  back() {
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'add-drinks']);
  }
}
