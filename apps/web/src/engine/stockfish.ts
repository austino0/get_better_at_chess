// SPDX-License-Identifier: GPL-3.0-or-later
import { UciEngine, type Engine } from '@gbc/engine';

let engine: Engine | null = null;

/**
 * Stockfish 19 « lite » monothread (WASM) dans un Worker. Créé au premier appel seulement : le
 * moteur (~1,8 Mo) n'est téléchargé que si l'utilisateur active l'évaluation. Les fichiers viennent
 * de `public/stockfish` ; la version monothread n'exige pas d'en-têtes COOP/COEP.
 */
export function getEngine(): Engine {
  engine ??= createEngine();
  return engine;
}

function createEngine(): Engine {
  const worker = new Worker(`${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`);
  return new UciEngine({
    send: (line) => {
      worker.postMessage(line);
    },
    onLine: (handler) => {
      worker.onmessage = (event: MessageEvent<unknown>) => {
        if (typeof event.data === 'string') handler(event.data);
      };
    },
    onError: (handler) => {
      worker.onerror = (event) => {
        handler(new Error(event.message || 'Le moteur a échoué'));
      };
    },
    terminate: () => {
      worker.terminate();
      engine = null;
    },
  });
}
