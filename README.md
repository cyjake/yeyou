# 葉遊 / YEYOU


A local-first literary card studio for Japanese text with correctable furigana, plus an early Chinese typography prototype. It is designed for attractive, shareable reading cards without requiring an account.

## Features

- **Accurate Furigana Rendering**: Automatically adds furigana for kanji and kanji+okurigana words using a prebuilt dictionary.
- **Okurigana Support**: Handles words with kanji followed by kana (okurigana), displaying kanji and okurigana separately for clarity.
- **Longest/Shortest Match Segmentation**: Segments Japanese text to match dictionary entries, supporting both pure kanji and okurigana forms.
- **Interactive Pronunciation Selection**: Click on kanji or kanji+okurigana units to select alternate readings from a dropdown.
- **Customizable Appearance**: Change font, colors, line height, ruby opacity, and more with palette and style controls.
- **Responsive UI**: Modern, mobile-friendly design with palette presets and live preview.
- **Hover Highlighting**: Highlights kanji, ruby, and okurigana units on hover for easy reading.
- **Curated Starter Gallery**: 25 Japanese and 20 Chinese passages, organized by mood, provenance and rights status, plus a private local collection with JSON backup.
- **Five Visual Templates**: Bunko, Cinema, Notebook, Modern Chinese and Calligraphy.
- **Reliable Export**: Deterministic SVG rendering to high-resolution PNG or print-friendly PDF, with reading, attribution, script and overflow review.
- **Chinese Prototype**: A simple Japanese/Chinese mode, Traditional-first literary examples, exact source preservation and no silent script conversion.
- **Local-first PWA**: Installable application shell, offline reuse after assets have been cached, autosaved drafts and explicit update recovery.
- **Private Creative Assistant**: Deterministic on-device recipe suggestions. Optional cloud suggestions require a separately configured same-origin server endpoint; no API key is shipped to the browser.

## How It Works

- Uses a prebuilt `kanji_to_hiragana.json` dictionary generated from JMdict and Kanjidic2.
- Segments input text by script, matches against dictionary, and renders HTML with `<ruby>`, `<rt>`, and `<span class="okurigana-group">` for okurigana.
- Okurigana is styled and highlighted separately for clarity.
- Pronunciation dropdowns are available for both kanji and okurigana units.

## Getting Started

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Start the app with `npm run dev`.
4. Open `/` in your browser.
5. Paste or type Japanese or Chinese text into the input area.
6. Adjust the visual style and export when ready.

The React/TypeScript Studio is the default application:

```sh
npm install
npm run dev
```

Open `/` for Studio. The original vanilla prototype and its archived assets remain available at `/legacy.html` and `/legacy/`.

The upgrade implementation is complete through the private-beta readiness gate. See [the beta test kit](docs/beta-test-kit.md), [content policy](docs/content-sources.md), [AI boundary](docs/ai-assistance-contract.md), and [full upgrade plan](docs/upgrade-plan.md).

## GitHub Pages

Pushes to `main` run the Pages workflow, build the app with the repository's Pages base path, upload `dist/`, and deploy that artifact. In the repository's **Settings → Pages**, select **GitHub Actions** as the publishing source.

The build remains root-safe for local development and custom domains; the configured Pages base path is applied only in CI.

## Quality Checks

The current renderer has a dependency-free Node test suite and a permanent Japanese reading benchmark:

```sh
npm test
npm run benchmark
npm run benchmark:kuromoji
npm run check
```

The benchmark separates supported baseline readings from deliberately difficult contextual readings. The latter document the cases that the planned morphological analyzer must improve rather than hiding them behind hand-picked examples.

## Dictionary Generation

- Uses dictionaries from [jmdict-simplified](https://github.com/scriptin/jmdict-simplified)
- See `extract_kanji_to_hiragana.py` for details on building the dictionary from JMdict and Kanjidic2.

## License

MIT
