import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoundService } from '../../services/round';

@Component({
  selector: 'app-round-end',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './round-end.html',
  styleUrl: './round-end.scss',
})
export class RoundEnd implements OnInit {
  gameId  = '';
  roundId = '';
  team: 'team1' | 'team2' = 'team1';
  confirmDelete = false;
  showExtend    = false;
  extraMinutes: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roundService: RoundService
  ) {}

  ngOnInit() {
    this.gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    this.roundId = this.route.snapshot.paramMap.get('roundId') ?? '';
    const t = this.route.snapshot.paramMap.get('team') ?? 'team1';
    this.team = t === 'team2' ? 'team2' : 'team1';
  }

  // Cascade-delete on round removes round_drinks + generated_drink_entries automatically
  async deleteEverything() {
    await this.roundService.deleteRoundById(this.roundId);
    this.router.navigate(['/game', this.gameId]);
  }

  async applyExtraTime() {
    if (!this.extraMinutes || this.extraMinutes <= 0) return;
    await this.roundService.addRemainingTime(this.roundId, this.team, this.extraMinutes * 60);
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'countdown', this.team, 'none']);
  }

  confirmAndDelete() { this.confirmDelete = true; }
  cancelDelete()     { this.confirmDelete = false; }
  toggleExtend()     { this.showExtend = true; }
}
