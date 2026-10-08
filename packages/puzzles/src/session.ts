// SPDX-License-Identifier: GPL-3.0-or-later
import { Game, type Color, type PromotionRole, type SquareName } from '@gbc/core';
import type { Puzzle } from './puzzle';

const ROLE_OF: Record<string, PromotionRole> = {
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};
const LETTER_OF: Record<PromotionRole, string> = {
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
};

export interface PuzzleState {
  fen: string;
  turn: Color;
  /** Camp de l'utilisateur : celui qui n'a pas joué le premier coup du problème. */
  userColor: Color;
  /**
   * `awaiting-reply` : c'est à l'adversaire de jouer (appeler `playReply`) ; `playing` : à
   * l'utilisateur ; `solved` : la solution est complète.
   */
  status: 'awaiting-reply' | 'playing' | 'solved';
  /** Coups jouables par l'utilisateur ; vide hors de son tour ou pendant un choix de promotion. */
  dests: Map<SquareName, SquareName[]>;
  lastMove: [SquareName, SquareName] | null;
  promotionPending: boolean;
  /** Résultat du dernier coup de l'utilisateur ; `null` après un coup de l'adversaire. */
  feedback: 'correct' | 'wrong' | null;
  /** Aucune erreur ni aide jusqu'ici. */
  clean: boolean;
}

/**
 * Un problème en cours. Le premier coup de la solution est celui de l'adversaire. Tout coup qui
 * mate est accepté, même s'il n'est pas celui prévu. Une erreur, un indice ou la solution montrée
 * rendent le problème « raté » (`clean` faux), mais il peut être terminé.
 */
export class PuzzleSession {
  private game: Game;
  private index = 0;
  private last: [SquareName, SquareName] | null = null;
  private pending: { from: SquareName; to: SquareName } | null = null;
  private feedback: PuzzleState['feedback'] = null;
  private mistakes = 0;
  private hinted = false;
  private revealed = false;

  constructor(readonly puzzle: Puzzle) {
    this.game = Game.fromFen(puzzle.fen);
  }

  /** `clean` : aucune erreur ni aide ; `hinted` : un indice seulement ; `failed` : erreur ou solution montrée. */
  get quality(): 'clean' | 'hinted' | 'failed' {
    if (this.mistakes > 0 || this.revealed) return 'failed';
    return this.hinted ? 'hinted' : 'clean';
  }

  /** Vrai si le problème a été résolu sans erreur ni aide. */
  get clean(): boolean {
    return this.quality === 'clean';
  }

  get state(): PuzzleState {
    const solved = this.index >= this.puzzle.moves.length;
    const awaitingReply = !solved && this.index % 2 === 0;
    const frozen = solved || awaitingReply || this.pending !== null;
    return {
      fen: this.game.fen,
      turn: this.game.turn,
      userColor: this.userColor,
      status: solved ? 'solved' : awaitingReply ? 'awaiting-reply' : 'playing',
      dests: frozen ? new Map<SquareName, SquareName[]>() : this.game.dests(),
      lastMove: this.last,
      promotionPending: this.pending !== null,
      feedback: this.feedback,
      clean: this.clean,
    };
  }

  /** Joue le coup de l'adversaire attendu ; sans effet si ce n'est pas son tour. */
  playReply(): PuzzleState {
    this.feedback = null;
    if (this.state.status === 'awaiting-reply') this.playExpected();
    return this.state;
  }

  /** Coup de l'utilisateur. Une promotion demande d'abord le choix de la pièce (`promote`). */
  userMove(from: SquareName, to: SquareName, promotion?: PromotionRole): PuzzleState {
    if (this.state.status !== 'playing') return this.state;
    if (!promotion && this.game.needsPromotion(from, to)) {
      this.pending = { from, to };
      return this.state;
    }
    this.pending = null;

    const uci = `${from}${to}${promotion ? LETTER_OF[promotion] : ''}`;
    if (uci === this.expected) {
      this.playExpected();
      this.feedback = 'correct';
    } else if (this.deliversMate(from, to, promotion)) {
      this.game.move(from, to, promotion);
      this.last = [from, to];
      this.index = this.puzzle.moves.length;
      this.feedback = 'correct';
    } else {
      this.mistakes++;
      this.feedback = 'wrong';
    }
    return this.state;
  }

  promote(role: PromotionRole): PuzzleState {
    return this.pending ? this.userMove(this.pending.from, this.pending.to, role) : this.state;
  }

  /** Case de la pièce à jouer. Compte comme une aide. */
  hint(): SquareName | null {
    if (this.state.status !== 'playing') return null;
    this.hinted = true;
    return this.expected.slice(0, 2) as SquareName;
  }

  /** Joue le coup attendu à la place de l'utilisateur. Compte comme une aide. */
  reveal(): PuzzleState {
    if (this.state.status === 'playing') {
      this.revealed = true;
      this.pending = null;
      this.playExpected();
      this.feedback = 'correct';
    }
    return this.state;
  }

  private get expected(): string {
    return this.puzzle.moves[this.index] ?? '';
  }

  private get userColor(): Color {
    return Game.fromFen(this.puzzle.fen).turn === 'white' ? 'black' : 'white';
  }

  private playExpected(): void {
    const uci = this.expected;
    const from = uci.slice(0, 2) as SquareName;
    const to = uci.slice(2, 4) as SquareName;
    if (!this.game.move(from, to, ROLE_OF[uci.slice(4, 5)])) {
      throw new Error(`Coup illégal dans le problème ${this.puzzle.id} : ${uci}`);
    }
    this.last = [from, to];
    this.index++;
  }

  private deliversMate(from: SquareName, to: SquareName, promotion?: PromotionRole): boolean {
    const copy = Game.fromFen(this.game.fen);
    return copy.move(from, to, promotion) !== null && copy.outcome()?.kind === 'checkmate';
  }
}
