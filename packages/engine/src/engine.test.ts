// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it, vi } from 'vitest';
import { UciEngine, type UciTransport } from './engine';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BLACK = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

/** Faux moteur : enregistre ce qu'on lui envoie, et laisse le test écrire ses réponses. */
function setup() {
  const sent: string[] = [];
  let line: (text: string) => void = () => undefined;
  let fail: (error: Error) => void = () => undefined;
  let terminated = false;
  const transport: UciTransport = {
    send: (text) => sent.push(text),
    onLine: (handler) => (line = handler),
    onError: (handler) => (fail = handler),
    terminate: () => (terminated = true),
  };
  const engine = new UciEngine(transport);
  return {
    engine,
    sent,
    emit: (text: string) => {
      line(text);
    },
    fail: (error: Error) => {
      fail(error);
    },
    terminated: () => terminated,
    handshake: () => {
      line('uciok');
      line('readyok');
    },
  };
}

describe('UciEngine', () => {
  it('se présente en UCI puis attend « readyok » avant d’analyser', async () => {
    const { engine, sent, emit } = setup();
    expect(sent).toEqual(['uci']);
    void engine.analyse(START, () => undefined);
    emit('uciok');
    expect(sent).toEqual(['uci', 'isready']);
    emit('readyok');
    await vi.waitFor(() => {
      expect(sent).toEqual(['uci', 'isready', `position fen ${START}`, 'go depth 18']);
    });
  });

  it('transmet les évaluations puis renvoie la dernière à « bestmove »', async () => {
    const { engine, sent, emit, handshake } = setup();
    handshake();
    const seen: number[] = [];
    const result = engine.analyse(START, (e) => seen.push(e.depth), 10);
    await vi.waitFor(() => {
      expect(sent).toContain('go depth 10');
    });
    emit('info depth 1 score cp 10 pv e2e4');
    emit('info string ignoré');
    emit('info depth 2 score cp 20 pv d2d4');
    emit('bestmove d2d4');
    await expect(result).resolves.toMatchObject({ depth: 2, score: { value: 20 } });
    expect(seen).toEqual([1, 2]);
  });

  it('évalue du point de vue des blancs quand les noirs ont le trait', async () => {
    const { engine, sent, emit, handshake } = setup();
    handshake();
    const result = engine.analyse(BLACK, () => undefined);
    await vi.waitFor(() => {
      expect(sent).toContain(`position fen ${BLACK}`);
    });
    emit('info depth 3 score cp 40 pv e7e5');
    emit('bestmove e7e5');
    await expect(result).resolves.toMatchObject({ score: { value: -40 } });
  });

  it('interrompt l’analyse en cours avant d’en lancer une autre, sans transmettre l’ancienne', async () => {
    const { engine, sent, emit, handshake } = setup();
    handshake();
    const old: number[] = [];
    const fresh: number[] = [];
    const first = engine.analyse(START, (e) => old.push(e.depth));
    await vi.waitFor(() => {
      expect(sent).toContain(`position fen ${START}`);
    });

    const second = engine.analyse(BLACK, (e) => fresh.push(e.depth));
    expect(sent.at(-1)).toBe('stop');
    emit('info depth 4 score cp 5 pv e2e4');
    emit('bestmove e2e4');
    await expect(first).resolves.toMatchObject({ depth: 4 });
    expect(old).toEqual([]);

    await vi.waitFor(() => {
      expect(sent).toContain(`position fen ${BLACK}`);
    });
    emit('info depth 1 score cp 0 pv e7e5');
    emit('bestmove e7e5');
    await second;
    expect(fresh).toEqual([1]);
  });

  it('abandonne une demande remplacée avant même d’avoir démarré', async () => {
    const { engine, sent, handshake } = setup();
    const skipped = engine.analyse(START, () => undefined);
    const kept = engine.analyse(BLACK, () => undefined);
    handshake();
    await expect(skipped).resolves.toBeNull();
    await vi.waitFor(() => {
      expect(sent).toContain(`position fen ${BLACK}`);
    });
    expect(sent).not.toContain(`position fen ${START}`);
    engine.dispose();
    await kept;
  });

  it('stop() interrompt et fait taire l’analyse', async () => {
    const { engine, sent, emit, handshake } = setup();
    handshake();
    const seen: number[] = [];
    const result = engine.analyse(START, (e) => seen.push(e.depth));
    await vi.waitFor(() => {
      expect(sent).toContain('go depth 18');
    });
    engine.stop();
    expect(sent.at(-1)).toBe('stop');
    emit('info depth 7 score cp 1 pv e2e4');
    emit('bestmove e2e4');
    await result;
    expect(seen).toEqual([]);
  });

  it('ne parle pas au moteur pour « stop » quand rien ne tourne', () => {
    const { engine, sent, handshake } = setup();
    handshake();
    engine.stop();
    expect(sent).toEqual(['uci', 'isready']);
  });

  it('ignore les lignes reçues hors analyse', () => {
    const { handshake, emit } = setup();
    handshake();
    expect(() => {
      emit('info depth 1 score cp 1 pv e2e4');
      emit('bestmove e2e4');
    }).not.toThrow();
  });

  it('rejette l’analyse si le moteur ne démarre pas', async () => {
    const { engine, fail } = setup();
    fail(new Error('Worker introuvable'));
    await expect(engine.analyse(START, () => undefined)).rejects.toThrow('Worker introuvable');
    await expect(engine.analyse(START, () => undefined)).rejects.toThrow('Worker introuvable');
  });

  it('dispose() arrête le moteur et libère l’analyse en cours', async () => {
    const { engine, sent, terminated, handshake } = setup();
    handshake();
    const result = engine.analyse(START, () => undefined);
    await vi.waitFor(() => {
      expect(sent).toContain('go depth 18');
    });
    engine.dispose();
    expect(terminated()).toBe(true);
    await expect(result).resolves.toBeNull();
  });
});
