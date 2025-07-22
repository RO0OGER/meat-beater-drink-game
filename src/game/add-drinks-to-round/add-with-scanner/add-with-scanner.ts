import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../services/supabase';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-with-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-with-scanner.html',
  styleUrls: ['./add-with-scanner.scss'],
})
export class AddWithScanner implements OnInit {
  roundCode = '';
  roundId = '';
  roundDrinks: any[] = [];
  scannerActive = true;
  scannedBarcode = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService
  ) {}

  async ngOnInit() {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';

    const { data, error } = await this.supabase.client
      .from('rounds')
      .select('id')
      .eq('round_code', this.roundCode)
      .single();

    if (error || !data) {
      console.error('Runde nicht gefunden:', error?.message);
      return;
    }

    this.roundId = data.id;
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

    const { data, error } = await this.supabase.client
      .from('drinks')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (error || !data) {
      this.router.navigate(
        ['/barcode-is-missing', this.roundCode],
        { queryParams: { barcode, redirect: 'add-drink-scan' } }
      );
    } else {
      await this.supabase.client.from('round_drinks').insert({
        round_id: this.roundId,
        drink_id: data.id,
        quantity_ml: 0,
        used_ml: 0,
        drink_name: data.name,
        type: data.type
      });

      await this.loadRoundDrinks();
    }
  }

  toggleScanner() {
    this.scannerActive = !this.scannerActive;
  }

  async loadRoundDrinks() {
    const { data, error } = await this.supabase.client
      .from('round_drinks')
      .select('*')
      .eq('round_id', this.roundId);

    if (!error && data) {
      this.roundDrinks = data;
    }
  }

  async deleteDrink(id: string) {
    await this.supabase.client.from('round_drinks').delete().eq('id', id);
    await this.loadRoundDrinks();
  }

  backToOverview() {
    this.router.navigate(['/add-drinks', this.roundCode]);
  }

  startGame() {
    if (this.hasZeroQuantity()) return;
    this.router.navigate(['/game', this.roundCode]);
  }

  async updateQuantity(roundDrinkId: string, quantity: number) {
    const parsedQuantity = parseInt(quantity as any);
    if (isNaN(parsedQuantity) || parsedQuantity < 0) return;

    await this.supabase.client
      .from('round_drinks')
      .update({ quantity_ml: parsedQuantity })
      .eq('id', roundDrinkId);

    await this.loadRoundDrinks();
  }

  hasZeroQuantity(): boolean {
    return this.roundDrinks.some((drink) => drink.quantity_ml === 0);
  }

  async setToFullQuantity(roundDrinkId: string) {
    const { data: drinkData, error } = await this.supabase.client
      .from('round_drinks')
      .select('drink_id')
      .eq('id', roundDrinkId)
      .single();

    if (!drinkData?.drink_id || error) return;

    const { data: drink, error: drinkError } = await this.supabase.client
      .from('drinks')
      .select('volume_ml')
      .eq('id', drinkData.drink_id)
      .single();

    if (drinkError || !drink?.volume_ml) return;

    await this.supabase.client
      .from('round_drinks')
      .update({ quantity_ml: drink.volume_ml })
      .eq('id', roundDrinkId);

    await this.loadRoundDrinks();
  }
}

