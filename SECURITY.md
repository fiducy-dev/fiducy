# Security policy

Fiducy holds people's AI provider keys, so security reports get priority over everything else.

## Reporting a vulnerability

Please report privately. Do not open a public issue, pull request or discussion.

- **GitHub**: [Report a vulnerability](https://github.com/fiducy-dev/fiducy/security/advisories/new) on this repository. This is the preferred channel.
- **Email**: contact@fiducy.dev, with "Security" in the subject.

Include what you found, the affected package or app and version, steps to reproduce, and the impact you expect. A proof of concept helps. Never use real user keys or someone else's deployment to test.

You will get an answer within 72 hours. Confirmed issues are fixed as soon as possible, and critical ones come before any other work. We publish a GitHub security advisory once a fix is out, and within 90 days of your report at the latest. You are credited in the advisory unless you ask not to be.

## Supported versions

Fiducy is before 1.0.0. Only the latest released version of the `@fiducy/*` packages and the `main` branch get security fixes.

## Scope

In scope:

- the `@fiducy/*` npm packages (`core`, `providers`, `widget`, `sdk`, `farm`, `assistant-ui`) and the `fiducy` CLI
- the gateway (`apps/gateway`) and the enclave image (`enclave/`)
- the control plane (`apps/control-plane`)
- the AWS deployment in `infra/aws`

Out of scope:

- `demo.fiducy.dev`, `dashboard.fiducy.dev` and `gateway.fiducy.dev`: test deployments on a mock gateway with no enclave. Don't store real keys there.
- issues that need a compromised AWS Nitro hypervisor or KMS
- use of keys through the gateway by someone who holds a customer's app secret and handles. That is by design: spend limits and freezing the app bound it, and no request returns a plaintext key. A way around a spend limit or a freeze is in scope
- anything that needs a customer's AWS root user
- denial of service by volume, and missing best-practice headers with no shown impact

## What Fiducy promises

The [security docs](https://fiducy.dev/docs/security) describe the threat model: what the enclave, the KMS key policy and attestation protect against, and the known limits. A report that breaks any guarantee listed there is in scope, even when the cause is outside this repository. The same page lists what each self-hosting customer is responsible for.
