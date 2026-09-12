import type { JapaneseAnalysis } from './analyzer';

type WorkerResponse = {
  requestId: number;
  result?: JapaneseAnalysis;
  error?: string;
};

type PendingRequest = {
  resolve: (result: JapaneseAnalysis) => void;
  reject: (error: Error) => void;
};

let nextRequestId = 1;
let worker: Worker | undefined;
const pending = new Map<number, PendingRequest>();

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL('../../workers/japanese-analysis.worker.ts', import.meta.url), {
    type: 'module'
  });

  worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
    const request = pending.get(event.data.requestId);
    if (!request) return;
    pending.delete(event.data.requestId);

    if (event.data.result) {
      request.resolve(event.data.result);
    } else {
      request.reject(new Error(event.data.error ?? 'Japanese analysis failed.'));
    }
  });

  worker.addEventListener('error', () => {
    for (const request of pending.values()) {
      request.reject(new Error('Japanese analysis worker stopped unexpectedly.'));
    }
    pending.clear();
    worker = undefined;
  });

  return worker;
}

export function analyzeJapaneseInWorker(sourceText: string): Promise<JapaneseAnalysis> {
  const requestId = nextRequestId++;

  return new Promise((resolve, reject) => {
    pending.set(requestId, { resolve, reject });
    getWorker().postMessage({ requestId, sourceText });
  });
}
