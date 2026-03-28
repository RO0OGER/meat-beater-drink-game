import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase';
import { DrinkService } from '../../../services/drink';

type DrinkType = 'mixable' | 'non-mixable' | 'dilution';

@Component({
  selector: 'app-barcode-is-missing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './barcode-is-missing.html',
  styleUrls: ['./barcode-is-missing.scss'],
})
export class BarcodeIsMissing implements OnInit {
  gameId  = '';
  roundId = '';
  redirectTo: 'manual' | 'scan' = 'manual';

  drinkName  = signal('');
  quantityMl = signal<number | null>(null);
  fullSizeMl = signal<number | null>(null);
  barcode    = signal('');
  type       = signal<DrinkType | ''>('');
  alcPercent = signal<number | null>(null);

  errorName     = signal('');
  errorQuantity = signal('');
  errorType     = signal('');
  statusMessage = signal('');
  statusSuccess = signal(false);

  apiFound = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
    private drinkService: DrinkService,
  ) {}

  ngOnInit() {
    this.gameId     = this.route.snapshot.paramMap.get('gameId')  ?? '';
    this.roundId    = this.route.snapshot.paramMap.get('roundId') ?? '';
    this.barcode.set(this.route.snapshot.queryParamMap.get('barcode') ?? '');
    this.redirectTo = (this.route.snapshot.queryParamMap.get('redirect') as any) ?? 'manual';

    const name   = this.route.snapshot.queryParamMap.get('name');
    const volume = this.route.snapshot.queryParamMap.get('volume');
    const alc    = this.route.snapshot.queryParamMap.get('alc');
    const type   = this.route.snapshot.queryParamMap.get('type');

    if (name) {
      this.drinkName.set(name);
      this.apiFound = true;
    }
    if (volume) {
      const parsed = parseInt(volume, 10);
      if (!isNaN(parsed)) {
        this.quantityMl.set(parsed);
        this.fullSizeMl.set(parsed);
      }
    }
    if (alc) {
      const parsed = parseFloat(alc);
      if (!isNaN(parsed) && parsed >= 0) this.alcPercent.set(parsed);
    }
    if (type && ['mixable', 'non-mixable', 'dilution'].includes(type)) {
      this.type.set(type as DrinkType);
    }
  }

  async addDrink() {
    this.errorName.set('');
    this.errorQuantity.set('');
    this.errorType.set('');
    this.statusMessage.set('');

    let valid = true;
    if (!this.drinkName().trim())                       { this.errorName.set('Name darf nicht leer sein.');   valid = false; }
    if (!this.quantityMl() || this.quantityMl()! <= 0) { this.errorQuantity.set('Menge eingeben.');          valid = false; }
    if (!this.type())                                   { this.errorType.set('Typ wählen.');                  valid = false; }
    if (!valid) return;

    let drinkId: string | null = null;

    if (this.barcode().trim() && this.fullSizeMl() && this.fullSizeMl()! > 0) {
      const drinkPayload: any = {
        name: this.drinkName(),
        barcode: this.barcode().trim(),
        volume_ml: this.fullSizeMl()!,
        type: this.type() as DrinkType,
      };
      if (this.alcPercent() != null) drinkPayload.alc_percent = this.alcPercent();
      const drink = await this.drinkService.createDrink(drinkPayload);
      drinkId = drink?.id ?? null;
    }

    const insertData: any = {
      round_id:    this.roundId,
      drink_name:  this.drinkName(),
      quantity_ml: this.quantityMl(),
      used_ml: 0,
      type: this.type(),
    };
    if (drinkId) insertData.drink_id = drinkId;
    if (this.alcPercent() != null) insertData.alc_percent = this.alcPercent();

    const { error } = await this.supabase.client.from('round_drinks').insert(insertData);

    if (error) {
      this.statusMessage.set('Fehler beim Speichern.');
      this.statusSuccess.set(false);
      return;
    }

    this.statusMessage.set('Getränk hinzugefügt!');
    this.statusSuccess.set(true);

    const target = this.redirectTo === 'scan' ? 'add-drink-scan' : 'add-drink-manual';
    setTimeout(() => {
      this.router.navigate(['/game', this.gameId, 'round', this.roundId, target]);
    }, 1000);
  }
}
