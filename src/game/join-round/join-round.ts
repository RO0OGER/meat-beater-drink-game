import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoundService } from '../../services/round';
import { RoundPlayerService } from '../../services/round-player.service';
import { Round } from '../../model/Round';

@Component({
  selector: 'app-join-round',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './join-round.html',
  styleUrls: ['./join-round.scss'],
})
export class JoinRoundPage implements OnInit {
  round = signal<Round | null>(null);
  name  = signal('');
  team  = signal<'team1' | 'team2' | ''>('');
  error = signal('');
  joining = signal(false);
  alreadyJoined = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roundService: RoundService,
    private roundPlayerService: RoundPlayerService,
  ) {}

  async ngOnInit() {
    const code = this.route.snapshot.paramMap.get('roundCode') ?? '';
    const round = await this.roundService.getRoundByCode(code);
    if (!round) { this.error.set('Runde nicht gefunden.'); return; }
    if (round.status === 'ended') { this.error.set('Diese Runde ist bereits beendet.'); return; }
    this.round.set(round);

    // Check if already joined
    const existing = await this.roundPlayerService.getMyPlayer(round.id);
    if (existing) {
      this.alreadyJoined.set(true);
      this.navigateToNext(round);
    }
  }

  async join() {
    if (!this.name().trim() || !this.team()) {
      this.error.set('Bitte Name und Team wählen.');
      return;
    }
    const round = this.round();
    if (!round) return;

    this.joining.set(true);
    const player = await this.roundPlayerService.joinRound(round.id, this.name().trim(), this.team() as 'team1' | 'team2');
    this.joining.set(false);

    if (!player) { this.error.set('Beitreten fehlgeschlagen.'); return; }
    this.navigateToNext(round);
  }

  private navigateToNext(round: Round) {
    if (round.status === 'playing') {
      this.router.navigate(['/round', round.id, 'personal']);
    } else {
      this.router.navigate(['/round', round.id, 'lobby']);
    }
  }
}
