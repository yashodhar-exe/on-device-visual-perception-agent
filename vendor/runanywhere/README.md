# Vendored RunAnywhere Web SDK

These tarballs are the on-device inference engine: `@runanywhere/web` (the SDK) and
`@runanywhere/web-llamacpp` (the llama.cpp WASM backend, CPU and WebGPU builds).
The extension currently uses the matching `0.20.27` pair.

## Why they are committed rather than installed from npm

The packages remain vendored for a practical reason: **a `file:` path to a sibling
repository cannot work in CI.** Only this
repository is checked out there, so `../../runanywhere-sdks/...` does not
exist and `pnpm install --frozen-lockfile` fails outright. Vendoring makes the
repository self-contained and buildable by anyone who clones it.

The `.wasm` binaries inside the llamacpp tarball have to ship inside the
extension package regardless: the Chrome Web Store forbids remotely-hosted
executable code. Model *weights* are data and are fetched at runtime, which is
allowed; the engine that runs them is code and is not.

## Provenance

The tarballs are the published `0.20.27` package pair. `.sha256` files record
their package contents; verify the active pair with:

```bash
cd vendor/runanywhere && shasum -a 256 -c *.sha256
```

## Updating

Rebuild in the SDK repo, copy both `.tgz` and both `.sha256` here, then
`pnpm install` so the lockfile records the new integrity hashes.
