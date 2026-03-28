import { Component, OnInit, HostListener, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase';
import { DrinkService } from '../../../services/drink';
import { AiDrinkService } from '../../../services/ai-drink.service';
import { Drink } from '../../../model/Drink';

type DrinkType = 'mixable' | 'non-mixable' | 'dilution';

@Component({
  selector: 'app-add-with-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-with-scanner.html',
  styleUrls: ['./add-with-scanner.scss'],
})
export class AddWithScanner implements OnInit {
  gameId  = '';
  roundId = '';
  roundDrinks: any[] = [];
  scannerActive  = true;
  scannedBarcode = '';
  lookingUp      = false;

  // Multi-step dialog when drink found in catalog
  pendingDrink    = signal<Drink | null>(null);
  pendingStep     = signal(1);          // 1 = quantity slider, 2 = full size, 3 = type
  pendingQuantity = signal(0);
  pendingFullSize = signal(0);
  pendingType     = signal<DrinkType | ''>('');
  pendingAlc      = signal<number | null>(null);
  aiLoading       = signal(false);

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

  @HostListener('document:keydown', ['$event'])
  handleScannerInput(event: KeyboardEvent) {
    if (!this.scannerActive) return;
    if (event.key === 'Enter') {
      this.onBarcodeScanned(this.scannedBarcode.trim());
      this.scannedBarcode = '';
    } else {
      this.scannedBarcode += event.key;
    }
  }

  async onBarcodeScanned(barcode: string) {
    if (!barcode) return;
    this.lookingUp = true;

    // 1. Check local Supabase catalog
    const drink = await this.drinkService.getDrinkByBarcode(barcode);
    if (drink) {
      this.lookingUp = false;
      this.pendingDrink.set(drink);
      this.pendingStep.set(1);
      this.pendingQuantity.set(drink.volume_ml);
      this.pendingFullSize.set(drink.volume_ml);
      this.pendingType.set(drink.type as DrinkType);
      this.pendingAlc.set(drink.alc_percent ?? null);
      this.scannerActive = false;
      // If alc_percent unknown, ask AI in background
      if (drink.alc_percent == null) this.fetchAiAlc(drink.name);
      return;
    }

    // 2. Fallback: Open Food Facts API
    const api = await this.drinkService.lookupOpenFoodFacts(barcode);
    this.lookingUp = false;

    const queryParams: Record<string, string> = { barcode, redirect: 'scan' };
    if (api?.name)        queryParams['name']   = api.name;
    if (api?.volume_ml)   queryParams['volume'] = String(api.volume_ml);
    if (api?.alc_percent != null) queryParams['alc'] = String(api.alc_percent);

    this.router.navigate(
      ['/game', this.gameId, 'round', this.roundId, 'barcode-missing'],
      { queryParams }
    );
  }

  async fetchAiAlc(name: string) {
    this.aiLoading.set(true);
    const result = await this.aiDrink.suggest(name, this.pendingFullSize());
    this.aiLoading.set(false);
    if (result.ok && result.data.alc_percent !== null) {
      this.pendingAlc.set(result.data.alc_percent);
    }
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
    this.scannerActive = true;
    await this.loadRoundDrinks();
  }

  nextStep() {
    if (this.pendingStep() < 3) this.pendingStep.set(this.pendingStep() + 1);
  }

  prevStep() {
    if (this.pendingStep() > 1) this.pendingStep.set(this.pendingStep() - 1);
  }

  cancelPending() {
    this.pendingDrink.set(null);
    this.pendingStep.set(1);
    this.pendingAlc.set(null);
    this.scannerActive = true;
  }

  async loadRoundDrinks() {
    const { data } = await this.supabase.client
      .from('round_drinks')
      .select('*')
      .eq('round_id', this.roundId);
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

  hasZeroQuantity(): boolean {
    return this.roundDrinks.some(d => d.quantity_ml === 0);
  }

  toggleScanner() {
    this.scannerActive = !this.scannerActive;
  }

  back() {
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'add-drinks']);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
