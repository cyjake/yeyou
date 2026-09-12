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
