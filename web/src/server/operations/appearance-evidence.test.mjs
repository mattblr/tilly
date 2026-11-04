import test from "node:test";
import assert from "node:assert/strict";
import { recordAppearanceEvidence } from "./appearance-evidence.ts";
import { evidenceFromGroups } from "../../lib/appearance-evidence.ts";
const tag = { key: "cat-tag", catId: "cat00000000001" };
const result = (breed) => ({
  answer: {
    cats: [
      {
        index: 0,
        status: "possible",
        possibilities: [breed],
        coatLength: "long",
        pattern: "tabby",
      },
    ],
  },
});
function fixture() {
  const observations = new Map(),
    votes = new Map();
  let calls = 0,
    maxCalls = 0;
  const raw = async (q, v) => {
    assert.ok(++calls <= 12, "evidence dispatch stays bounded");
    if (q.includes("ExistingEvidence")) {
      const row = observations.get(v.key);
      return {
        appearanceObservations: {
          edges: row ? [{ node: row }] : [],
          totalCount: row ? 1 : 0,
        },
      };
    }
    if (q.includes("CreateEvidence")) {
      assert.equal(v.input.catKey, tag.catId);
      assert.equal(v.input.naturalKey, v.key);
      if (!observations.has(v.key)) observations.set(v.key, v.input);
      return {
        createAppearanceObservation: { record: { _id: "observation0001" } },
      };
    }
    if (q.includes("ExistingVote")) {
      const row = votes.get(v.key);
      return {
        appearanceVotes: {
          edges: row ? [{ node: row }] : [],
          totalCount: row ? 1 : 0,
        },
      };
    }
    if (q.includes("CreateVote")) {
      assert.equal(v.input.naturalKey, v.key);
      if (!votes.has(v.key)) votes.set(v.key, v.input);
      return { createAppearanceVote: { record: { _id: "publicvote00001" } } };
    }
    throw Error(q);
  };
  return {
    foir: { raw },
    observations,
    votes,
    get summary() {
      const counts = new Map();
      for (const v of votes.values())
        counts.set(v.dimension, (counts.get(v.dimension) ?? 0) + 1);
      return evidenceFromGroups(
        [...counts].map(([key, count]) => ({ key, count })),
      );
    },
    slice() {
      maxCalls = Math.max(maxCalls, calls);
      calls = 0;
    },
    get maxCalls() {
      return Math.max(maxCalls, calls);
    },
  };
}
async function drain(f, file, breed) {
  let envelope = {};
  for (let i = 0; i < 50; i++) {
    f.slice();
    const out = await recordAppearanceEvidence(
      f.foir,
      envelope,
      file,
      [tag],
      result(breed),
    );
    if (!(out instanceof Response)) return out;
    envelope = { continuation: { cursor: (await out.json()).cursor } };
  }
  throw Error("evidence did not finish");
}
test("one cat accumulates distinct photos and duplicate delivery never adds another vote", async () => {
  const f = fixture();
  await drain(f, "file00000000001", "Maine Coon");
  await drain(f, "file00000000002", "Siberian");
  await drain(f, "file00000000001", "Abyssinian");
  assert.equal(f.observations.size, 2);
  assert.equal(f.summary.samples, 2);
  assert.deepEqual(f.summary.breeds, [
    { label: "Maine Coon", count: 1 },
    { label: "Siberian", count: 1 },
  ]);
  assert.ok(f.maxCalls <= 12);
  assert.ok(
    [...f.observations.values()].every(
      (row) => !JSON.stringify(row).includes("file000"),
    ),
  );
});
test("a private ledger row for another cat cannot supply evidence even with server ledger read scope", async () => {
  const f = fixture();
  await drain(f, "file00000000001", "Maine Coon");
  const row = [...f.observations.values()][0];
  row.catKey = "foreigncat000001";
  await assert.rejects(
    drain(f, "file00000000001", "Siberian"),
    /identity changed/,
  );
  assert.equal(f.votes.size, 3);
});
test("an incomplete ledger read cannot be treated as absent evidence or create another vote", async () => {
  const f = fixture(),
    original = f.foir.raw;
  f.foir.raw = async (q, v) =>
    q.includes("ExistingEvidence")
      ? { appearanceObservations: { edges: [], totalCount: 1 } }
      : original(q, v);
  await assert.rejects(
    drain(f, "file00000000001", "Maine Coon"),
    /incomplete or ambiguous/,
  );
  assert.equal(f.observations.size, 0);
  assert.equal(f.votes.size, 0);
});
test("an interrupted public vote write is repaired without duplicating paid work or earlier votes", async () => {
  const f = fixture(),
    original = f.foir.raw;
  let fail = true;
  f.foir.raw = async (q, v) => {
    if (
      fail &&
      q.includes("CreateVote") &&
      v.input.dimension === "pattern:tabby"
    ) {
      fail = false;
      throw Error("public vote transport refused");
    }
    return original(q, v);
  };
  await assert.rejects(
    drain(f, "file00000000001", "Maine Coon"),
    /transport refused/,
  );
  assert.equal(f.observations.size, 1);
  await drain(f, "file00000000001", "Maine Coon");
  assert.equal(f.summary.samples, 1);
  assert.equal(f.summary.breeds[0].count, 1);
  assert.equal(f.summary.patterns[0].count, 1);
  assert.equal(f.votes.size, 3);
});
