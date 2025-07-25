import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type DrinkType = 'mixable' | 'non-mixable' | 'dilution';

@Component({
  selector: 'app-barcode-is-missing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './barcode-is-missing.html',
  styleUrls: ['./barcode-is-missing.scss'],
})
export class BarcodeIsMissing {
  drinkName = signal('');
  quantityMl = signal<number | null>(null);
  fullSizeMl = signal<number | null>(null);
  barcode = signal('');
  type = signal<DrinkType | ''>('');
  roundCode = '';
  redirectTo: 'add-drink-scan' | 'add-drink-manual' = 'add-drink-manual';

  errorName = signal('');
  errorQuantity = signal('');
  errorFullSize = signal('');
  errorType = signal('');
  statusMessage = signal('');
  statusType = signal<'success' | 'error' | ''>('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService
  ) {}

  ngOnInit() {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';
    this.barcode.set(this.route.snapshot.queryParamMap.get('barcode') ?? '');
    this.redirectTo = (this.route.snapshot.queryParamMap.get('redirect') as any) ?? 'add-drink-manual';
  }

  async addDrink() {
    this.errorName.set('');
    this.errorQuantity.set('');
    this.errorFullSize.set('');
    this.errorType.set('');
    this.statusMessage.set('');
    this.statusType.set('');

    let valid = true;

    if (!this.drinkName().trim()) {
      this.errorName.set('Getränkename darf nicht leer sein.');
      valid = false;
    }

    if (!this.quantityMl() || this.quantityMl()! <= 0) {
      this.errorQuantity.set('Bitte eine gültige verwendete Menge eingeben.');
      valid = false;
    }

    if (this.fullSizeMl() !== null && this.fullSizeMl()! < 0) {
      this.errorFullSize.set('Volle Größe darf nicht negativ sein.');
      valid = false;
    }

    if (!this.type()) {
      this.errorType.set('Bitte einen Typ wählen.');
      valid = false;
    }

    if (!valid) return;

    const { data: round, error: roundError } = await this.supabase.client
      .from('rounds')
      .select('id')
      .eq('round_code', this.roundCode)
      .single();

    if (roundError || !round) {
      this.statusMessage.set('Runde nicht gefunden.');
      this.statusType.set('error');
      return;
    }

    let drinkId: string | null = null;

    // Nur speichern, wenn barcode und volle Größe vorhanden
    if (this.barcode().trim() && this.fullSizeMl() && this.fullSizeMl()! > 0) {
      const { data: drink, error: drinkError } = await this.supabase.client
        .from('drinks')
        .insert({
          name: this.drinkName(),
          barcode: this.barcode().trim(),
          volume_ml: this.fullSizeMl(),
          type: this.type(),
        })
        .select()
        .single();

      if (drinkError || !drink) {
        this.statusMessage.set('Fehler beim Speichern des Getränks in drinks.');
        this.statusType.set('error');
        return;
      }

      drinkId = drink.id;
    }

    const insertData: any = {
      round_id: round.id,
      quantity_ml: this.quantityMl(),
      used_ml: 0,
      drink_name: this.drinkName(),
      type: this.type(),
    };

    if (drinkId) insertData.drink_id = drinkId;

    const { error: insertError } = await this.supabase.client
      .from('round_drinks')
      .insert(insertData);

    if (insertError) {
      this.statusMessage.set('Fehler beim Speichern in round_drinks.');
      this.statusType.set('error');
      return;
    }

    this.statusMessage.set('Getränk erfolgreich hinzugefügt!');
    this.statusType.set('success');

    setTimeout(() => {
      this.router.navigate(['/' + this.redirectTo, this.roundCode]);
    }, 1000);
  }
}
