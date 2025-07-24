import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase';
import {RoundService} from '../../../services/round';
import {DrinkGeneratorService} from '../../../services/generate-drink';

type DrinkType = 'mixable' | 'non-mixable' | 'dilution';

@Component({
  selector: 'app-add-manually',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-manually.html',
  styleUrls: ['./add-manually.scss'],
})
export class AddManually implements OnInit {
  barcode = '';
  barcodeQuantity: number = 0;

  manualDrinkName = '';
  manualQuantity: number = 0;
  manualType: DrinkType | '' = '';

  roundCode = '';
  roundId = '';
  roundDrinks: any[] = [];

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private route: ActivatedRoute,
    private roundService: RoundService,
    private drinkGeneratorService: DrinkGeneratorService
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

  async loadRoundDrinks() {
    const { data, error } = await this.supabase.client
      .from('round_drinks')
      .select('*')
      .eq('round_id', this.roundId);

    if (!error && data) {
      this.roundDrinks = data;
    } else {
      console.error('Fehler beim Laden der Getränke:', error?.message);
    }
  }

  async addByBarcode() {
    if (!this.barcode.trim() || this.barcodeQuantity <= 0) return;

    const { data, error } = await this.supabase.client
      .from('drinks')
      .select('*')
      .eq('barcode', this.barcode)
      .single();

    if (error || !data) {
      this.router.navigate(
        ['/barcode-is-missing', this.roundCode],
        { queryParams: { barcode: this.barcode, redirect: 'add-drink-manual' } }
      );
    } else {
      await this.supabase.client.from('round_drinks').insert({
        round_id: this.roundId,
        drink_id: data.id,
        quantity_ml: this.barcodeQuantity,
        used_ml: 0,
        drink_name: data.name,
        type: data.type, // ← Wird automatisch aus drinks übernommen
      });

      this.barcode = '';
      this.barcodeQuantity = 0;
      await this.loadRoundDrinks();
    }
  }

  async addManually() {
    if (!this.manualDrinkName.trim() || this.manualQuantity <= 0 || !this.manualType) return;

    await this.supabase.client.from('round_drinks').insert({
      round_id: this.roundId,
      quantity_ml: this.manualQuantity,
      used_ml: 0,
      drink_name: this.manualDrinkName,
      type: this.manualType,
    });

    this.manualDrinkName = '';
    this.manualQuantity = 0;
    this.manualType = '';
    await this.loadRoundDrinks();
  }

  async deleteDrink(id: string) {
    await this.supabase.client.from('round_drinks').delete().eq('id', id);
    await this.loadRoundDrinks();
  }

  backToOverview() {
    this.router.navigate(['/add-drinks', this.roundCode]);
  }

  async startGame() {
    const roundId = await this.roundService.getIdByRoundCode(this.roundCode);
    if (!roundId) {
      console.error('Runde nicht gefunden');
      return;
    }

    // 👉 erst aufräumen (egal ob es schon welche gibt)
    const deleted = await this.drinkGeneratorService.deleteGeneratedDrinksByRoundId(roundId);
    if (!deleted) {
      // kein Hard-Stop nötig – kann trotzdem weitergehen
      console.warn('Konnte vorhandene generated_drinks nicht (vollständig) löschen.');
    }

    const result = await this.drinkGeneratorService.generateDrinks(roundId);

    if (typeof result === 'string') {
      alert(result); // z. B. "Das gegnerische Team darf den Drink bestimmen"
      return;
    }

    this.router.navigate(['/animation/start-round', this.roundCode]);
  }
}
