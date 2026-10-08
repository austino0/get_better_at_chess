// SPDX-License-Identifier: GPL-3.0-or-later
import { Chess } from 'chessops/chess';
import { chessgroundDests } from 'chessops/compat';
import { INITIAL_FEN, makeFen, parseFen } from 'chessops/fen';
import { makeSan, makeSanAndPlay } from 'chessops/san';
import type { Color, Square, SquareName } from 'chessops/types';
import {
  makeUci,
  parseSquare,
  parseUci,
  squareFile,
  squareFromCoords,
  squareRank,
} from 'chessops/util';

export type { Color, SquareName };
export type PromotionRole = 'queen' | 'rook' | 'bishop' | 'knight';

export type Outcome =
  { kind: 'checkmate'; winner: Color } | { kind: 'stalemate' } | { kind: 'insufficient-material' };

export interface MoveResult {
  san: string;
  uci: string;
  fen: string;
}

/** Une partie d'échecs standard : seul point d'entrée vers chessops pour le reste de l'application. */
export class Game {
  private constructor(private readonly position: Chess) {}

  /** Crée une partie depuis un FEN (position initiale par défaut). Lève une erreur si le FEN est invalide. */
  static fromFen(fen: string = INITIAL_FEN): Game {
    const setup = parseFen(fen).unwrap();
    return new Game(Chess.fromSetup(setup).unwrap());
  }

  get fen(): string {
    return makeFen(this.position.toSetup());
  }

  get turn(): Color {
    return this.position.turn;
  }

  get isCheck(): boolean {
    return this.position.isCheck();
  }

  /** Coups légaux, au format attendu par chessground. */
  dests(): Map<SquareName, SquareName[]> {
    return chessgroundDests(this.position);
  }

  /** Vrai si le coup `from → to` est un pion qui atteint la dernière rangée. */
  needsPromotion(from: SquareName, to: SquareName): boolean {
    const piece = this.position.board.get(parseSquare(from));
    const rank = squareRank(parseSquare(to));
    return piece?.role === 'pawn' && (rank === 0 || rank === 7);
  }

  /** Joue un coup. Renvoie `null` si le coup est illégal (la partie n'est alors pas modifiée). */
  move(from: SquareName, to: SquareName, promotion?: PromotionRole): MoveResult | null {
    const origin = parseSquare(from);
    const move = {
      from: origin,
      to: this.castlingTarget(origin, parseSquare(to)),
      ...(promotion ? { promotion } : {}),
    };
    if (!this.position.isLegal(move)) return null;
    const san = makeSanAndPlay(this.position, move);
    return { san, uci: makeUci(move), fen: this.fen };
  }

  /** Notation algébrique d'un coup UCI sans le jouer ; `null` si le coup est illégal ou mal formé. */
  sanOf(uci: string): string | null {
    const move = parseUci(uci);
    return move && this.position.isLegal(move) ? makeSan(this.position, move) : null;
  }

  outcome(): Outcome | null {
    if (this.position.isCheckmate()) return { kind: 'checkmate', winner: opposite(this.turn) };
    if (this.position.isStalemate()) return { kind: 'stalemate' };
    if (this.position.isInsufficientMaterial()) return { kind: 'insufficient-material' };
    return null;
  }

  /**
   * chessops représente le roque comme « roi vers sa tour » ; l'interface peut aussi envoyer
   * « roi de deux cases ». On convertit le second format vers le premier.
   */
  private castlingTarget(from: Square, to: Square): Square {
    const isKing = this.position.board.get(from)?.role === 'king';
    const shift = squareFile(to) - squareFile(from);
    if (!isKing || Math.abs(shift) !== 2 || squareRank(to) !== squareRank(from)) return to;
    return squareFromCoords(shift > 0 ? 7 : 0, squareRank(from)) ?? to;
  }
}

function opposite(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}
