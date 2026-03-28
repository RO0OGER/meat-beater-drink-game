import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoundService } from '../../services/round';
import { Round } from '../../model/Round';

@Component({
  selector: 'app-game-page',
  templateUrl: './game-page.html',
  styleUrls: ['./game-page.scss'],
})
export class GamePage implements OnInit {
  gameId  = '';
  roundId = '';
  round: Round | null = null;
  private scannerBuffer = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roundService: RoundService
  ) {}

  async ngOnInit() {
    this.gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    this.roundId = this.route.snapshot.paramMap.get('roundId') ?? '';
    this.round   = await this.roundService.getRoundById(this.roundId);
  }

  @HostListener('document:keydown', ['$event'])
  handleScannerInput(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const value = this.scannerBuffer.trim().toLowerCase();
      if (value === 'hitteam1') this.navigateToHit('team1');
      else if (value === 'hitteam2') this.navigateToHit('team2');
      this.scannerBuffer = '';
    } else {
      this.scannerBuffer += event.key;
    }
  }

  navigateToHit(team: 'team1' | 'team2') {
    this.router.navigate(['/animation/hit', team, this.gameId, this.roundId]);
  }

  navigateToSettings() {
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'settings']);
  }

  get team1TimeFormatted(): string { return this.formatTime(this.round?.remaining_time_team1 ?? 0); }
  get team2TimeFormatted(): string { return this.formatTime(this.round?.remaining_time_team2 ?? 0); }

  readonly cupRows: number[][] = [[6,7,8,9],[3,4,5],[1,2],[0]];
  isCupHit(index: number, hits: number): boolean { return index < hits; }
  cupsRemaining(hits: number): number { return Math.max(0, 10 - hits); }

  private formatTime(s: number): string {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }
}
