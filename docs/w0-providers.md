# W0 provider research: dsh model-provider connectivity

Scope: read-only research of the installed dsh packages at
`/home/sid/.local/share/fnm/node-versions/v24.15.0/installation/lib/node_modules/@deepseek-ai/dsh/`
plus one web check. Product versions: `@deepseek-ai/dsh` 0.1.0-rc.7, `dsh-llm-deepseek` 0.1.0-rc.8,
`dsh-llm-pi-ai` 0.1.0-rc.8, `@earendil-works/pi-ai` 0.82.1, `@anthropic-ai/sdk` 0.91.1, `openai` SDK 6.26.0.
The base path below is abbreviated as `DSH = .../node_modules/@deepseek-ai/`.

## 1. Provider adapters

Two adapter implementations ship. Both implement the abstract `LlmAdapter` from `@deepseek-ai/dsh-llm`.

- `@deepseek-ai/dsh-llm-deepseek` owns the single provider route `deepseek-official`.
  It is a direct `fetch` + SSE chat-completions adapter (DSH/dsh-llm-deepseek/lib/index.js:629-765,
  `DeepSeekAdapter extends LlmAdapter`, route constant `PROVIDER = "deepseek-official"` at line 785).
- `@deepseek-ai/dsh-llm-pi-ai` is the generic multi-provider adapter. It wraps
  `@earendil-works/pi-ai` and serves any number of configured provider routes, each a profile in a
  dict keyed by route (DSH/dsh-llm-pi-ai/lib/index.js:767-842, `PiAiAdapter extends LlmAdapter`).

There is no dedicated Anthropic adapter package. No `dsh-llm-*` package named for anthropic exists
under `DSH/`. The Anthropic wire protocol is reached through the pi-ai adapter: its protocol table
includes `"anthropic-messages": anthropicMessagesApi` (DSH/dsh-llm-pi-ai/lib/index.js:1398-1402),
and `supportedProtocols()` returns `["openai-completions", "openai-responses", "anthropic-messages"]`
(DSH/dsh-llm-pi-ai/lib/index.js:1411-1413). pi-ai's installed catalog also ships an `anthropic`
provider with Claude models (pi-ai/dist/types.d.ts:18 lists `"anthropic"` among known providers).

The adapter registry is `ctx.llm` (the `LlmRuntime` service).

- `ctx.llm.registerAdapter(providers: string[], adapter: LlmAdapter): AdapterRegistrationHandle`
  (DSH/dsh-llm/lib/index.js:1075-1094, signature in DSH/dsh-llm/lib/types/index.d.ts:215).
  A provider entry is just a route string. Route names must be non-empty and unique. A route
  already owned by another adapter throws `LlmError('DUPLICATE_ADAPTER')` (DSH/dsh-llm/lib/index.js:1104-1107).
- `LlmAdapter` requires only `abstract stream(options: GenerateOptions): AsyncIterable<StreamChunk>`.
  Optional overrides: `providerInfo(provider)`, `providerRetryPolicy(provider)`,
  `listModels(provider)`, `resolveModel(provider, model, signal)` (DSH/dsh-llm/lib/index.js:989-1033,
  DSH/dsh-llm/lib/types/index.d.ts:113-150).
- `ctx.llm.registerConfigurableProviders(entries: readonly LlmConfigurableProvider[]): DirectoryRegistrationHandle`
  declares routes an adapter can activate by config (DSH/dsh-llm/lib/index.js:1152-1195). The entry
  shape is `{ provider, displayName, settingsNs, settingsPath, declared? }`
  (DSH/dsh-llm/lib/types/types.d.ts:150-171).
- `ctx.llm.registerModelDiscovery(settingsNs, discover)` and
  `ctx.llm.discoverModels(settingsNs, request: LlmModelDiscoveryRequest)` interrogate one draft
  endpoint (DSH/dsh-llm/lib/index.js:1216-1254 and the request shape in types.d.ts:178-197).
- Requests select a provider by `GenerateOptions.provider`. `GenerateOptions.model` is passed
  through as the wire model string (types.d.ts:332-368).

A custom OpenAI-compatible provider with a custom baseURL can be added purely by config. A pi-ai
profile under `providers.<route>` with `api: openai-completions`, `baseURL`, and a `models` list is
a full provider declaration (README example "acme-gateway", DSH/dsh-llm-pi-ai/README.md:49-75).
Resolution requires `api`, `baseURL`, and a non-empty `models` list for a route pi-ai does not ship
(DSH/dsh-llm-pi-ai/lib/index.js:1319-1347, refusal at 1324-1327). The profile schema is
`z.object({ providers: z.dict(profile) })` (line 1649) with profile fields `apiKeyEnv`,
`displayName`, `api`, `baseURL`, `models`, `modelOverrides`, `compat`, `defaultContextWindow`,
`defaultMaxTokens`, `defaultInput`, `headers`, `reasoning`, `thinkingBudgets`, `cacheRetention`,
`transport`, `timeoutMs`, `websocketConnectTimeoutMs`, `streamIdleTimeoutMs`,
`maxRequestImageBytes`, `retryPolicy` (DSH/dsh-llm-pi-ai/lib/index.js:1617-1647).

Verified:
- `registerAdapter(providers: string[], adapter: LlmAdapter): AdapterRegistrationHandle` — DSH/dsh-llm/lib/index.js:1075 and index.d.ts:215.
- `abstract stream(options: GenerateOptions): AsyncIterable<StreamChunk>` — DSH/dsh-llm/lib/index.js:989-1033 and index.d.ts:149.
- Protocol table with `anthropic-messages` — DSH/dsh-llm-pi-ai/lib/index.js:1398-1402.
- `supportedProtocols(): string[]` — DSH/dsh-llm-pi-ai/lib/index.js:1411-1413.
- Custom OpenAI-compatible route by config — DSH/dsh-llm-pi-ai/README.md:49-75 and lib/index.js:1617-1647 and 1319-1347.
- No dedicated Anthropic adapter package — absent from DSH/ directory listing.

## 2. OpenCode Go route

The OpenCode Go provider ships inside pi-ai as the installed catalog provider `opencode-go`
("OpenCode Zen Go"). Its model data lives in `pi-ai/dist/providers/data/opencode-go.json`.

- `deepseek-v4-pro` and `deepseek-v4-flash` are catalogued under `api: "openai-completions"` with
  `baseUrl: "https://opencode.ai/zen/go/v1"`, `contextWindow: 1000000`, `maxTokens: 384000`, and
  compat `thinkingFormat: "deepseek"`, `maxTokensField: "max_tokens"`,
  `supportsDeveloperRole: false` (pi-ai/dist/providers/data/opencode-go.json).
- The catalog registration maps the route id: `"opencode-go": OPENCODE_GO_MODELS`
  (pi-ai/dist/models.generated.js:64-65). The provider factory is
  `opencodeGoProvider(): Provider<"anthropic-messages" | "openai-completions" | "openai-responses">`
  with auth env `OPENCODE_API_KEY` (pi-ai/dist/providers/opencode-go.js and
  pi-ai/dist/env-api-keys.js:98-99).
- The path append for chat completions: the OpenAI SDK 6.26.0 posts to
  `/chat/completions` resolved against `baseURL` (`openai/resources/chat/completions/completions.mjs:20`),
  and pi-ai passes `baseURL: model.baseUrl` into that client
  (pi-ai/dist/api/openai-completions.js:507). With the catalog baseUrl the wire POST is
  `https://opencode.ai/zen/go/v1/chat/completions`. The deepseek adapter appends the same path by
  hand: `fetch(\`${connection.baseURL}/chat/completions\`, ...)` (DSH/dsh-llm-deepseek/lib/index.js:737).
- Auto-detection via `/models`: dsh calls `GET {baseURL}/models` only in the pi-ai discovery
  module, `listingUrl(baseURL) = \`${baseURL.replace(/\/+$/, "")}/models\``
  (DSH/dsh-llm-pi-ai/lib/index.js:1786-1788), and only for `openai-completions` /
  `openai-responses` (LISTABLE_PROTOCOLS, line 1763). A route the installed catalog already ships,
  such as `opencode-go`, is answered from the catalog with no network call (lines 1878-1886).
  So dsh does not interrogate `https://opencode.ai/zen/go/v1/models` for this route.
- The route reaches requests through `ctx.llm.listModels(provider)`, which returns the configured
  catalog (DSH/dsh-llm-pi-ai/lib/index.js:813-824).

Verified:
- Catalog baseUrl and models — pi-ai/dist/providers/data/opencode-go.json (deepseek-v4-pro, deepseek-v4-flash, api openai-completions, baseUrl https://opencode.ai/zen/go/v1).
- Route registration — pi-ai/dist/models.generated.js:64-65 and the provider factory in providers/opencode-go.js.
- `/chat/completions` append — pi-ai/dist/api/openai-completions.js:507 plus the openai SDK completions.mjs:20 and DSH/dsh-llm-deepseek/lib/index.js:737.
- `/models` discovery — DSH/dsh-llm-pi-ai/lib/index.js:1763, 1786-1788, 1878-1886.

## 3. Meridian protocol

dsh can reach an Anthropic-compatible server without writing a new adapter. The pi-ai adapter's
protocol table serves `anthropic-messages` (DSH/dsh-llm-pi-ai/lib/index.js:1398-1402), and a
hand-declared profile may name it: `api: anthropic-messages` plus `baseURL` plus `models`
(profile schema DSH/dsh-llm-pi-ai/lib/index.js:1617-1647 and resolution requirement at 1319-1347).
pi-ai builds an `@anthropic-ai/sdk` client with `baseURL: model.baseUrl`
(pi-ai/dist/api/anthropic-messages.js:654-710, api-key client at 691) and calls
`client.messages.create(...)` (line 373). The SDK posts to `/v1/messages` resolved against
`baseURL` (`@anthropic-ai/sdk` 0.91.1, `resources/messages/messages.mjs:31`). With
`baseURL: http://127.0.0.1:9000` the wire POST is `http://127.0.0.1:9000/v1/messages`.
The Models UI already offers the protocol choice: choices are read out of the namespace schema,
which is the adapter's `supportedProtocols()` (DSH/dsh-client-ui-settings-models/lib/client.js:487,
1885). Caveat: model auto-detection does not cover this protocol. Discovery is limited to
`openai-completions` and `openai-responses`. An `anthropic-messages` draft answers
`DISCOVERY_UNSUPPORTED` and models are entered by hand (DSH/dsh-llm-pi-ai/lib/index.js:1888-1889).

Web check, sources:
- rynfar/meridian describes itself as a "Proxy that bridges Anthropic's official SDK to enable
  Claude Max in third-party tools" for OpenCode, Pi, Droid, Aider, Crush, Cline — that is, it
  speaks the Anthropic Messages API on its local port: https://github.com/rynfar/meridian
- The README also documents an OpenAI-compatible surface: "Any OpenAI SDK: set
  base_url=\"http://127.0.0.1:3456\", api_key=\"dummy\"" —
  https://raw.githubusercontent.com/rynfar/meridian/refs/heads/main/README.md
- The npm readme notes "OMO requires passthrough mode (the default for OpenCode)" —
  https://www.npmjs.com/package/@rynfar/meridian
- Fork with identical description: https://github.com/Blue-B/meridian

So meridian bridges the Anthropic SDK (Anthropic Messages) and presents an OpenAI-compatible
endpoint as well. The README example port is 3456. The W0 target port 9000 is deployment config.
The OpenAI-compatible path and the exact port were not verifiable from search snippets alone.
Probe `http://127.0.0.1:9000/v1/messages` and `http://127.0.0.1:9000/v1/chat/completions` (and
`/v1/models`) with curl before wiring.

Verified:
- `api: anthropic-messages` reachable by config — DSH/dsh-llm-pi-ai/lib/index.js:1398-1402, 1617-1647, 1319-1347.
- Anthropic SDK baseURL + `/v1/messages` — pi-ai/dist/api/anthropic-messages.js:373 and 654-710 plus @anthropic-ai/sdk resources/messages/messages.mjs:31.
- Discovery excludes anthropic-messages — DSH/dsh-llm-pi-ai/lib/index.js:1763, 1888-1889.
- Meridian speaks Anthropic Messages plus an OpenAI-compatible surface — https://github.com/rynfar/meridian, https://raw.githubusercontent.com/rynfar/meridian/refs/heads/main/README.md.
- Not verified at research time: meridian's exact port 9000 and its OpenAI-compatible path.
  The user has since verified both: meridian serves `/v1/chat/completions` and `/v1/models`
  on port 9000. W0 declares the route with `api: openai-completions` and
  `baseURL: http://127.0.0.1:9000/v1`. A curl probe at W0 remains the final confirmation.

## 4. Credentials resolution

References are environment-variable-shaped. `credentialRef('DEEPSEEK_API_KEY')` brands a POSIX
shell identifier (DSH/dsh-credentials/README.md:15-28). Adapters store only the reference
(`apiKeyEnv`), never a literal key, and resolve it once per request through `ctx.credentials`
(DSH/dsh-llm-deepseek/lib/index.js:905-916 and DSH/dsh-llm-pi-ai/lib/index.js:2051-2057). Without a
mounted credential seam the adapters read the referenced environment variable directly
(DSH/dsh-llm-deepseek/lib/index.js:911-914).

The shipped local provider, `dsh-credentials-local`, resolves four layers in one order
(DSH/dsh-credentials-local/README.md:7-18):

1. Inherited process environment, source `env`, read-only, wins always.
2. `$DSH_HOME/.credentials.yaml`, source `file`, writable via `set`/`unset`, beats both `.env` layers.
3. `<invocation cwd>/.env`, source `project-env`.
4. `$DSH_HOME/.env`, source `user-env`.

Implementation: `resolve(ref)` checks `inherited(ref)` (process env via the frozen launch
environment), then the stored document, then `dotenvFallback(ref)` (project-env then user-env),
else `undefined` (DSH/dsh-credentials-local/lib/index.js:234-251, 188-201). The document path
defaults to `<harness home>/.credentials.yaml`, where the harness home is `$DSH_HOME` or `~/.dsh`
(lib/index.js:56-58 and README.md:24-26). The document is a YAML mapping of reference to value
(README.md:31-38). A value supplied by the environment shadows any stored value and makes
`set`/`unset` reject (lib/index.js:323-328).

Verified:
- Order env > file > project-env > user-env — DSH/dsh-credentials-local/lib/index.js:234-251 and README.md:7-18.
- Document path `<harness home>/.credentials.yaml` — DSH/dsh-credentials-local/lib/index.js:56-58.
- Key naming rule CredentialRef = env var name — DSH/dsh-credentials/README.md:21. Adapters at DSH/dsh-llm-deepseek/lib/index.js:870 and 905-916 and DSH/dsh-llm-pi-ai/lib/index.js:1711 and 2051-2057.

## 5. Model auto-detection

Model lists come from configuration, not from a provider `/models` call. Both adapters answer
`ctx.llm.listModels(provider)` from their resolved catalog:

- DeepSeek: `listModels()` returns `this.config.options().models` (DSH/dsh-llm-deepseek/lib/index.js:644-646), defaulting to `deepseek-v4-flash` and `deepseek-v4-pro` (lines 786-794).
- pi-ai: `listModels()` returns the route's configured pi-ai models (DSH/dsh-llm-pi-ai/lib/index.js:813-824). A profile without a `models` list serves the installed catalog unchanged (README.md:79-83).

The only wire `/models` call in the harness is the pi-ai discovery module: `GET {baseURL}/models`
for `openai-completions` / `openai-responses` drafts, used by the Models page "Fetch available
models" action (DSH/dsh-llm-pi-ai/lib/index.js:1763 and 1786-1788 and DSH/dsh-client-ui-settings-models/
README.md:19). It is candidate metadata for adoption, never a stored catalog (README.md:127-137).
A catalog route like `opencode-go` is answered from the catalog without a network call.

Rendering: the Settings -> Models page joins `llm.providers` (the configurable-provider directory),
`settings.describe`, and `credentials.describe` into provider rows, and edits a pi-ai route's model
list on its card (DSH/dsh-client-ui-settings-models/README.md:5, 17). The composer model selector
reads the session model directory built from the registered providers
(DSH/dsh-client-ui-model-selection/lib/client.js:52).

Verified:
- Config-backed listModels — DSH/dsh-llm-deepseek/lib/index.js:644-646 and DSH/dsh-llm-pi-ai/lib/index.js:813-824.
- Single `/models` call site — DSH/dsh-llm-pi-ai/lib/index.js:1786-1788 (discovery only).
- Rows and list rendering — DSH/dsh-client-ui-settings-models/README.md:5, 17, 19 and DSH/dsh-client-ui-model-selection/lib/client.js:52.

## 6. Two routes to one provider

Two routes to the same provider can coexist. In pi-ai, `providers` is a dict keyed by route
(Config at DSH/dsh-llm-pi-ai/lib/index.js:1649), so each route is a distinct key with its own
`apiKeyEnv`, `baseURL`, and `models`. All routes register with one adapter instance via
`ctx.llm.registerAdapter(routes, adapter)` (line 2102). The dedupe key is the provider route
string: `registerAdapter` throws `DUPLICATE_ADAPTER` only when the same route name already has an
adapter (DSH/dsh-llm/lib/index.js:1105), and the configurable-provider directory rejects duplicate
provider keys (DSH/dsh-llm/lib/index.js:1168). There is no dedupe on baseURL or on apiKeyEnv.

Consequences for W0:

- Two routes with different keys and the same baseURL are fine, for example two pi-ai routes
  pointing at one gateway.
- Two routes sharing one catalog provider are fine, for example `opencode-go` (catalog) beside a
  hand-declared proxy route.
- A single route carries one key. Two keys against one provider require two route names.
- The direct DeepSeek route `deepseek-official` is owned by dsh-llm-deepseek. pi-ai cannot claim
  that route name, but its own catalog name `deepseek` is separate, so both DeepSeek paths coexist
  (DSH/dsh-llm-deepseek/README.md:7).

Verified:
- Dict keyed by route — DSH/dsh-llm-pi-ai/lib/index.js:1649 and per-profile apiKeyEnv resolution at 2051-2057.
- Route-string dedupe only — DSH/dsh-llm/lib/index.js:1104-1107, 1168.
- Both adapters mount by default — DSH/dsh-base/cordis.patch.yml (llm-pi-ai dormant row and llm-deepseek row at lines 447-452).

## 7. Blocks for W0 evaluate

Evaluate target: "two profiles against the same provider with different keys both work in one
install and auto-detection lists models for each".

- Two keys need two route names. The dict shape forbids two profiles under one route
  (DSH/dsh-llm-pi-ai/lib/index.js:1649, 1680). Distinct routes such as `opencode-go` and
  `meridian` (or two hand-declared names) are unblocked. No blocker.
- Auto-detection lists models for each route: `listModels(route)` is per route and config-backed
  (DSH/dsh-llm-pi-ai/lib/index.js:813-824). No blocker.
- `/models` auto-detection for meridian: blocked. Discovery supports only `openai-completions` /
  `openai-responses`. An `anthropic-messages` route answers `DISCOVERY_UNSUPPORTED` and the UI
  falls back to hand entry (DSH/dsh-llm-pi-ai/lib/index.js:1888-1889, README.md:135). If meridian
  serves `GET /models`, declare it as `openai-completions` to auto-detect.
- Keyless local server: pi-ai's anthropic-messages implementation demands a key or Authorization
  header (`assertRequestAuth`, pi-ai/dist/api/anthropic-messages.js:346), and a route naming no
  credential stays keyless only for provider-native discovery. A local server needs a placeholder
  credential referenced by `apiKeyEnv` or an `Authorization` header (DSH/dsh-llm-pi-ai/README.md:208).
  A resolved-but-empty key fails `INVALID_CREDENTIAL`. A missing ref fails `MISSING_CREDENTIAL`
  (DSH/dsh-llm-pi-ai/lib/index.js:2051-2057). Use a dummy key value.
- `GenerateOptions.stop` is rejected on pi-ai routes (DSH/dsh-llm-pi-ai/lib/index.js:850). The
  agent loop does not set `stop` for conversation requests by default, so this is not a W0 blocker.
- Environment shadowing: an exported shell variable for a ref beats the stored document and any
  `.env` (DSH/dsh-credentials-local/lib/index.js:234-251). W0 must not rely on a `.env` value when
  the same ref is exported, and cannot `set` a shadowed ref.
- Meridian port 9000 is unverified. Probe the endpoints before wiring.

Verified:
- All flags above with file:line refs in the body of this section.

## W0 route plan

Config lives in `$DSH_HOME/settings.yaml` (dsh-settings-file, README.md:9-12) under the
`llm-pi-ai:` and `llm-deepseek:` namespaces, with keys in `$DSH_HOME/.credentials.yaml` or the
environment.

(a) OpenCode Go — pi-ai catalog route, no adapter code:

```yaml
llm-pi-ai:
  providers:
    opencode-go:
      apiKeyEnv: OPENCODE_API_KEY
```

This registers route `opencode-go`. Models default to the installed catalog, including
`deepseek-v4-pro` and `deepseek-v4-flash` at `https://opencode.ai/zen/go/v1` via
`openai-completions` (pi-ai/dist/providers/data/opencode-go.json). The wire POST is
`https://opencode.ai/zen/go/v1/chat/completions`. Set `OPENCODE_API_KEY` in the environment, in
`$DSH_HOME/.credentials.yaml`, or via the Models page. Optionally narrow with a `models:` list.

(b) Direct DeepSeek — shipped `deepseek-official` route, no adapter code:

```yaml
llm-deepseek:
  baseURL: https://api.deepseek.com
  apiKeyEnv: DEEPSEEK_API_KEY
```

`baseURL` is optional: resolution falls back to `$DEEPSEEK_BASE_URL` then
`https://api.deepseek.com` (DSH/dsh-llm-deepseek/lib/index.js:871). Wire POST is
`${baseURL}/chat/completions` (line 737). Default models `deepseek-v4-flash` and
`deepseek-v4-pro` (lines 786-794).

(c) Meridian — hand-declared pi-ai route, no adapter code. Anthropic-compatible:

```yaml
llm-pi-ai:
  providers:
    meridian:
      displayName: Meridian
      apiKeyEnv: MERIDIAN_API_KEY
      api: anthropic-messages
      baseURL: http://127.0.0.1:9000
      models:
        - id: claude-opus-4-6
          name: Claude Opus 4.6
          contextWindow: 1000000
          maxTokens: 128000
```

Wire POST is `http://127.0.0.1:9000/v1/messages` via the Anthropic SDK. `MERIDIAN_API_KEY` may be
a dummy value. The SDK requires some key or Authorization header. If meridian also serves
OpenAI-compatible endpoints on port 9000 (README documents an OpenAI SDK surface), the same route
can instead be declared with `api: openai-completions`, `baseURL: http://127.0.0.1:9000/v1`, which
enables `/models` auto-detection in the Models page. Verify with curl first.

If an adapter plugin were ever needed, the minimal shape is a class extending `LlmAdapter`
implementing `stream(options: GenerateOptions): AsyncIterable<StreamChunk>` and registered with
`ctx.llm.registerAdapter(providers: string[], adapter: LlmAdapter): AdapterRegistrationHandle`
(DSH/dsh-llm/lib/index.js:1075 and index.d.ts:215). It is not needed for W0.

## Risks

- Meridian port 9000 and its OpenAI-compatible path are user-verified since this research:
  `/v1/chat/completions` and `/v1/models` answer on 9000. The curl probe at W0 remains the
  final confirmation before wiring.
- `/models` auto-detection does not work for `anthropic-messages`. Models for meridian are entered
  by hand unless meridian serves `GET /models`.
- pi-ai anthropic-messages requires a credential. A dummy `apiKeyEnv` value is the supported path
  for a keyless local server.
- Environment shadowing: an exported variable beats `$DSH_HOME/.credentials.yaml` and `.env`.
  Two keys for one provider need two route names because `providers` is a dict.
- The `opencode-go` catalog is mixed-protocol (anthropic-messages models beside openai-completions
  models). Declaring `api` on the route moves every model onto that protocol. Omit `api` to keep
  the catalog's per-model protocols.
- DeepSeek direct route requires a real key. Blank values are refused, and a missing ref fails
  requests with `MISSING_CREDENTIAL` while the route stays browsable.
