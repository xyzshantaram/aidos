/**
 * Project creation is lazy, not eager at session start.
 *
 * aidos-core used to bootstrap a workspace project into every session as soon
 * as the service mounted (`agent/session-start` plus a loop over live agents),
 * appending a `project/created` event even to standard-mode and subagent
 * sessions that never use aidos. That event type is an aidos type the host
 * session reader refuses unless the envelope is marked ignorable, so every
 * polluted session failed to load. This pins the fix: constructing the service
 * registers no `agent/session-start` bootstrap, and firing that event appends
 * nothing. The project is created lazily on the first real board operation
 * (covered by the same harness in test-24-tool-bootstrap-one-project).
 */
import { describe, expect, it } from "vitest";

import { createHarness } from "./b1-harness";

describe("project creation is lazy, not eager at session start", () => {
  it("constructing the service registers no agent/session-start bootstrap", () => {
    const harness = createHarness();
    harness.installService();
    expect(harness.listeners["agent/session-start"] ?? []).toHaveLength(0);
  });

  it("firing session-start appends no project/created to a fresh session", () => {
    const harness = createHarness();
    harness.installService();
    expect(harness.agent.session.events).toHaveLength(0);

    harness.fireSessionStart(harness.agent);

    const created = harness.agent.session.events.filter(
      (event) => event.type === "project/created",
    );
    expect(created).toHaveLength(0);
    expect(harness.agent.session.events).toHaveLength(0);
  });
});
