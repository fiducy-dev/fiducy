---
'fiducy': minor
'@fiducy/assistant-ui': patch
---

`fiducy init` asks where users add their key: in the chat, on the settings page, or on a page you name (`--widget chat|settings|/route`). It detects assistant-ui and AI SDK `useChat` to default to the chat, falls back to settings when there is no chat UI, and tells your coding agent never to put the key box in a header or layout. The model snippet now uses `createOpenAI(settings).responses(...)`, since some OpenAI models (such as gpt-6-luna) reject tools with reasoning on Chat Completions.
