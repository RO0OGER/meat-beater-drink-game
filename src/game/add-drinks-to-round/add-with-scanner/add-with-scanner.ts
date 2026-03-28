import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase';
import { DrinkService } from '../../../services/drink';
import { Drink } from '../../../model/Drink';
import { DrinkCaptureDialog, DrinkCaptureResult } from '../drink-capture-dialog/drink-capture-dialog';
import { CameraScanner } from '../../../shared/camera-scanner/camera-scanner';

type DrinkType = 'mixable' | 'non-mixable' | 'dilution';

@Component({
  selector: 'app-add-with-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, DrinkCaptureDialog, CameraScanner],
  templateUrl: './add-with-scanner.html',
  styleUrls: ['./add-with-scanner.scss'],
})
export class AddWithScanner implements OnInit {
  gameId  = '';
  roundId = '';
  roundDrinks: any[] = [];
  scannerActive = signal(true);
  lookingUp     = signal(false);

  // Dialog for known catalog drinks
  pendingDrink    = signal<Drink | null>(null);
  pendingStep     = signal(1);
  pendingQuantity = signal(0);
  pendingFullSize = signal(0);
  pendingType     = signal<DrinkType | ''>('');
  pendingAlc      = signal<number | null>(null);

  // Dialog for unknown barcodes
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

  async onBarcodeScanned(barcode: string) {
    if (!barcode || this.lookingUp()) return;
    this.scannerActive.set(false);
    this.lookingUp.set(true);

    // 1. Check local Supabase catalog
    const drink = await this.drinkService.getDrinkByBarcode(barcode);
    if (drink) {
      this.lookingUp.set(false);
      this.pendingDrink.set(drink);
      this.pendingStep.set(1);
      this.pendingQuantity.set(drink.volume_ml);
      this.pendingFullSize.set(drink.volume_ml);
      this.pendingType.set(drink.type as DrinkType);
      this.pendingAlc.set(drink.alc_percent ?? null);
      return;
    }

    // 2. Fallback: Open Food Facts API
    const api = await this.drinkService.lookupOpenFoodFacts(barcode);
    this.lookingUp.set(false);

    this.captureBarcode.set(barcode);
    this.captureInitName.set(api?.name ?? '');
    this.captureInitSize.set(api?.volume_ml ?? null);
    this.captureInitType.set((api?.type as DrinkType) ?? null);
    this.captureInitAlc.set(api?.alc_percent ?? null);
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
    this.scannerActive.set(true);
  }

  onCaptureCancelled() {
    this.showCapture.set(false);
    this.scannerActive.set(true);
  }

  async confirmPending() {
    const drink = this.pendingDrink();
    if (!drink || !this.pendingType() || this.pendingQuantity() <= 0) return;
    const insertData: any = {
      round_id:    this.roundId,
      drink_id:    drink.id,
      drink_name:  drink.name,
      quantity_ml: this.pendingQuantity(),
      used_ml: 0,
      type: this.pendingType(),
    };
    const alc = this.pendingAlc() ?? drink.alc_percent;
    if (alc != null) insertData.alc_percent = alc;
    await this.supabase.client.from('round_drinks').insert(insertData);
    this.pendingDrink.set(null);
    this.pendingStep.set(1);
    this.scannerActive.set(true);
    await this.loadRoundDrinks();
  }

  nextStep() { if (this.pendingStep() < 3) this.pendingStep.set(this.pendingStep() + 1); }
  prevStep()  { if (this.pendingStep() > 1) this.pendingStep.set(this.pendingStep() - 1); }

  cancelPending() {
    this.pendingDrink.set(null);
    this.pendingStep.set(1);
    this.pendingAlc.set(null);
    this.scannerActive.set(true);
  }

  async loadRoundDrinks() {
    const { data } = await this.supabase.client
      .from('round_drinks').select('*').eq('round_id', this.roundId);
    this.roundDrinks = data ?? [];
  }

  async deleteDrink(id: string) {
    await this.supabase.client.from('round_drinks').delete().eq('id', id);
    await this.loadRoundDrinks();
  }

  async updateQuantity(roundDrinkId: string, quantity: number) {
    const parsed = parseInt(quantity as any, 10);
    if (isNaN(parsed) || parsed < 0) return;
    await this.supabase.client.from('round_drinks').update({ quantity_ml: parsed }).eq('id', roundDrinkId);
    await this.loadRoundDrinks();
  }

  async setToFullQuantity(roundDrinkId: string) {
    const { data } = await this.supabase.client
      .from('round_drinks').select('drink_id').eq('id', roundDrinkId).single();
    if (!data?.drink_id) return;
    const { data: drink } = await this.supabase.client
      .from('drinks').select('volume_ml').eq('id', data.drink_id).single();
    if (!drink?.volume_ml) return;
    await this.supabase.client.from('round_drinks').update({ quantity_ml: drink.volume_ml }).eq('id', roundDrinkId);
    await this.loadRoundDrinks();
  }

  hasZeroQuantity(): boolean { return this.roundDrinks.some(d => d.quantity_ml === 0); }

  back() { this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'add-drinks']); }

  trackByIndex(i: number): number { return i; }
}
