# B2/B3 seams: the dsh surfaces the aidos board uses

This document verifies the exact DeepSeek Harness seams the aidos board client
plugin (build B3) and its human surface (build B2) will use. It is read-only
research of the installed dsh packages. Nothing in the checkout was modified.

All file paths are relative to this root:

```
/home/sid/.local/share/fnm/node-versions/v24.15.0/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/
```

The top-level `@deepseek-ai/dsh` package (the CLI) sits one level up at
`.../lib/node_modules/@deepseek-ai/dsh`. The tree is compiled JS plus `.d.ts`
types. There is no git checkout.

Versions: `@deepseek-ai/dsh@0.1.0-rc.7` at the top; nearly every
`@deepseek-ai/dsh-*` package in the tree is `0.1.0-rc.8`. PLAN.md cites the
tree as rc.7 (PLAN.md:49). See Risks 8.

---

## 1. The view/tab seat

Chat and Trajectory mount through one list slot named `conversation.view`.
The board adds a Tickets tab through the same slot.

The slot is declared by `dsh-client-ui-conversation`:

- `dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts:107-111`
  declares `'conversation.view'` with `kind: 'list'`, `scope: 'session'`, and
  owner share `ConvViewOwnerProps`.

The Chat tab is the first entry:

- `dsh-client-ui-conversation/lib/client.js:10063-10064` registers
  `slots.register({ name: "conversation.view", id: "chat", order: 0, ... })`.
- `dsh-client-ui-conversation/lib/client.js:7186-7190` fixes
  `DEFAULT_VIEW_ID = "chat"`. An unknown persisted view id falls back to it.

The Trajectory tab is the worked example:

- `dsh-client-ui-trajectory/lib/client.js:7341-7371`:
  `ctx.slots.inject("conversation.view", () => ctx.slots.register({ name: "conversation.view", id: "trajectory", order: 10, locale: NS, label: () => t("view.trajectory"), inject: (sessionId) => ({ hooks, loadOlder, setActualDuration }), }, TrajectoryView))`.
- The locale key `"view.trajectory"` maps to "Trajectory" at
  `dsh-client-ui-trajectory/lib/client.js:67` (en dictionary).

The header renders one tab per slot entry:

- `dsh-client-ui-conversation/lib/client.js:9821-9837` projects
  `slots.entries("conversation.view")` into `{ id: entry.options.id, label: resolveSlotLabel(entry.options.label) ?? entry.options.id }` rows (`ViewTab`).
- `dsh-client-ui-conversation/lib/client.js:7298` renders the tab bar only
  when `tabs.length > 1`. Chat always exists, so a Tickets tab always shows.
- `dsh-client-ui-conversation/lib/client.js:7303-7315` renders the active tab
  body: `renderSlot("conversation.view", { inspect, onInspectDone }, { only: active.id })`.
- `ViewTab` and the active-view store field live at
  `dsh-client-ui-conversation/lib/types/client/contract/views.d.ts:15-18` and
  `views.d.ts:29`.

The registration APIs:

- `dsh-client-runtime/lib/types/client/slots.d.ts:74`:
  `readonly register: SlotCore['register']`.
- `dsh-client-runtime/lib/types/client/slots.d.ts:90`:
  `inject(key: keyof SlotMap & string, callback: () => SlotInjectionEffect): () => void`.
- `ctx.slots` is `SlotRegistry`:
  `dsh-client-runtime/lib/types/client/index.d.ts:109`.

The goal-bar and plan-seat precedents:

- `dsh-client-ui-goal/lib/client.js:410-438` registers the GoalBar into
  `conversation.input.dock` with `id: "goal"`, `order: 10`, and an `inject`
  face. `dsh-client-ui-goal/lib/client.js:241-242` reads the goal projection
  with `useProjection("goal")`.
- `dsh-client-ui-plan/lib/client.js:118-130` registers the plan chip into
  `conversation.input.plan`, a single seat declared at
  `dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts:310-314`.

The New Session entry:

- The New Session button is hardcoded shell chrome, not a slot. It renders at
  `dsh-client-ui-sidebar/lib/client.js:204-217` inside `SidebarRoot`, calling
  `startSession()`. The button lives in the brand row, above the
  `sidebar.workspaces` region.
- `dsh-client-ui-sidebar/lib/types/client/contract/slots.d.ts:19-62` declares
  the only sidebar seats: `sidebar.brand.mark`, `sidebar.brand.name`,
  `sidebar.workspaces`, `sidebar.settings`, `sidebar.footer.action`. The last
  is a list slot at the sidebar foot (`slots.d.ts:58-62`).
- `dsh-client-ui-workspace/lib/client.js:2408-2410` registers the browser
  into `sidebar.workspaces`. The blank session row shows "New Session"
  (`dsh-client-ui-workspace/lib/client.js:104-109`).

There is no seat adjacent to the New Session button. See Risk 1.

### Verified

- `dsh-client-ui-trajectory/lib/client.js:7341-7371` —
  `ctx.slots.inject("conversation.view", () => ctx.slots.register({ name, id: "trajectory", order: 10, locale, label, inject }, TrajectoryView))`.
- `dsh-client-ui-conversation/lib/client.js:10063-10064` — chat entry
  `{ name: "conversation.view", id: "chat", order: 0 }`.
- `dsh-client-ui-conversation/lib/client.js:9821-9837` — `ViewTab` projection
  from `slots.entries("conversation.view")`.
- `dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts:107-111` —
  `'conversation.view': { kind: 'list'; scope: 'session'; owner: ConvViewOwnerProps }`.
- `dsh-client-ui-conversation/lib/client.js:7298,7303-7315` — tab bar and
  `renderSlot("conversation.view", ..., { only: active.id })`.
- `dsh-client-runtime/lib/types/client/slots.d.ts:74,90` — `register` and
  `inject` signatures.
- `dsh-client-ui-goal/lib/client.js:410-438` and
  `dsh-client-ui-plan/lib/client.js:118-130` — the goal bar and plan seat
  precedents.
- `dsh-client-ui-sidebar/lib/client.js:204-217` — the New Session button is
  hardcoded.
- `dsh-client-ui-sidebar/lib/types/client/contract/slots.d.ts:19-62` — the
  sidebar seat inventory.

---

## 2. Remote endpoints

A host service extends `TypertRemoteService`. Methods decorated with
`@Remote("name")` become endpoints the browser calls. Generated typert
artifacts describe the wire protocol. The dsh-goal domain is the worked
example.

The base classes and decorators:

- `dsh-typert-protocol/lib/index.js:53-66` — `TypertRemoteService extends
  Service`. The constructor calls `bindTypertRemote(this, this.name, options)`
  and stores the binding on `this.typertRemote`.
- `dsh-typert-protocol/lib/index.js:67-76` — `Remote(methodOrExportName,
  context)` marks a public instance method.
- `dsh-typert-protocol/lib/index.js:99-106` — `remoteMethods(service)` reads
  the markers.

The GoalService registration:

- `dsh-goal/lib/types/index.d.ts:46` — `export declare class GoalService
  extends TypertRemoteService`.
- `dsh-goal/lib/index.js:516-519` — the constructor calls
  `super(ctx, "goals")`, so the Cordis key and wire namespace are both
  `goals`.
- `dsh-goal/lib/index.js:433-438` — the decorators:
  `[Remote("edit")]`, `[Remote("pause")]`, `[Remote("resume")]`,
  `[Remote("complete")]`, `[Remote("clear")]`,
  `[Remote("create")]`. The last decorates `remoteExportCreate`, a method
  whose wire name differs from its source name.

The generated host artifact:

- `dsh-goal/lib/typert.host.js` — `export const TYPERT`. Each invocation has
  `scope: { context: 'agent', wire: 'agentId' }`, a first parameter with
  `source: 'lookup', lookup: 'agent'` and codec
  `typeSymbol: '@deepseek-ai/dsh-session/types#SessionId'`, then the JSON
  parameters, and a strict result schema. `goals/create` carries
  `implementation: 'remoteExportCreate'`.

The generated client artifact:

- `dsh-goal/lib/typert.remote-client.d.ts:9-40` — module augmentation
  declares `TypertRemoteNamespace$...` with methods
  `clear(agentId, ref)`, `complete(agentId, ref)`, `create(agentId,
  request)`, `edit(agentId, ref, request)`, `pause(agentId, ref)`,
  `resume(agentId, ref)`, each returning `Promise<RemoteResult<...>>`. The
  wire map keys are `goals/clear` through `goals/resume`
  (`typert.remote-client.d.ts:18-25`). The namespace map registers `goals`
  (`typert.remote-client.d.ts:26-28`).
- `dsh-goal/lib/typert.remote-client.js` — `export const TYPERT_REMOTE`
  with `descriptors`. The wire `agentId` field is the first parameter's wire
  name; the client passes the session id there.

How the client mounts and calls:

- `dsh-api-remotes/lib/client.js:6043-6072` — the client assembly calls
  `await ctx.remote.$mount(contribution)` for each selected package
  contribution (commands, goals, dynamicCordisRunner, fileReference,
  messageFeedback, sessionReference, and one more).
- `dsh-api-gateway/lib/types/client/index.d.ts:12-19` — `ctx.remote:
  ClientRemote` where `ClientRemote = TypertClientRemote`.
- `dsh-typert-protocol/lib/types/types.d.ts:187-215` — `TypertClientRemote`
  with `$mount(contribution)`, `$on(event, listener)`, `$dispatch`.
- `dsh-api-gateway/lib/client.js:233-277` — a mounted method builds the wire
  `args` object and calls `connection.rpc.call("/api", endpoint, { args },
  signal)` where `endpoint` is `goals/create`.
- `dsh-client-ui-goal/lib/client.js:373` — the client plugin declares
  `inject: ["slots", "sessions", "remote", "remote.goals", "locale",
  "conversationEvents"]`.
- `dsh-client-ui-goal/lib/client.js:419-438` — real calls:
  `ctx.remote.goals.edit(sessionId, ref, { objective })`,
  `ctx.remote.goals.pause(sessionId, ref)`,
  `ctx.remote.goals.resume(sessionId, ref)`,
  `ctx.remote.goals.clear(sessionId, ref)`.

How sessionId resolves on the host:

- `dsh-api-gateway/lib/index.js:233-258` — `resolveParameter` finds the
  lookup provider `ctx.typert.lookups.get('agent')` and calls
  `provider.resolve(value)`.
- `dsh-api-remotes/lib/types/agent-lookup.js:149-160` —
  `ctx.typert.lookups.configure('agent', resolveAgent)`,
  `ctx.typert.lookups.configure('session', ...)`, and
  `ctx.typert.contexts.configureHost('agent', ...)`.
- `dsh-api-remotes/lib/types/agent-lookup.js:76-148` —
  `createApiRemoteAgentResolver` reuses a live agent or resumes a cold
  session through `ctx.agents.resume({ resumeSessionId })`. Subagent-owned
  identities reject with the `agent-busy` fence.
- `dsh-api-gateway/lib/index.js:96-107` — the gateway resolves the receiver
  service, resolves parameters, and applies the method. For
  `invocation.kind === "direct"` the receiver context is the root `ctx`
  (`dsh-api-gateway/lib/index.js:213-216`).
- `dsh-api-gateway/lib/index.js:75-94` — source-mode discovery walks
  `ctx.reflect.props` for services carrying a `typertRemote` binding. A
  plain service with a `typertRemote` binding is reachable without a
  generated descriptor.

The legacy API gateway also serves typed RPC methods listed in
`dsh-host-apiproxy/lib/types/api/rpc-map.d.ts:29-83` (`session.list`,
`goal.create`, `settings.update`, and so on). The board does not need these;
the typert Remote path is the one PLAN.md describes.

### Verified

- `dsh-typert-protocol/lib/index.js:53-66,67-76,99-106` — the service base,
  `Remote`, and `remoteMethods`.
- `dsh-goal/lib/index.js:516-519,433-438` — `super(ctx, "goals")` and the
  decorators.
- `dsh-goal/lib/typert.host.js` and
  `dsh-goal/lib/typert.remote-client.d.ts:10-40` — generated host and client
  artifacts with `scope: { context: 'agent', wire: 'agentId' }`.
- `dsh-client-ui-goal/lib/client.js:419-438` —
  `ctx.remote.goals.<method>(sessionId, ...)`.
- `dsh-api-gateway/lib/client.js:233-277` — the wire call
  `connection.rpc.call("/api", endpoint, { args }, signal)`.
- `dsh-api-remotes/lib/types/agent-lookup.js:149-160,76-148` — the
  sessionId-to-Agent resolution and cold resume.

---

## 3. Projections on the client

Server side, one registry drives pure units over the session log. Client
side, a per-session value store holds finished whole values per key.

The registration API:

- `dsh-session-projection/lib/types/index.d.ts:37-69` —
  `ProjectionDefinition<K, S>` with `key`, `schema: ZodType<...>`,
  `init(): S`, `apply(state: S, event: SessionEvent): S`, `view(state: S)`,
  `stateVersion: number`.
- `dsh-session-projection/lib/types/index.d.ts:137` —
  `register<K, S>(definition: ProjectionDefinition<K, S>): () => void`.
- `dsh-session-projection/lib/types/types.d.ts:16-17` — the merge-extensible
  table `SessionProjectionMap {}`. A domain merges its key via
  `declare module '@deepseek-ai/dsh-session-projection/types'`.

The goal unit as the worked example:

- `dsh-goal/lib/index.js:523-532` —
  `ctx.inject(["sessionProjections"], (projectionCtx) => projectionCtx.sessionProjections.register({ key: "goal", schema: goalProjectionSchema, init: () => null, apply: applyGoalProjection, view: (state) => state, stateVersion: 4 }))`.
- `dsh-goal/lib/types/types.d.ts:84-97` — the key declaration
  `interface SessionProjectionMap { goal: GoalProjection | null }`.

The plan unit as a second example:

- `dsh-plan-mode/lib/index.js:153-195` — registers `key: "plan"` with
  `stateVersion: 2`.
- `dsh-plan-mode/lib/types/types.d.ts:24-26` — the key declaration
  `plan: PlanProjection`.

The cold-read API:

- `dsh-session-projection/lib/types/index.d.ts:185` — `restoreFloor(checkpoint)`.
- `dsh-session-projection/lib/types/index.d.ts:196` — `viewCheckpoint(checkpoint)`.
- `dsh-session-projection/lib/types/index.d.ts:219-222` —
  `restore(checkpoint: ProjectionCheckpoint, events: readonly SessionEvent[], baseSeq: number): { snapshot: ProjectionSnapshot; checkpoint: ProjectionCheckpoint }`.
- `dsh-session-projection-cache/lib/index.js:159-197` — `coldSnapshot(id,
  signal)` applies the read ladder: cached rows, `restoreFloor`, a
  persistence tail read, `restore`, and write-back. The service registers as
  `ctx.sessionProjectionCache` (`dsh-session-projection-cache/lib/index.js:103`).

The client read API:

- `dsh-client-runtime/lib/types/client/sessions/projection-store.d.ts:60-64` —
  `faceOf(key: string): ObservableSnapshot<unknown>`.
- `dsh-client-runtime/lib/types/client/sessions/session.d.ts:102` —
  `readonly projections: ProjectionValueStore` on the Session class.
- `dsh-client-runtime/lib/types/client/sessions/service.d.ts:109-114` —
  `SessionBinding { sessionId, session: SessionFace, ctx: AgentContext }`.
- `dsh-client-runtime/lib/types/client/contract/sessions.d.ts:126` —
  `binding(id: SessionId): SessionBinding | undefined`.
- `dsh-client-runtime/lib/types/client/contract/session.d.ts:16-24` —
  `ProjectionsFace.faceOf(key)`.
- `dsh-client-ui-renderer/lib/client.js:564` — the standard kit binds
  `standard["useProjection"] = projectionHook(info)` for every session
  component.
- `dsh-client-ui-renderer/lib/types/client/session-provider.d.ts:48` —
  `projectionHook(info): (key, selector?, eq?) => unknown`.
- `dsh-client-runtime/lib/types/client/sessions/projection-store.d.ts:16-21` —
  the `UseProjection` overloads.
- `dsh-client-ui-goal/lib/client.js:241-242` — `useProjection("goal")` in the
  GoalBar; `dsh-client-ui-goal/lib/client.js:395-397` —
  `sessions.binding(sessionId)?.session.projections.faceOf("goal")?.getSnapshot()`.

The push frames:

- `dsh-host-apiproxy/lib/index.js:1788-1795` —
  `projectionCtx.sessionProjections.onChanged((session, key, value, seq) => broadcast({ type: "session/projection", sessionId: session.id, key, value, seq }))`.
- `dsh-host-apiproxy/lib/types/api/events.d.ts:136-141` — the frame shape
  `{ type: 'session/projection'; sessionId; key; value; seq }`.
- `dsh-client-runtime/lib/types/client/sessions/projection-store.d.ts:87-90` —
  `apply(key, value, seq)` under the one higher-seq-wins rule.
- `dsh-client-runtime/lib/types/client/sessions/projection-store.d.ts:99-108` —
  `seed(baseline)` from the history tail page's projections block.
- `dsh-client-runtime/lib/types/client/sessions/projection-store.d.ts:122-125` —
  `truncate(lastSeq)` on mux-generation baseline.

### Verified

- `dsh-session-projection/lib/types/index.d.ts:37-69,137,185,196,219-222`.
- `dsh-goal/lib/index.js:522-532` — `register({ key: "goal", schema, init, apply: applyGoalProjection, view: (state) => state, stateVersion: 4 })`.
- `dsh-goal/lib/types/types.d.ts:84-97` — `goal: GoalProjection | null`.
- `dsh-plan-mode/lib/index.js:153-195` — `key: "plan"`, `stateVersion: 2`.
- `dsh-session-projection-cache/lib/index.js:159-197` — `coldSnapshot(id, signal)`.
- `dsh-client-runtime/lib/types/client/sessions/projection-store.d.ts:60-64,87-90,99-108,122-125`.
- `dsh-client-ui-renderer/lib/client.js:564` — `useProjection` in the standard kit.
- `dsh-client-ui-goal/lib/client.js:241-242,395-397` — both read paths in
  real use.
- `dsh-host-apiproxy/lib/index.js:1788-1795` — `session/projection` push.

---

## 4. userQuestions flows

The seam is a UI-backed service. A host provider collects answers. The wire
carries server-request and client-response frames.

The service:

- `dsh-user-questions/lib/types/index.d.ts:37-63` — `UserQuestionService`
  with `registerProvider(provider)` and `ask(request)`.
- `dsh-user-questions/lib/types/index.d.ts:20-27` —
  `AskUserQuestionRequest { questions, agent?, signal? }`.
- `dsh-user-questions/lib/types/types.d.ts:13-39` —
  `AskUserQuestionItem { id, question, detail?, header?, options?, multiSelect?, intent? }`,
  `AskUserQuestionAnswer { answers: AskUserQuestionAnswerItem[] }`.
- `dsh-user-questions/lib/types/types.d.ts:18-29` — the presentation intent
  `AskUserQuestionIntent { kind: 'plan-review'; approve: string }`.
- `dsh-user-questions/lib/types/index.d.ts:58-60` — `ask()` throws
  `UserQuestionError` with code `CALLER_NOT_LIVE` when the agent is not the
  exact live runtime root, or `DELEGATED_CALLER` when that root is owned.

The web provider (host side):

- `dsh-host-apiproxy/lib/index.js:1855-1890` — the provider registers with
  `ctx.userQuestions.registerProvider({ ask(request) { ... } })`. It rejects
  `ASK_MISSING_AGENT` when `request.agent` is absent
  (`dsh-host-apiproxy/lib/index.js:1859-1861`). It mints `RpcId`, stores a
  pending record, and pushes the envelope `{ rpcId, payload: { type:
  "question/requested", sessionId, questions } }` to every mux queue.
- `dsh-host-apiproxy/lib/index.js:1845-1854` — `claimQuestion(pending,
  outcome)` deletes the pending record and broadcasts
  `{ type: "question/resolved", sessionId, questionRpcId, outcome }`.

The answer path:

- `dsh-host-apiproxy/lib/index.js:3736-3779` — `api.respond(message)` routes
  by `rpcId`. The question leg parses
  `questionResponsePayloadSchema`, validates against `matchesQuestions`,
  then `claimQuestion(pending, "answered")` and `pending.resolve(answer)`.
- `dsh-host-apiproxy/lib/index.js:3751-3758` — a cancel (`ok: false`, error
  code `"cancelled"`) runs `claimQuestion(pending, "cancelled")` and rejects
  with `new UserQuestionError("the user cancelled ask_user_question",
  "ASK_CANCELLED")`.
- `dsh-host-apiproxy/lib/types/api/questions.d.ts:14-17` —
  `QuestionResponsePayload { sessionId, answer }`.

The frames:

- `dsh-host-apiproxy/lib/types/api/events.d.ts:88-95` —
  `{ type: 'question/requested'; sessionId; questions }` and
  `{ type: 'question/resolved'; sessionId; questionRpcId; outcome: 'answered' | 'cancelled' }`.
- `dsh-host-apiproxy/lib/types/api/events.schema.js:42-43` — the zod frames.

The client side:

- `dsh-client-runtime/lib/types/client/sessions/pending.d.ts:26-60` —
  `PendingWait<K>` with `respond(result)` that backfills the rpcId into the
  client-response envelope.
- `dsh-client-runtime/lib/client.js:7484-7490` — the mux switch routes
  `question/requested` and `question/resolved`.
- `dsh-client-runtime/lib/client.js:8326-8327` — pending tracking keys
  `q:<rpcId>`.
- `dsh-client-ui-user-questions/lib/client.js:70-105` — `PendingQuestion`
  owns the domain encoding: `answer(answer)` responds
  `{ ok: true, value: { sessionId, answer } }`; `cancel()` responds
  `{ ok: false, error: { code: "cancelled", message, details: {} } }`.
- `dsh-client-ui-user-questions/lib/types/client/contract/slots.d.ts:65-88` —
  the `PendingQuestion` face.

The plan-mode "Chat about it" path:

- `dsh-plan-mode/lib/index.js:271-315` — `exit_plan_mode` calls
  `ctx.get("userQuestions").ask({ questions: [{ id: REVIEW_ID, header:
  "Plan review", question: ..., detail: args.plan, options: [...], intent:
  { kind: "plan-review", approve: APPROVE_LABEL } }], agent, signal })`.
- `dsh-plan-mode/lib/index.js:299` — on
  `UserQuestionError` with `code === "ASK_CANCELLED"` it throws "The user
  dismissed the plan review to speak instead; stay in plan mode, stop here,
  and wait for their message."
- `dsh-client-ui-user-questions/lib/client.js:196-207` — the PlanReviewPanel
  "Chat about it" button (`t("plan.discuss")`) calls `pending.cancel()`.
- `dsh-client-ui-user-questions/lib/client.js:663` — the en dictionary
  `"plan.discuss": "Chat about it"`.
- `dsh-client-ui-user-questions/lib/types/client/contract/slots.d.ts:36-63` —
  `planReviewOf(questions)` narrows a batch to a `PlanReview`.

There is no client-to-host Remote for asking questions. Asking is always
host-to-client through the `question/requested` server-request frame. A
service that wants to ask resolves the live `Agent` (the Remote lookup gives
it one) and calls `ctx.userQuestions.ask({ questions, agent })`. The call
blocks until the human answers or the frame is cancelled.

### Verified

- `dsh-user-questions/lib/types/index.d.ts:37-63,58-60`.
- `dsh-host-apiproxy/lib/index.js:1855-1890,1845-1854,3751-3779`.
- `dsh-host-apiproxy/lib/types/api/events.d.ts:88-95` — the frames and
  outcomes `'answered' | 'cancelled'`.
- `dsh-host-apiproxy/lib/types/api/questions.d.ts:14-17` —
  `QuestionResponsePayload`.
- `dsh-client-runtime/lib/types/client/sessions/pending.d.ts:26-60`.
- `dsh-client-ui-user-questions/lib/client.js:70-105,196-207,663`.
- `dsh-plan-mode/lib/index.js:271-315,299` — the plan-review ask and the
  `ASK_CANCELLED` handling.
- `dsh-user-questions/lib/types/types.d.ts:18-29` — `plan-review` intent.

---

## 5. The dsh-goal client plugin as the pattern

The goal surface is the closest shipped analog of the board: a dual-face
package with a prebuilt browser bundle, mounting through slots, reading a
projection, and calling Remote endpoints.

The manifest:

- `dsh-client-ui-goal/package.json` —
  `"dsh": { "client": { "inject": ["@deepseek-ai/dsh-client-runtime",
  "@deepseek-ai/dsh-api-remotes", "@deepseek-ai/dsh-client-locale",
  "@deepseek-ai/dsh-client-ui-conversation"], "platform": "web" } }`.
- The exports map has `"./client"` → `./lib/client.js`
  (`dsh-client-ui-goal/package.json`). The trajectory manifest is the same
  shape with its own `inject` list
  (`dsh-client-ui-trajectory/package.json`).

The bundle format:

- `dsh-client-ui-goal/lib/client.js:1-3` —
  `window.__ModuleLoader__.load({ id: "@deepseek-ai/dsh-client-ui-goal",
  factory: (require) => { ... } })`. The trajectory bundle is the same
  (`dsh-client-ui-trajectory/lib/client.js:1-3`).

What the goal plugin does:

- `dsh-client-ui-goal/lib/client.js:387` —
  `ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({ name: "conversation.chat.node", key: "command-input", locale: NS }, GoalCommandInputView))`.
- `dsh-client-ui-goal/lib/client.js:410-438` —
  `ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({ ..., inject: (sessionId) => ({ onEdit, onPause, onResume, onClear }) }, GoalDock))`.
- `dsh-client-ui-goal/lib/client.js:241-242` — the dock reads
  `useProjection("goal")`.
- `dsh-client-ui-goal/lib/client.js:419-438` — the verbs call
  `ctx.remote.goals.*(sessionId, ...)`.

The roster row:

- `dsh-web-app/cordis.patch.yml` — the browser roster is a list of patch
  rows: `- id: ui-goal, name: '@deepseek-ai/dsh-client-ui-goal'`, and the
  same for every client plugin. The web-app bundle's manifest declares
  `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`
  (`dsh-web-app/package.json`).
- `dsh-client-modules/lib/index.js:244-396` — `ClientModuleRegistry` scans
  the host Loader's entries, reads each package's `package.json`, accepts a
  manifest with `dsh.client.platform === "web"`, resolves the `"./client"`
  export, serves the bundle at `/plugins/<id>/client.js`, and injects
  `window.__DSH_BOOT__`.
- `dsh-client-modules/lib/index.js:238` — the boot manifest injection into
  the served HTML.
- `dsh-client-modules/lib/index.js:119-127` — `parseDshClient` validates
  `platform`, `inject`, `external`, `immediately`.

How the profile composes:

- `dsh/lib/profile-boot-DG5t9aNs.js:148-156` — `allPatches` order:
  bundle layers, profile layer, home layer, overlays.
- `dsh/lib/profile-boot-DG5t9aNs.js:157-200` — `composeProfile` walks
  `dsh.profile.bundles` in order.
- `dsh/lib/plugin-9h8shc4d.js:50` — `dsh plugin` reconciles
  `dsh.profile.bundles` with installed packages.

How the bundle is built:

- `dsh-web-frontend/package.json` — `"build": "vite build"`,
  `"watch": "vite build --watch --no-emptyOutDir"`. The shipped bundles are
  rolldown outputs in the `window.__ModuleLoader__.load` format.
- `dsh-client-hmr/README.md:5-7` — `pnpm run dev:web` is the rebuild
  watcher. The HMR node half stat-polls each graph bundle and broadcasts
  `rebuilt` frames on `GET /plugins/events`.

### Verified

- `dsh-client-ui-goal/package.json` — `dsh.client { inject, platform: "web" }`
  and the `"./client"` export.
- `dsh-client-ui-goal/lib/client.js:1-3,387,410-438` — bundle format and
  `ctx.slots.inject` mounting.
- `dsh-web-app/cordis.patch.yml` — roster rows `- id: ui-goal, name: ...`.
- `dsh-client-modules/lib/index.js:244-396,119-127,238` — roster scan,
  manifest validation, bundle route, boot injection.
- `dsh/lib/profile-boot-DG5t9aNs.js:148-200` — profile composition.
- `dsh-web-frontend/package.json` — `vite build` / `vite build --watch`.
- `dsh-client-hmr/README.md:5-7` — the `pnpm run dev:web` watcher contract.

---

## 6. Approval surface for B2

The approval seam is a one-shot permission decision dispatched to composed
answerers. It is the closest shipped model for signoff decisions, and B2's
flows ride on it or beside it.

The service:

- `dsh-user-approval/lib/types/index.d.ts:171` —
  `request(req: ApprovalRequest): Promise<ApprovalOutcome>`.
- `dsh-user-approval/lib/types/index.d.ts:104-125` —
  `ApprovalRequest { agent: Agent, toolName: string, callId?, reason?, signal? }`.
- `dsh-user-approval/lib/types/types.d.ts:23` —
  `type ApprovalOutcome = 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'`.
- `dsh-user-approval/lib/types/index.d.ts:24` — the waterfall event
  `'approval/request'(this: Scoped<ApprovalService>, req, next)`.
- `dsh-user-approval/lib/types/index.d.ts:81` —
  `type ApprovalPolicy = 'ask' | 'never'`.

The session events:

- `dsh-user-approval/lib/types/index.d.ts:37-42` —
  `'approval/asked': { id: ApprovalRequestId; toolName: string; callId?: CallId; reason?: string }`.
- `dsh-user-approval/lib/types/index.d.ts:48-51` —
  `'approval/decided': { id: ApprovalRequestId; outcome: ApprovalOutcome }`.
- `dsh-user-approval/lib/types/index.d.ts:60-64` —
  `'approval/policy': { policy: ApprovalPolicy; source?: 'delegation' }`.
- These are log-only audit events. They are not surface events and carry no
  `surfaceOp`.

The wire frames:

- `dsh-host-apiproxy/lib/types/api/events.d.ts:76-86` —
  `{ type: 'approval/requested'; sessionId; approvalId; toolName; callId?; reason? }`
  and `{ type: 'approval/resolved'; sessionId; approvalId; outcome }`.
- `dsh-host-apiproxy/lib/types/api/approvals.d.ts:15-19` —
  `ApprovalResponsePayload { sessionId; approvalId; outcome: 'allowed-once' | 'rejected' }`.
- `dsh-host-apiproxy/lib/index.js:1296-1306` — `requestedFrame(pending)`
  builds the approval/requested envelope.
- `dsh-host-apiproxy/lib/index.js:1901-1947` — the web answerer listens on
  `approval/request`, scans the session log for an undecided
  `approval/asked`, stores a pending record, and pushes the requested frame.
- `dsh-host-apiproxy/lib/index.js:3737-3749` — `api.respond` resolves the
  approval: validates the payload against
  `approvalResponsePayloadSchema`, then `approval.resolve(outcome)`.

The client answer path:

- `dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts:664-685` —
  `PendingApproval` with `answer(outcome: 'allowed-once' | 'rejected')`. A
  rejected carrier receipt throws.
- `dsh-client-runtime/lib/types/client/sessions/pending.d.ts:4-7` — the
  `approval` kind of `PendingPayloads`.

There is no comment channel in the approval answer payload. PLAN.md already
records this (`PLAN.md:652-664`). The reject-with-comment plan injects a
steering user message through `sessions.send(sessionId, { mode: 'steer',
content })`.

### Verified

- `dsh-user-approval/lib/types/index.d.ts:104-125,171,37-42,48-51,60-64,24,81`.
- `dsh-user-approval/lib/types/types.d.ts:23` — the outcome union.
- `dsh-host-apiproxy/lib/types/api/events.d.ts:76-86`.
- `dsh-host-apiproxy/lib/types/api/approvals.d.ts:15-19` — the answer
  payload with only `'allowed-once' | 'rejected'`.
- `dsh-host-apiproxy/lib/index.js:1296-1306,1901-1947,3737-3749`.
- `dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts:664-685` —
  `PendingApproval.answer`.

---

## 7. Things that block or constrain the board

### 7.1 No seat beside New Session

The New Session button is hardcoded in `SidebarRoot`
(`dsh-client-ui-sidebar/lib/client.js:204-217`). No slot exists next to it.
The additive sidebar seats are `sidebar.brand.mark`, `sidebar.brand.name`,
`sidebar.settings`, and `sidebar.footer.action`
(`dsh-client-ui-sidebar/lib/types/client/contract/slots.d.ts:19-62`). The
global Tickets entry must either occupy `sidebar.footer.action`, replace a
single seat, or fork the sidebar to add a slot. PLAN.md's "a global Tickets
entry near New Session" (`PLAN.md:113,462-463`) has no shipped seat. This is
the top B3 risk.

### 7.2 The published client packages are not installed

`@deepseek-ai/dsh-client-ui-slots` and
`@deepseek-ai/dsh-client-ui-primitives` do not exist in the installed tree.
The shipped client bundles inline them. The type declarations reference them
(`dsh-client-runtime/lib/types/client/slots.d.ts:14-15`,
`dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts:4`). Both
exist on npm at `0.0.1-rc.1`. A board plugin build must depend on them
explicitly or its TypeScript cannot resolve `SlotMap`, `PropsRuntime`, and
the primitives. PLAN.md names both as build targets (`PLAN.md:453-455`).

### 7.3 The question flow is transient, not a session event

Question asks and answers never touch the session log. They live in the
pending table and the mux frames only. B2's signoff, send-back, and
allowlist prompts must therefore be orchestrated by Remote calls or by the
agent tool, never replayed from the log. PLAN.md's "userQuestions for
prompts" (`PLAN.md:186,478`) is consistent with this, but the constraint is
not stated there.

### 7.4 The web ask provider needs a live agent

`ctx.userQuestions.ask()` rejects with `ASK_MISSING_AGENT` when
`request.agent` is undefined (`dsh-host-apiproxy/lib/index.js:1859-1861`),
and with `CALLER_NOT_LIVE` / `DELEGATED_CALLER` for a non-root agent
(`dsh-user-questions/lib/types/index.d.ts:58-60`). A board Remote endpoint
can ask because the `agent` lookup hands it the exact live root Agent. The
ask blocks the Remote call until the human answers. This works but differs
from the agent-tool path.

### 7.5 Plan-mode is a preset row on the web surface

`dsh-web-app/cordis.patch.yml` disables the base `plan-mode` host row:
`- id: plan-mode, disabled: true`. The standard preset mounts it per agent
(`config/agent-presets/standard/agent.cordis.yml:110-111`). The plan
projection, the `/plan` command, and the `exit_plan_mode` review flow exist
only when a preset mounts `dsh-plan-mode`. The aidos preset must do the same
for its plan flows, or the "Chat about it" path stays dead.

### 7.6 The multi-project board has no shipped cold-read Remote

The client reads projections only for sessions it holds open
(`ProjectionValueStore`, `sessions.binding`). Cold reads live on the host
(`ctx.sessionProjectionCache.coldSnapshot`,
`dsh-session-projection-cache/lib/index.js:159-197`). No shipped Remote
exposes them. The global Tickets board needs a new aidos Remote method that
runs the cold read on the host and returns the view. A method whose first
parameter is a plain JSON session id (not the `agent` lookup) runs on the
root context (`dsh-api-gateway/lib/index.js:213-216`) and can read any
session's cache without resuming its agent.

### 7.7 Subagent sessions reject Remote lookups

`createApiRemoteAgentResolver` refuses subagent-owned identities with the
`agent-busy` fence (`dsh-api-remotes/lib/types/agent-lookup.js:25-33,76-148`).
A board Remote that takes the agent lookup cannot serve a subagent session.
That matches PLAN.md's depth rule (`PLAN.md:195`) but must hold in the
service too.

### 7.8 Version skew with PLAN.md

PLAN.md says the tree was checked at `@deepseek-ai/dsh@0.1.0-rc.7`
(`PLAN.md:49`). The top-level package is rc.7, but the installed
`@deepseek-ai/dsh-goal` and nearly all `dsh-*` packages are rc.8. The
verified signatures above are rc.8 signatures.

### 7.9 The tab bar hides when one tab exists

The tab bar renders only when `tabs.length > 1`
(`dsh-client-ui-conversation/lib/client.js:7298`). Chat always registers, so
a Tickets tab always appears. No board-specific risk here; noted for
completeness.

### 7.10 The `dsh.client.inject` contract

A board manifest must list the client services it requires, like the goal
plugin does (`inject: ["slots", "sessions", "remote", "remote.goals",
"locale", "conversationEvents"]`). The board's own namespaces add
`remote.aidos`. The `dsh.client.external` array is optional; the loader
validates it (`dsh-client-modules/lib/index.js:119-127`).

---

## Risks and open questions

1. **No slot beside New Session.** The global Tickets entry has no shipped
   seat. Evidence: `dsh-client-ui-sidebar/lib/client.js:204-217` hardcodes
   the button; the sidebar slot inventory has no adjacent list slot
   (`dsh-client-ui-sidebar/lib/types/client/contract/slots.d.ts:19-62`).
   The entry must use `sidebar.footer.action`, replace a single seat, or
   require a sidebar fork.

2. **`dsh-client-ui-primitives` and `dsh-client-ui-slots` are not in the
   installed tree.** They are inlined in shipped bundles and referenced by
   types. The board build needs them from npm (`0.0.1-rc.1`). Evidence:
   `dsh-client-runtime/lib/types/client/slots.d.ts:14-15`; the bundle heads
   at `dsh-client-ui-goal/lib/client.js:1-3`.

3. **The global board needs a new host-side cold-read Remote.** The client
   cannot cold-read other sessions today. Evidence:
   `dsh-session-projection-cache/lib/index.js:159-197` (host-only API),
   `dsh-client-runtime/lib/types/client/contract/sessions.d.ts:126` (client
   reads bindings only).

4. **Questions are not durable.** Signoff and send-back prompts leave no
   session event. Evidence:
   `dsh-host-apiproxy/lib/types/api/events.d.ts:88-95` (frames only),
   `dsh-user-approval/lib/types/index.d.ts:37-51` (approvals do log, by
   contrast).

5. **Ask requires the live root agent.** A board Remote can satisfy this via
   the `agent` lookup, but a non-agent caller cannot ask. Evidence:
   `dsh-host-apiproxy/lib/index.js:1859-1861`,
   `dsh-user-questions/lib/types/index.d.ts:58-60`.

6. **Plan-mode is preset-plane on the web surface.** The shipped web patch
   disables the host row. Evidence:
   `dsh-web-app/cordis.patch.yml` (`- id: plan-mode, disabled: true`),
   `config/agent-presets/standard/agent.cordis.yml:110-111`.

7. **Version skew.** PLAN.md cites rc.7; the domain packages installed are
   rc.8. Evidence: `dsh-goal/package.json` version `0.1.0-rc.8`.

8. **Open:** whether the board tab should use `order` values above 10 (the
   trajectory order) and whether `resolveSlotLabel` accepts a plain string
   label. Evidence for the ordering convention:
   `dsh-client-ui-trajectory/lib/client.js:7345` (`order: 10`),
   `dsh-client-ui-conversation/lib/client.js:10064` (`order: 0`).

9. **Open:** how the board renders inside a `conversation.view` entry. The
   entry component receives the standard kit, `useProjection`, and the
   entry's injected face (`ConvViewProps`,
   `dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts:495`).
   The board needs `sessionId` from the kit and the projection values for
   its grid.

10. **Open:** the plan-review intent is the only presentation intent shipped.
    Signoff and send-back flows either reuse `plan-review`, add a new
    intent, or stay on plain option questions. Evidence:
    `dsh-user-questions/lib/types/types.d.ts:18-29`.
