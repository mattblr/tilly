import { continueRun, type OperationPayload } from "@foir/sdk/server";
import {
  appearanceAnswer,
  appearanceAnswers,
  type AppearanceTag,
} from "./appearance-contract";
import type { QueryClient } from "./types";

import {
  addAppearanceEvidence,
  type AppearanceEvidence,
} from "../../lib/appearance-evidence";
type Cursor = { v: 2; index: number };
const next = (cursor: Cursor) =>
  continueRun({ cursor: JSON.stringify(cursor) });
const empty = (): AppearanceEvidence => ({
  samples: 0,
  breeds: [],
  patterns: [],
});
const digest = async (value: unknown) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(value)),
      ),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
/** Each immutable file/cat contributes once. Public rows contain only a cat and
 * a dimension; raw analysis and source identities remain in the private ledger.
 * Native aggregate reads add concurrent votes without mutable shared counters.
 */
export async function recordAppearanceEvidence(
  foir: QueryClient,
  envelope: OperationPayload,
  fileId: string,
  tags: readonly AppearanceTag[],
  result: unknown,
) {
  const body = result as { answer?: unknown } | null,
    answers = appearanceAnswers(body?.answer, tags.length).map(
      ({ index, ...answer }) => answer,
    );
  const c: Cursor = envelope.continuation?.cursor
    ? JSON.parse(envelope.continuation.cursor)
    : { v: 2, index: 0 };
  if (
    c.v !== 2 ||
    !Number.isInteger(c.index) ||
    c.index < 0 ||
    c.index > tags.length
  )
    throw Error("Invalid appearance evidence continuation.");
  if (c.index === tags.length) return { ok: true };
  const tag = tags[c.index],
    candidate = answers[c.index];
  if (addAppearanceEvidence(empty(), candidate).samples === 0)
    return next({ v: 2, index: c.index + 1 });
  const sourceKey = await digest([fileId, tag.catId]),
    key = `appearance-${sourceKey}`;
  // Use an exact native filter, bounded to two, so duplicate rows or an
  // incomplete result refuse rather than treating existing evidence as absent.
  const found = await foir.raw<{
    appearanceObservations: {
      edges: { node: { catKey: string; sourceKey: string; answer: unknown } }[];
      totalCount: number;
    };
  }>(
    "query ExistingEvidence($key: String) { appearanceObservations(first: 2, where: {naturalKey: {eq: $key}}) { edges { node { catKey sourceKey answer } } totalCount } }",
    { key },
  );
  if (
    found.appearanceObservations.edges.length > 1 ||
    found.appearanceObservations.totalCount !==
      found.appearanceObservations.edges.length
  )
    throw Error(
      "The private appearance ledger lookup is incomplete or ambiguous.",
    );
  const observation = found.appearanceObservations.edges[0]?.node;
  let answer = candidate;
  if (observation) {
    if (observation.catKey !== tag.catId || observation.sourceKey !== sourceKey)
      throw Error("Appearance evidence identity changed.");
    answer = appearanceAnswer(observation.answer);
  } else
    await foir
      .raw(
        "mutation CreateEvidence($input: CreateAppearanceObservationInput!, $key: String) { createAppearanceObservation(input: $input, idempotencyKey: $key) { record { _id } } }",
        {
          key,
          input: { naturalKey: key, catKey: tag.catId, sourceKey, answer },
        },
      )
      .catch((error) => {
        console.warn("Tilly appearance evidence write refused", {
          step: "observation",
        });
        throw error;
      });
  const evidence = addAppearanceEvidence(empty(), answer);
  const dimensions = [
    "sample:photo",
    ...evidence.breeds.map(
      (row) => `breed:${row.label.normalize("NFKC").toLocaleLowerCase("en")}`,
    ),
    ...evidence.patterns.map((row) => `pattern:${row.label}`),
  ];
  for (const dimension of dimensions) {
    const voteKey = `vote-${await digest([sourceKey, dimension])}`;
    const existing = await foir.raw<{
      appearanceVotes: {
        edges: { node: { catKey: string; dimension: string } }[];
        totalCount: number;
      };
    }>(
      "query ExistingVote($key: String) { appearanceVotes(first: 2, where: {naturalKey: {eq: $key}}) { edges { node { catKey dimension } } totalCount } }",
      { key: voteKey },
    );
    if (
      existing.appearanceVotes.edges.length > 1 ||
      existing.appearanceVotes.totalCount !==
        existing.appearanceVotes.edges.length
    )
      throw Error(
        "The public appearance vote lookup is incomplete or ambiguous.",
      );
    const vote = existing.appearanceVotes.edges[0]?.node;
    if (vote) {
      if (vote.catKey !== tag.catId || vote.dimension !== dimension)
        throw Error("The public evidence identity changed.");
      continue;
    }
    await foir
      .raw(
        "mutation CreateVote($input: CreateAppearanceVoteInput!, $key: String) { createAppearanceVote(input: $input, idempotencyKey: $key) { record { _id } } }",
        {
          key: voteKey,
          input: { naturalKey: voteKey, catKey: tag.catId, dimension },
        },
      )
      .catch((error) => {
        console.warn("Tilly appearance evidence write refused", {
          step: "vote",
        });
        throw error;
      });
  }
  return next({ v: 2, index: c.index + 1 });
}
