---
'@fiducy/providers': minor
---

Add `meterRequest`, `findModelPrice` and `estimateCostInMicrodollars` for spend limits. `meterRequest` caps a request's output tokens and turns on OpenAI stream usage. Token usage now counts Anthropic cache tokens as input and Gemini thinking tokens as output, and `relayResponse` reports usage for streams that stop early, with an `outcome` of `'interrupted'`.
