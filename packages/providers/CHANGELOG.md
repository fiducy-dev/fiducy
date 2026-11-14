# @fiducy/providers

## 0.3.0-beta.8

### Minor Changes

- [#86](https://github.com/fiducy-dev/fiducy/pull/86) [`72ba699`](https://github.com/fiducy-dev/fiducy/commit/72ba6996103aaf84d3dc51b6dd8bc0c3d844fdf2) Thanks [@Benonii](https://github.com/Benonii)! - Add `meterRequest`, `findModelPrice` and `estimateCostInMicrodollars` for spend limits. `meterRequest` caps a request's output tokens and turns on OpenAI stream usage. Token usage now counts Anthropic cache tokens as input and Gemini thinking tokens as output, and `relayResponse` reports usage for streams that stop early, with an `outcome` of `'interrupted'`.

### Patch Changes

- [#134](https://github.com/fiducy-dev/fiducy/pull/134) [`d2bc8d7`](https://github.com/fiducy-dev/fiducy/commit/d2bc8d70d36433ed25bd90582ea2868a5aee5d02) Thanks [@Benonii](https://github.com/Benonii)! - Price list moves to `prices.json` and covers current OpenAI, Anthropic, Gemini and popular open-weight models. Model names now match only exact names or dated snapshots, so a new model is blocked instead of priced as an older one.
- Updated dependencies []:
  - @fiducy/core@0.3.0-beta.8

## 0.3.0-beta.7

### Patch Changes

- Updated dependencies [[`4359731`](https://github.com/fiducy-dev/fiducy/commit/4359731958cc2d8ae93f12a28a4267dcd8289ac4), [`c0abaa0`](https://github.com/fiducy-dev/fiducy/commit/c0abaa0c41dbfefb9d114443d979b2ad9dd4fbab)]:
  - @fiducy/core@0.3.0-beta.7

## 0.3.0-beta.6

### Patch Changes

- Updated dependencies []:
  - @fiducy/core@0.3.0-beta.6

## 0.3.0-beta.5

### Patch Changes

- Updated dependencies []:
  - @fiducy/core@0.3.0-beta.5

## 0.3.0-beta.4

### Patch Changes

- Updated dependencies []:
  - @fiducy/core@0.3.0-beta.4

## 0.3.0-beta.3

### Patch Changes

- Updated dependencies []:
  - @fiducy/core@0.3.0-beta.3

## 0.3.0-beta.2

### Patch Changes

- Updated dependencies []:
  - @fiducy/core@0.3.0-beta.2

## 0.3.0-beta.1

### Patch Changes

- Updated dependencies []:
  - @fiducy/core@0.3.0-beta.1

## 0.3.0-beta.0

### Patch Changes

- Updated dependencies [[`0386aca`](https://github.com/fiducy-dev/fiducy/commit/0386aca24899ad04a1a3df3d5135a25c8799aa02)]:
  - @fiducy/core@0.3.0-beta.0

## 0.2.0

### Patch Changes

- [#52](https://github.com/Benonii/fiducy/pull/52) [`d3048bf`](https://github.com/Benonii/fiducy/commit/d3048bfeefb28b99324b9e58fb8da369d23e6aab) Thanks [@Benonii](https://github.com/Benonii)! - Count token usage for OpenAI Responses API streams (`response.completed`), so monthly request limits and dashboard usage include apps that call `openai(...)` or `.responses(...)` through the gateway.
- Updated dependencies []:
  - @fiducy/core@0.2.0
