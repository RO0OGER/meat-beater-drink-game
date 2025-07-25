import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-game-page',
  templateUrl: './game-page.html',
  styleUrls: ['./game-page.scss'],
})
export class GamePage implements OnInit {
  roundCode = '';
  roundId = '';
  team1Hits = 0;
  team2Hits = 0;
  remainingTimeTeam1 = 0;
  remainingTimeTeam2 = 0;
  numPlayersTeam1 = 0;
  numPlayersTeam2 = 0;
  private _scannerBuffer = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService
  ) {}

  async ngOnInit() {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';

    const { data, error } = await this.supabase.client
      .from('rounds')
      .select('*')
      .eq('round_code', this.roundCode)
      .single();

    if (error || !data) {
      console.error('Runde nicht gefunden:', error?.message);
      return;
    }

    this.roundId = data.id;
    this.team1Hits = data.team1_hits ?? 0;
    this.team2Hits = data.team2_hits ?? 0;
    this.remainingTimeTeam1 = data.remaining_time_team1 ?? 0;
    this.remainingTimeTeam2 = data.remaining_time_team2 ?? 0;
    this.numPlayersTeam1 = data.num_players_team1 ?? 0;
    this.numPlayersTeam2 = data.num_players_team2 ?? 0;
  }

  @HostListener('document:keydown', ['$event'])
  handleScannerInput(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const value = this._scannerBuffer.trim().toLowerCase();
      if (value === 'hitteam1') {
        this.navigateToHitAnimation('team1');
      } else if (value === 'hitteam2') {
        this.navigateToHitAnimation('team2');
      }
      this._scannerBuffer = '';
    } else {
      this._scannerBuffer += event.key;
    }
  }

  navigateToHitAnimation(team: 'team1' | 'team2') {
    this.router.navigate([`/animation-hit`, team, this.roundCode]);
  }

  navigateToSettings() {
    this.router.navigate(['/settings', this.roundCode]);
  }

  get remainingTimeTeam1Formatted(): string {
    const min = Math.floor(this.remainingTimeTeam1 / 60);
    const sec = this.remainingTimeTeam1 % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  get remainingTimeTeam2Formatted(): string {
    const min = Math.floor(this.remainingTimeTeam2 / 60);
    const sec = this.remainingTimeTeam2 % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
}
