#!/usr/bin/env bash
# Builds the enclave image (EIF) for one commit and prints its PCR0. The same commit gives the
# same PCR0 on any machine, so anyone can check what a gateway runs against the source.
#
#   infra/aws/enclave-build.sh [commit]           check a commit (default HEAD) from a git clone
#   infra/aws/enclave-build.sh --source DIR SHA   build an unpacked `git archive` (used by host.sh)
#
# Needs Docker with buildx; the build runs in a pinned BuildKit container. On a machine that is
# not arm64, Docker also needs arm64 emulation, since the gateway runs on Graviton:
#   docker run --privileged --rm tonistiigi/binfmt --install arm64
# Writes measurements.json, application.eif and enclaver.yaml to $FIDUCY_EIF_DIR (default: a temp
# dir), and tags the image `enclaver run` starts as fiducy-enclave:<commit>.
set -euo pipefail

PLATFORM=linux/arm64
NITRO_CLI_IMAGE=public.ecr.aws/s2t1d4c6/enclaver-io/nitro-cli@sha256:83d1bf977d62d68fe49763c94fb0d1ab23dc59a5844e9f5b86a07ccf7618ced9
BUILDKIT_IMAGE=moby/buildkit:v0.35.0@sha256:aa632b921ef07411d2cb77292cd34213d4f7b384001d6fceef1e1f25bf9752bb
BUILDER="${FIDUCY_BUILDER:-fiducy-enclave}"
SLEEVE_IMAGE=public.ecr.aws/s2t1d4c6/enclaver-io/enclaver-wrapper-base@sha256:50d210beeca6d569247e5802a42ca641de4877648d925c8ec6fe77a8a05e08af
# Every file the build writes is stamped with this time instead of the clock.
export SOURCE_DATE_EPOCH=0

log() { printf '%s\n' "$*" >&2; }

export_source() {
  local commit="$1" dir
  dir=$(mktemp -d)
  git archive --format=tar "$commit" | tar -x -C "$dir"
  printf '%s' "$dir"
}

ensure_builder() {
  docker buildx inspect "$BUILDER" >/dev/null 2>&1 && return
  docker buildx create --name "$BUILDER" --driver docker-container \
    --driver-opt "image=${BUILDKIT_IMAGE}" >/dev/null
}

build_enclave_image() {
  local source_dir="$1" commit="$2"
  log "Building the enclave image for $commit"
  docker buildx build --builder "$BUILDER" --quiet --platform "$PLATFORM" \
    --provenance=false --sbom=false --build-arg "FIDUCY_RELEASE_COMMIT=$commit" \
    -f "$source_dir/enclave/Dockerfile" --target enclave \
    --output "type=docker,name=fiducy-enclave-source:${commit},rewrite-timestamp=true" \
    "$source_dir" >/dev/null
}

convert_to_eif() {
  local commit="$1" eif_dir="$2"
  log "Converting it to an EIF with nitro-cli"
  docker run --rm --platform "$PLATFORM" -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$eif_dir:/build" "$NITRO_CLI_IMAGE" build-enclave \
    --docker-uri "fiducy-enclave-source:${commit}" --output-file /build/application.eif \
    > "$eif_dir/measurements.json"
}

# The image `enclaver run` starts on the host: Enclaver's runner with the EIF and its manifest.
package_release() {
  local source_dir="$1" commit="$2" eif_dir="$3"
  sed "s/\${FIDUCY_RELEASE_COMMIT}/${commit}/g" "$source_dir/enclave/enclaver.template.yaml" \
    > "$eif_dir/enclaver.yaml"
  docker buildx build --builder "$BUILDER" --quiet --platform "$PLATFORM" \
    --provenance=false --sbom=false --output "type=docker,name=fiducy-enclave:${commit}" \
    -f - "$eif_dir" >/dev/null <<EOF
FROM ${SLEEVE_IMAGE}
COPY --chown=0:0 enclaver.yaml /enclave/enclaver.yaml
COPY --chown=0:0 application.eif /enclave/application.eif
EOF
}

main() {
  local source_dir commit eif_dir
  if [ "${1:-}" = "--source" ]; then
    source_dir="${2:?Pass the unpacked source directory}"
    commit="${3:?Pass the commit the source came from}"
  else
    commit=$(git rev-parse "${1:-HEAD}^{commit}")
    source_dir=$(export_source "$commit")
  fi
  eif_dir="${FIDUCY_EIF_DIR:-$(mktemp -d)}"
  mkdir -p "$eif_dir"
  ensure_builder
  build_enclave_image "$source_dir" "$commit"
  convert_to_eif "$commit" "$eif_dir"
  package_release "$source_dir" "$commit" "$eif_dir"
  log "Commit: $commit"
  log "PCR0:   $(jq -r '.Measurements.PCR0' "$eif_dir/measurements.json")"
}

main "$@"
