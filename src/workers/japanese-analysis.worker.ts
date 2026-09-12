import kuromoji, { type Tokenizer } from '@faanau/kuromoji';
import { type JapaneseDictionary } from '../domain/japanese/analyzer';
import { analyzeJapaneseHybrid } from '../domain/japanese/hybrid-analyzer';

type AnalysisRequest = {
  requestId: number;
  sourceText: string;
};

let resourcesPromise: Promise<{ entries: JapaneseDictionary; tokenizer: Tokenizer }> | undefined;

self.addEventListener('message', async (event: MessageEvent<AnalysisRequest>) => {
  const { requestId, sourceText } = event.data;

  try {
    const resources = await loadResources();
    const result = analyzeJapaneseHybrid(sourceText, resources.entries, resources.tokenizer);
    self.postMessage({ requestId, result });
  } catch (error) {
    self.postMessage({
      requestId,
      error: error instanceof Error ? error.message : 'Japanese analysis failed.'
    });
  }
});

function loadResources() {
  if (!resourcesPromise) {
    const baseUrl = import.meta.env.BASE_URL;
    const dictionaryPromise = fetch(`${baseUrl}kanji_to_hiragana.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Japanese dictionary failed to load (${response.status}).`);
        }
        return response.json() as Promise<JapaneseDictionary>;
      })
      .then(entries => entries);

    const tokenizerPromise = new Promise<Tokenizer>((resolve, reject) => {
      kuromoji.builder({ dicPath: `${baseUrl}kuromoji` }).build((error, tokenizer) => {
        if (error) reject(error);
        else resolve(tokenizer);
      });
    });

    resourcesPromise = Promise.all([dictionaryPromise, tokenizerPromise])
      .then(([entries, tokenizer]) => ({ entries, tokenizer }));
  }

  return resourcesPromise;
}
