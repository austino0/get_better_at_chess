// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { formatScore, parseInfo, winPercent } from './uci';

const INFO =
  'info depth 12 seldepth 18 multipv 1 score cp 34 nodes 9000 nps 300000 pv e2e4 e7e5 g1f3';

describe('parseInfo', () => {
  it('lit la profondeur, le score et la meilleure ligne', () => {
    expect(parseInfo(INFO, true)).toEqual({
      depth: 12,
      score: { kind: 'cp', value: 34 },
      pv: ['e2e4', 'e7e5', 'g1f3'],
    });
  });

  it('ramène le score au point de vue des blancs quand les noirs jouent', () => {
    expect(parseInfo(INFO, false)?.score).toEqual({ kind: 'cp', value: -34 });
  });

  it('lit un mat', () => {
    expect(parseInfo('info depth 9 score mate -2 pv h4h2', true)?.score).toEqual({
      kind: 'mate',
      value: -2,
    });
  });

  it('accepte une évaluation sans ligne', () => {
    expect(parseInfo('info depth 0 score cp 0', true)?.pv).toEqual([]);
  });

  it.each([
    'readyok',
    'info string NNUE evaluation using nn.nnue',
    'info depth 5 currmove e2e4 currmovenumber 1',
    'info depth 12 score cp 34 lowerbound pv e2e4',
    'info depth 12 score cp 34 upperbound pv e2e4',
    'info depth x score cp 34',
    'info depth 12 score cp abc',
    'info depth 12 score wdl 3',
  ])('ignore « %s »', (line) => {
    expect(parseInfo(line, true)).toBeNull();
  });
});

describe('winPercent', () => {
  it('vaut 50 % à l’égalité et monte avec l’avantage', () => {
    expect(winPercent({ kind: 'cp', value: 0 })).toBe(50);
    expect(winPercent({ kind: 'cp', value: 200 })).toBeCloseTo(67.6, 1);
    expect(winPercent({ kind: 'cp', value: -200 })).toBeCloseTo(32.4, 1);
  });

  it('vaut 100 ou 0 quand un mat est annoncé', () => {
    expect(winPercent({ kind: 'mate', value: 3 })).toBe(100);
    expect(winPercent({ kind: 'mate', value: -3 })).toBe(0);
  });
});

describe('formatScore', () => {
  it('affiche des pions avec signe et virgule en français', () => {
    expect(formatScore({ kind: 'cp', value: 34 }, 'fr')).toBe('+0,3');
    expect(formatScore({ kind: 'cp', value: -150 }, 'fr')).toBe('-1,5');
    expect(formatScore({ kind: 'cp', value: 0 }, 'fr')).toBe('0,0');
  });

  it('affiche un mat sans signe', () => {
    expect(formatScore({ kind: 'mate', value: -4 }, 'fr')).toBe('#4');
  });
});
