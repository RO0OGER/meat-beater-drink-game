import {
  Component, OnInit, OnDestroy, OnChanges,
  input, output, signal, viewChild, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

@Component({
  selector: 'app-camera-scanner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './camera-scanner.html',
  styleUrls: ['./camera-scanner.scss'],
})
export class CameraScanner implements OnInit, OnDestroy, OnChanges {
  active  = input<boolean>(true);
  scanned = output<string>();

  videoEl = viewChild<ElementRef<HTMLVideoElement>>('video');

  status  = signal<'idle' | 'requesting' | 'scanning' | 'error'>('idle');
  errorMsg = signal('');
  lastCode = signal('');
  private controls: IScannerControls | null = null;
  private reader = new BrowserMultiFormatReader();
  private cooldown = false;

  ngOnInit() {
    if (this.active()) this.startCamera();
  }

  ngOnChanges() {
    if (this.active()) {
      this.startCamera();
    } else {
      this.stopCamera();
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  async startCamera() {
    if (this.status() === 'scanning' || this.status() === 'requesting') return;
    this.status.set('requesting');
    this.errorMsg.set('');

    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (!devices.length) throw new Error('Keine Kamera gefunden.');

      // Prefer back camera on mobile
      const back = devices.find(d =>
        /back|rear|environment/i.test(d.label)
      ) ?? devices[devices.length - 1];

      const video = this.videoEl()?.nativeElement;
      if (!video) throw new Error('Video-Element nicht bereit.');

      this.controls = await this.reader.decodeFromVideoDevice(
        back.deviceId,
        video,
        (result, err) => {
          if (!result || this.cooldown) return;
          const code = result.getText();
          if (code === this.lastCode()) return; // skip duplicates
          this.cooldown = true;
          this.lastCode.set(code);
          this.scanned.emit(code);
          setTimeout(() => {
            this.cooldown = false;
            this.lastCode.set('');
          }, 2000);
        }
      );
      this.status.set('scanning');
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Kamera konnte nicht geöffnet werden.');
      this.status.set('error');
    }
  }

  stopCamera() {
    this.controls?.stop();
    this.controls = null;
    if (this.status() === 'scanning') this.status.set('idle');
  }

  retry() {
    this.status.set('idle');
    this.startCamera();
  }
}
