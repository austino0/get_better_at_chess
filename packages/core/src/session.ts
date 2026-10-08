// SPDX-License-Identifier: GPL-3.0-or-later
import { Game, type Color, type Outcome, type PromotionRole, type SquareName } from './game';

export interface SessionState {
  fen: string;
  turn: Color;
  check: boolean;
  outcome: Outcome | null;
  promotionPending: boolean;
  /** Coups jouables ; vide quand la partie est finie ou qu'un choix de promotion est attendu. */
  dests: Map<SquareName, SquareName[]>;
  lastMove: [SquareName, SquareName] | null;
}

/** Une partie jouée par un utilisateur : coups, promotion en attente, dernier coup. Aucune dépendance à l'interface. */
export class Session {
  private game = Game.fromFen();
  private pending: { from: SquareName; to: SquareName } | null = null;
  private last: [SquareName, SquareName] | null = null;

  get state(): SessionState {
    const outcome = this.game.outcome();
    const frozen = outcome !== null || this.pending !== null;
    return {
      fen: this.game.fen,
      turn: this.game.turn,
      check: this.game.isCheck,
      outcome,
      promotionPending: this.pending !== null,
      dests: frozen ? new Map<SquareName, SquareName[]>() : this.game.dests(),
      lastMove: this.last,
    };
  }

  /** Coup de l'utilisateur : demande une promotion si nécessaire, sinon le joue. */
  userMove(from: SquareName, to: SquareName): SessionState {
    if (this.game.needsPromotion(from, to)) this.pending = { from, to };
    else this.play(from, to);
    return this.state;
  }

  /** Termine un coup de promotion en attente ; sans effet s'il n'y en a pas. */
  promote(role: PromotionRole): SessionState {
    if (this.pending) this.play(this.pending.from, this.pending.to, role);
    return this.state;
  }

  newGame(): SessionState {
    this.game = Game.fromFen();
    this.pending = null;
    this.last = null;
    return this.state;
  }

  private play(from: SquareName, to: SquareName, promotion?: PromotionRole): void {
    this.pending = null;
    if (this.game.move(from, to, promotion)) this.last = [from, to];
  }
}
