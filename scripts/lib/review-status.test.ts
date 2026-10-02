import assert from "node:assert/strict";
import { test } from "node:test";
import { reviewStatus, type Approvals } from "./review-status.js";

const NONE: Approvals = { collections: new Set(), records: new Set() };
const BUKHARI: Approvals = { collections: new Set(["bukhari"]), records: new Set() };
const OK = { forcedPending: false, neverApprovable: false };
const EXCLUDED = { forcedPending: true, neverApprovable: false };
const NEVER = { forcedPending: true, neverApprovable: true };

const cases: Array<[string, Parameters<typeof reviewStatus>, "reviewed" | "pending"]> = [
  ["no approvals: pending", ["bukhari:1", "bukhari", NONE, OK], "pending"],
  ["collection approved: reviewed", ["bukhari:1", "bukhari", BUKHARI, OK], "reviewed"],
  ["another collection approved: pending", ["muslim:93", "muslim", BUKHARI, OK], "pending"],
  ["excluded record under a collection approval: pending", ["bukhari:402.2", "bukhari", BUKHARI, EXCLUDED], "pending"],
  [
    "excluded record with its own approval: reviewed",
    ["bukhari:402.2", "bukhari", { collections: new Set(["bukhari"]), records: new Set(["bukhari:402.2"]) }, EXCLUDED],
    "reviewed",
  ],
  [
    "own approval without a collection approval: reviewed",
    ["muslim:93", "muslim", { collections: new Set(), records: new Set(["muslim:93"]) }, OK],
    "reviewed",
  ],
  [
    "an approval of another record does not leak: pending",
    ["muslim:94", "muslim", { collections: new Set(), records: new Set(["muslim:93"]) }, OK],
    "pending",
  ],
  [
    "no citation number: pending even with collection and record approvals",
    ["muslim:3", "muslim", { collections: new Set(["muslim"]), records: new Set(["muslim:3"]) }, NEVER],
    "pending",
  ],
];

for (const [name, args, expected] of cases) {
  test(`reviewStatus — ${name}`, () => assert.equal(reviewStatus(...args), expected));
}
