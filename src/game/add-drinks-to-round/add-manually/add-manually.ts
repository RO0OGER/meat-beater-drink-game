import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase';
import { DrinkService } from '../../../services/drink';
import { DrinkCaptureDialog, DrinkCaptureResult } from '../drink-capture-dialog/drink-capture-dialog';

type DrinkType = 'mixable' | 'non-mixable' | 'dilution';

@Component({
  selector: 'app-add-manually',
  standalone: true,
  imports: [CommonModule, FormsModule, DrinkCaptureDialog],
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

  captureBarcode  = signal('');
  captureInitName = signal('');
  captureInitSize = signal<number | null>(null);
  captureInitType = signal<DrinkType | null>(null);
  captureInitAlc  = signal<number | null>(null);
  showCapture     = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
    private drinkService: DrinkService,
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

    // 2. Fallback: Open Food Facts API → show capture dialog
    const api = await this.drinkService.lookupOpenFoodFacts(this.barcode.trim());

    this.captureBarcode.set(this.barcode.trim());
    this.captureInitName.set(api?.name ?? '');
    this.captureInitSize.set(api?.volume_ml ?? null);
    this.captureInitType.set((api?.type as DrinkType) ?? null);
    this.captureInitAlc.set(api?.alc_percent ?? null);
    this.barcode = '';
    this.barcodeQuantity = 0;
    this.showCapture.set(true);
  }

  async onCaptureConfirmed(result: DrinkCaptureResult) {
    this.showCapture.set(false);

    let drinkId: string | null = null;
    if (result.barcode && result.fullSizeMl > 0) {
      const drink = await this.drinkService.createDrink({
        name:        result.name,
        barcode:     result.barcode,
        volume_ml:   result.fullSizeMl,
        type:        result.type,
        alc_percent: result.alcPercent ?? null,
      });
      drinkId = drink?.id ?? null;
    }

    const insertData: any = {
      round_id:    this.roundId,
      drink_name:  result.name,
      quantity_ml: result.quantityMl,
      used_ml: 0,
      type:        result.type,
    };
    if (drinkId)                   insertData.drink_id    = drinkId;
    if (result.alcPercent != null) insertData.alc_percent = result.alcPercent;

    await this.supabase.client.from('round_drinks').insert(insertData);
    await this.loadRoundDrinks();
  }

  onCaptureCancelled() {
    this.showCapture.set(false);
  }

  async addManually() {
    if (!this.manualDrinkName.trim() || this.manualQuantity <= 0 || !this.manualType) return;

    const insertData: any = {
      round_id:    this.roundId,
      drink_name:  this.manualDrinkName,
      quantity_ml: this.manualQuantity,
      used_ml: 0,
      type:        this.manualType,
    };
    if (this.manualAlcPercent != null && this.manualAlcPercent >= 0) {
      insertData.alc_percent = this.manualAlcPercent;
    }

    await this.supabase.client.from('round_drinks').insert(insertData);

    this.manualDrinkName  = '';
    this.manualQuantity   = 0;
    this.manualType       = '';
    this.manualAlcPercent = null;
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
