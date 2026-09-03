/**
 * Item 24 (tool layer). The default config is deterministic and the service
 * bootstrap binds one workspace project.
 *
 * The B0 mirror of the deterministic default lives in the B0 test-24. The B1
 * claims here are the ones the kernel could not port (PORT-MAP.md row 24):
 * the service bootstrap creates one workspace project, a second service over
 * the same session keeps it, and the `aidos` settings namespace holds the
 * config (SPEC-B1.md decision 14). A gate that names an unregistered kind
 * fails at config load (C3's evaluate; decision 14) — that claim is C3.
 */

import { describe, expect, it, beforeEach } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { DEFAULT_CONFIG } from "../src/kernel/constants";
import {
  asContext,
  createHarness,
  successJson,
  type Harness,
} from "./b1-harness";

describe("the service bootstrap is deterministic", () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
  });

  it("the default settings value is the DEFAULT_CONFIG mirror", () => {
    expect(harness.settingsValue).toEqual(DEFAULT_CONFIG);
    expect(JSON.parse(JSON.stringify(harness.settingsValue))).toEqual(DEFAULT_CONFIG);
  });

  it("the service registers the aidos settings namespace", () => {
    expect(harness.settingsRegistrations.map((entry) => entry.namespace)).toContain("aidos");
  });

  it("the bootstrap binds one workspace project", async () => {
    const created = successJson(await harness.runTool("set_ticket", { title: "First" }));
    const firstProject = created.projectId;
    expect(firstProject).toBe(1);
  });

  it("a second service over the same session creates no second project", async () => {
    const first = successJson(await harness.runTool("set_ticket", { title: "Made first" }));
    const firstProject = first.projectId;

    // A fresh service folds the same session log; its bootstrap must bind the
    // same project instead of creating a second one.
    const second = createHarness();
    for (const event of harness.aidosEvents(harness.agent)) {
      second.appendAidosEvent(second.agent, event);
    }
    second.installService();
    apply(asContext(second.ctx), {});

    const again = successJson(await second.runTool("set_ticket", { title: "Made second" }));
    const secondProject = again.projectId;
    expect(secondProject).toBe(firstProject);
  });
});
