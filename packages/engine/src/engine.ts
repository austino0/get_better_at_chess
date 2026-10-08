// SPDX-License-Identifier: GPL-3.0-or-later
import { parseInfo, type Evaluation } from './uci';

/** Canal de texte vers un moteur UCI (Worker WASM aujourd'hui, processus natif plus tard). */
export interface UciTransport {
  send(line: string): void;
  onLine(handler: (line: string) => void): void;
  onError(handler: (error: Error) => void): void;
  terminate(): void;
}

export interface Engine {
  /**
   * Analyse une position et renvoie la dernière évaluation (`null` si interrompue avant la
   * première). Une nouvelle demande ou `stop()` interrompt la précédente ; les évaluations d'une
   * analyse interrompue ne sont plus transmises à `onInfo`.
   */
  analyse(
    fen: string,
    onInfo: (evaluation: Evaluation) => void,
    depth?: number,
  ): Promise<Evaluation | null>;
  stop(): void;
  dispose(): void;
}

interface Job {
  token: number;
  whiteToMove: boolean;
  onInfo: (evaluation: Evaluation) => void;
  last: Evaluation | null;
  done: (evaluation: Evaluation | null) => void;
}

/** Moteur UCI (Stockfish) derrière un `UciTransport`. Une seule analyse à la fois. */
export class UciEngine implements Engine {
  private readonly ready: Promise<void>;
  private queue: Promise<unknown> = Promise.resolve();
  private latest = 0;
  private job: Job | null = null;

  constructor(private readonly transport: UciTransport) {
    this.ready = new Promise((resolve, reject) => {
      transport.onError(reject);
      transport.onLine((line) => {
        if (line === 'uciok') transport.send('isready');
        else if (line === 'readyok') resolve();
        else this.handle(line);
      });
    });
    // Évite une alerte « rejet non traité » tant que personne n'a demandé d'analyse.
    this.ready.catch(() => undefined);
    transport.send('uci');
  }

  analyse(
    fen: string,
    onInfo: (evaluation: Evaluation) => void,
    depth = 18,
  ): Promise<Evaluation | null> {
    const token = ++this.latest;
    this.interrupt();
    const run = this.queue.then(() => this.run(token, fen, depth, onInfo));
    this.queue = run.catch(() => null);
    return run;
  }

  stop(): void {
    this.latest++;
    this.interrupt();
  }

  dispose(): void {
    this.transport.terminate();
    this.job?.done(this.job.last);
    this.job = null;
  }

  private async run(
    token: number,
    fen: string,
    depth: number,
    onInfo: (evaluation: Evaluation) => void,
  ): Promise<Evaluation | null> {
    await this.ready;
    if (token !== this.latest) return null;
    return new Promise((done) => {
      this.job = { token, whiteToMove: fen.split(' ')[1] !== 'b', onInfo, last: null, done };
      this.transport.send(`position fen ${fen}`);
      this.transport.send(`go depth ${String(depth)}`);
    });
  }

  private interrupt(): void {
    if (this.job) this.transport.send('stop');
  }

  private handle(line: string): void {
    const job = this.job;
    if (!job) return;
    if (line.startsWith('bestmove')) {
      this.job = null;
      job.done(job.last);
      return;
    }
    const evaluation = parseInfo(line, job.whiteToMove);
    if (!evaluation) return;
    job.last = evaluation;
    if (job.token === this.latest) job.onInfo(evaluation);
  }
}
