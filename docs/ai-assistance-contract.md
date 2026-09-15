# AI assistance contract

The studio never places an API key in browser code. Official OpenAI guidance treats API keys as secrets that belong in a server environment, not in client-side applications.

The editor therefore has two layers:

1. A deterministic local recipe assistant that suggests a safe template, direction, ratio, editorial checklist and text-free texture direction without transmitting the quotation.
2. An optional same-origin endpoint configured with `VITE_AI_ASSIST_ENDPOINT`. The user must explicitly choose to send the current text. The endpoint owns authentication and calls the OpenAI Responses API with Structured Outputs, returning only the schema validated in `src/domain/ai/suggestions.ts`.

Suggested server behavior:

- Keep `OPENAI_API_KEY` in server environment or managed secrets.
- Use the Responses API and a strict JSON Schema matching `CreativeSuggestionSchema`.
- Set response storage according to the product's disclosed privacy policy.
- Generate explanations and design recipes only. Never rasterize final text with a generative image model.
- Do not silently alter source text, readings, regional script or attribution.
- Log request IDs and errors, not quotation contents.

No cloud endpoint is bundled because the repository does not yet specify a deployment provider or secret-management environment. The client contract is complete and can connect to any same-origin serverless implementation later without changing the document or renderer.

## Deferred backend: Chinese → Japanese translation

**Status: parked.** Do not add translation controls or vendor calls until a backend deployment and secret-management environment are chosen.

When backend work resumes:

- Expose a same-origin `POST /api/translate` endpoint; never ship a provider key to the browser.
- Accept explicit source and target languages, with Chinese → Japanese as the first supported direction.
- Preserve the user's Chinese source separately from the editable Japanese translation.
- Mark machine-generated translations in document provenance and require an explicit user action before translating.
- Analyze furigana only after the Japanese translation is returned; language detection must never reinterpret Chinese characters as Japanese readings.
- Evaluate DeepL and Google Cloud Translation on a short-phrase corpus before selecting a provider, including ambiguous terms such as `奶茶`.
- Add rate limits, request-size limits, timeouts and content-free error logging at the proxy.

## Deferred backend: lyric excerpt workflow

**Status: parked.** Do not add song search or lyric-specific controls until the backend plan resumes.

When backend work resumes:

- Prefer an established provider's official song-search endpoint over building a catalog or scraping music and lyrics sites.
- Access the provider through a same-origin backend endpoint so credentials, quotas and provider-specific behavior remain outside the browser.
- Search song metadata first: title, artist, lyricist, album, year, artwork reference, provider track ID and canonical source URL.
- Retrieve lyric text only from a licensed endpoint whose terms permit the intended display and quotation workflow. Never assume that searchable song metadata includes lyric-display rights.
- Keep manual song and excerpt entry as a fallback when the selected provider has metadata but no licensed lyrics.
- Let the user select or paste the exact excerpt; never import or save a complete copyrighted lyric by default.
- Preserve the excerpt exactly, attach its attribution and provider provenance, and keep the result editable before export.
- Normalize provider responses behind a small internal contract so the UI is not coupled to one vendor and a provider can be replaced later.
- Add rate limits, result caching where provider terms allow it, request timeouts and content-free error logging.
