# Japanese analyzer bake-off

Updated 2026-09-12.

## Decision

Use a hybrid Japanese analyzer in the editor:

1. Curated JMdict/Kanjidic-derived readings remain authoritative for known standalone literary words.
2. The maintained [`@faanau/kuromoji`](https://github.com/faanau/kuromoji-js) fork supplies morphological boundaries and contextual readings for inflection and unseen phrases.
3. Ambiguous results stay visible in the correction panel; manual readings remain locked across re-analysis.

This preserves the project's editorial standard while materially improving ordinary pasted text. It is not a claim that automatic Japanese reading is solved.

## Permanent-corpus result

| Adapter | Baseline | Context challenges | Result |
|---|---:|---:|---|
| Existing dictionary renderer | 40/40 | 1/10 | Excellent curated baseline; weak context |
| Kuromoji/IPADIC alone | 37/40 | 3/10 | Better morphology; unacceptable literary regressions |
| Selected hybrid | 40/40 | at least 3/10 | Preserves baseline and gains morphology |

The raw Kuromoji comparison is repeatable with `npm run benchmark:kuromoji`. The hybrid score is enforced by the integration test using the same 50-case corpus.

Examples improved by morphology include `日本橋`, `行った`, and `生ビール`. Difficult homographs, register-dependent readings, dates, and rare names such as `人気` (ひとけ), `明日` (みょうにち), and `月見里` (やまなし) still require review.

## Alternatives considered

- Original [`kuromoji.js`](https://github.com/takuyaa/kuromoji.js): proven analyzer, but its published toolchain and package have been dormant for years. The maintained fork keeps the same Apache-2.0 analyzer and IPADIC format while updating browser loading, TypeScript and current Node support.
- [`Sudachi`](https://github.com/WorksApplications/Sudachi): stronger modern segmentation options, but the browser path currently adds a large WASM dictionary payload. The evaluated [`sudachi-wasm`](https://github.com/f3liz-casa/sudachi-wasm) wrapper documents an approximately 71 MB system dictionary, which is too heavy for this mobile-first first release.

## Product cost

Kuromoji's compressed IPADIC files add roughly 17 MB before HTTP transfer caching, alongside the existing candidate-reading dictionary. They load in a Web Worker so parsing does not block the editor, but this is still significant for Chinese social-media users on mobile networks. Before public beta we should fingerprint and cache these assets, measure cold-start time on a mid-range Android phone, and consider a smaller curated dictionary bundle.
