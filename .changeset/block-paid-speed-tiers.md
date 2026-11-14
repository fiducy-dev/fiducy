---
'@fiducy/providers': patch
---

`meterRequest` refuses paid speed tiers with a `tier_not_metered` error, since spend limits price every call at the standard rate: OpenAI and OpenRouter `service_tier` other than `default` or `flex`, Anthropic `speed: "fast"` and Gemini `service_tier: "priority"`. OpenAI calls with no `service_tier` or `auto` are sent as `default`, so a project whose default tier is Fast can't bill above the limit.
