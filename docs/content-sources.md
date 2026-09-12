# Built-in content policy and sources

The starter gallery is deliberately reviewed and finite: pre-modern haiku, public-domain Japanese prose and poetry, classical Chinese selections, and a separately marked product-demo excerpt. The purpose is to remove empty-canvas friction without presenting every bundled quotation as if it had the same rights status.

## Editorial policy

- The Japanese source line is stored exactly as shown in the gallery record. Modern kana and punctuation may be used for readability; this is editorial normalization, not a claim of diplomatic transcription.
- Japanese reading kana is reviewed data and remains correctable in the editor.
- Chinese translations and modern-language explanations are original editorial copy made for this project. The UI labels them as editorial.
- Every record has an explicit rights status. Public-domain records have a provenance URL; product-demo excerpts are visibly distinguished from them.
- Author-level source pages are used when a stable work-level permalink is unavailable. This limitation is visible in the data rather than hidden.
- New entries must identify whether their interpretation is editorial or AI-assisted.

## Source collections

- Aozora Bunko: its own guide describes the collection as works whose copyright has expired or whose publication has been permitted.
- Aozora Bunko author records: Matsuo Bashō and Yosa Buson.
- Japanese Wikisource author record: Kobayashi Issa.
- Chinese Wikisource work pages for the Chinese classical selections.

The exact URLs are stored beside each entry in `src/content/passages.ts` so the gallery and exported project data do not depend on this document staying in sync.

## Adding contemporary material

Do not add a quotation merely because it is popular on social media. Record the permission or license, keep the excerpt within that permission, and preserve author/work attribution. User-pasted text can be saved to the browser-only **我的例句** shelf, but is not automatically promoted into the built-in gallery. That shelf can be backed up and restored as JSON.
