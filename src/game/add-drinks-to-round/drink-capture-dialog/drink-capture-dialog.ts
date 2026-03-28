import { Component, OnInit, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type DrinkType = 'mixable' | 'non-mixable' | 'dilution';
type StepId    = 'name' | 'fullSize' | 'quantity' | 'type' | 'alc';

export interface DrinkCaptureResult {
  name:       string;
  fullSizeMl: number;
  quantityMl: number;
  type:       DrinkType;
  alcPercent: number | null;
  barcode:    string;
}

@Component({
  selector: 'app-drink-capture-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './drink-capture-dialog.html',
  styleUrls: ['./drink-capture-dialog.scss'],
})
export class DrinkCaptureDialog implements OnInit {
  barcode  = input('');
  initName = input('');
  initSize = input<number | null>(null);
  initType = input<DrinkType | null>(null);
  initAlc  = input<number | null>(null);

  confirmed = output<DrinkCaptureResult>();
  cancelled = output<void>();

  name     = signal('');
  fullSize = signal<number | null>(null);
  quantity = signal<number | null>(null);
  type     = signal<DrinkType | ''>('');
  alc      = signal<number | null>(null);

  steps   = signal<StepId[]>([]);
  stepIdx = signal(0);

  currentStep = computed(() => this.steps()[this.stepIdx()]);
  isLast      = computed(() => this.stepIdx() === this.steps().length - 1);

  effectiveFullSize = computed(() => this.initSize() ?? this.fullSize());

  canProceed = computed(() => {
    switch (this.currentStep()) {
      case 'name':     return this.name().trim().length > 0;
      case 'fullSize': return (this.fullSize() ?? 0) > 0;
      case 'quantity': return (this.quantity() ?? 0) > 0;
      case 'type':     return this.type() !== '';
      default:         return true;
    }
  });

  ngOnInit() {
    this.name.set(this.initName());
    this.fullSize.set(this.initSize());
    this.type.set(this.initType() ?? '');
    this.alc.set(this.initAlc());

    const s: StepId[] = [];
    if (!this.initName())        s.push('name');
    if (!this.initSize())        s.push('fullSize');
    s.push('quantity');
    if (!this.initType())        s.push('type');
    if (this.initAlc() == null)  s.push('alc');
    this.steps.set(s);

    // Pre-fill quantity from known size
    if (this.initSize()) this.quantity.set(this.initSize());
  }

  next() {
    const nextIdx = this.stepIdx() + 1;
    // Auto-fill quantity when arriving at quantity step
    if (this.steps()[nextIdx] === 'quantity' && !this.quantity()) {
      this.quantity.set(this.effectiveFullSize());
    }
    if (!this.isLast()) {
      this.stepIdx.update(i => i + 1);
    } else {
      this.submit();
    }
  }

  prev() {
    if (this.stepIdx() > 0) {
      this.stepIdx.update(i => i - 1);
    } else {
      this.cancelled.emit();
    }
  }

  submit() {
    const resolvedName     = this.initName()  || this.name();
    const resolvedFullSize = this.effectiveFullSize() ?? this.quantity()!;
    const resolvedQuantity = this.quantity()  ?? resolvedFullSize;
    const resolvedType     = (this.initType() ?? this.type()) as DrinkType;
    const resolvedAlc      = this.initAlc() != null ? this.initAlc() : this.alc();

    this.confirmed.emit({
      name:       resolvedName,
      fullSizeMl: resolvedFullSize,
      quantityMl: resolvedQuantity,
      type:       resolvedType,
      alcPercent: resolvedAlc,
      barcode:    this.barcode(),
    });
  }
}
