---
'fiducy': patch
---

`fiducy init` writes code for the AI provider your app already uses (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` for Gemini, or `@openrouter/ai-sdk-provider`) instead of always OpenAI: the model call, the key box provider and the assistant-ui key request all follow it, and the agent prompt names every provider it found. `fiducy dev --mock` now also answers Gemini and OpenRouter calls.
