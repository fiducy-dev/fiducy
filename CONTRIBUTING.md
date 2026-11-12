# Contributing to Fiducy

Thanks for helping. Bug reports, docs fixes, framework examples and code are all welcome.

Found a security problem? Don't open an issue. Follow [SECURITY.md](SECURITY.md) instead.

## Set up

You need [Bun](https://bun.sh) 1.4 and Node 24.

```sh
git clone https://github.com/fiducy-dev/fiducy.git
cd fiducy
bun install
bun run prototype --mock
```

`bun run prototype --mock` starts the gateway, the dashboard and the demo chat on your machine, with a mock AI provider, so you need no AWS account or real API key. The repo layout is in the [README](README.md).

## Before you open a pull request

Run the same checks CI runs:

```sh
bun run lint        # Biome, formatting and imports
bun run typecheck
bun test            # unit tests plus browser end-to-end tests
```

The browser tests use Playwright's Chromium (`bunx playwright@1.56.1 install chromium` once).

Then:

1. **Keep one change per pull request.** Small PRs get reviewed and merged faster.
2. **Add or update tests** for anything you change in behaviour.
3. **Add a changeset** if you changed a published package: run `bunx changeset`, pick the packages, and describe the change for users. All `@fiducy/*` packages are released together with the same version. Docs-only and app-only changes need no changeset.
4. **Update the docs** in `apps/site/docs` when you change how something is used.

## Rules for security-sensitive code

Fiducy holds people's provider keys. Changes to `packages/core`, `packages/providers`, `apps/gateway` or `enclave/` must not:

- return, log or persist a plaintext key, or let a key reach the app server
- add a new network destination to the enclave without saying why in the PR
- weaken the KMS key policy, attestation, origin checks or rate limits

Say in the PR description how your change affects the [threat model](https://fiducy.dev/docs/security). Changes to the enclave image change its `PCR0` hash, so call that out too.

## Code style

- TypeScript, formatted and linted by Biome (`bun run lint` fixes nothing on its own; run `bunx biome check --write .`).
- Clear names over comments. Comment the "why", not the "what".
- No new dependencies without a reason in the PR. Pin exact versions.

## GitHub Actions

Pin every action to a full commit SHA with the version in a comment, like `actions/checkout@<sha> # v4.4.0`. A tag like `@v4` can be moved to different code by whoever controls that action. Dependabot bumps the pins once a month.

## How releases work

Releases come only from this repository's `main` branch, through `.github/workflows/release.yml`:

1. Merging a pull request with a changeset makes the workflow open a "Version packages" pull request.
2. Merging that pull request is the human approval for a release. The workflow then builds and publishes every `@fiducy/*` package.
3. npm accepts the upload through [trusted publishing](https://docs.npmjs.com/trusted-publishers): GitHub Actions proves to npm with a short-lived OIDC token that the upload comes from `fiducy-dev/fiducy`'s `release.yml`. There is no npm token in GitHub secrets, so a leaked secret cannot publish a package. Every release carries a provenance statement that links it to the exact commit and workflow run.

Maintainer setup, once per package on npmjs.com (Package settings, Trusted publishing):

- Publisher: GitHub Actions. Organization or user: `fiducy-dev`. Repository: `fiducy`. Workflow filename: `release.yml`. Environment: leave empty.
- Publishing access: "Require two-factor authentication and disallow tokens".
- Then delete the `NPM_TOKEN` repository secret and revoke that token on npmjs.com.

A new package needs one first publish by hand before trusted publishing can be set up for it. Every package published so far, including the `fiducy` CLI, already has one.

## License

By contributing you agree that your work is released under the [Apache-2.0 License](LICENSE).
