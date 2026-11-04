import { challengeOperationGrants, challengeInputSchema, challengeOutputSchema } from '../../../foir/challenges.ts'
import { appOperationDefinitions } from "./operation-definitions.ts";
import { artworkQuota } from "./artwork-policy.ts";
import { checkoutQuota } from "../payments/manifest.ts";
import {
  safetyPublicationGrants,
  safetyInteractionGrants,
} from "./safety-manifest.ts";
import { appearanceQuota } from "./appearance-policy.ts";
import { appearanceOutputSchema } from "./appearance-contract.ts";
import { captureRequestEventSchema } from "./capture-finalization-contract.ts";
import { captureCheckEventSchema } from "../../../foir/capture-checks.ts";
import { reviewedModels } from "../../../foir/safety.ts";
import { challengeReviewGrants } from "./safety-manifest.ts";

/** Platform gap — config-owned appsecrets:read currently resolves as an absent
 * installation. Until that dispatch reader supports config ownership, these
 * business operations belong to the EXISTING Tilly install, whose credential
 * read is verified. No extra service/install, environment key or broader token.
 * Restore project ownership only after the same scoped read and privacy checks
 * pass there. See docs/operation-credentials.md for migration/removal criteria.
 */
export const installedOperationKeys = {
  save_catch: "tilly.save-catch",
  evaluate_challenges: "tilly.evaluate-challenges",
  update_capture_tags: "tilly.update-capture-tags",
  save_profile: "tilly.save-profile",
  add_field_note: "tilly.add-field-note",
  share_capture: "tilly.share-capture",
  post_my_catches: "tilly.post-my-catches",
  suggest_cat_appearance: "tilly.suggest-cat-appearance",
  check_capture: "tilly.check-capture",
} as const;
export type InstalledOperation = keyof typeof installedOperationKeys;
export const isInstalledOperation = (key: string): key is InstalledOperation =>
  Object.hasOwn(installedOperationKeys, key);
export const executionGrant = (grant: string) => {
  const prefix = "operations:execute:";
  const key = grant.startsWith(prefix) ? grant.slice(prefix.length) : "";
  return isInstalledOperation(key)
    ? prefix + installedOperationKeys[key]
    : grant;
};
export class InstalledDispatchRefusal extends Error {}
export function requireInstalledDispatch(route: string, operationKey: string) {
  const key = route === "save-catch" ? "save_catch" : route;
  if (isInstalledOperation(key) && operationKey !== installedOperationKeys[key])
    throw new InstalledDispatchRefusal(
      "This route requires its installed operation dispatch.",
    );
}
const keeps = (key: string) =>
  ["read", "create", "attribute", "write"].map(
    (action) => `records:${action}:${key}`,
  );
export function installedOperationDefinitions(origin: string) {
  const publishing = appOperationDefinitions(origin)
    .filter((op) => isInstalledOperation(op.key))
    .map((op) => ({
      ...op,
      grants: [
        ...new Set([
          ...op.grants,
          ...safetyPublicationGrants,
          ...(["add_field_note", "share_capture"].includes(op.key)
            ? safetyInteractionGrants
            : []),
        ]),
      ],
    }));
  return [
    ...publishing,
    {
      key: "evaluate_challenges", name: "Evaluate photo challenges",
      description: "Automatically checks an owned capture against published dated challenge criteria and records private progress and earned badges.",
      endpoint: `${origin}/operations/evaluate_challenges`, mode: "async" as const,
      callbackTtlSeconds: 3600, retryPolicy: {maxRetries: 0},
      quotas: {rules: [{points: 20, duration: 86400, scope: "user" as const, message: "Challenge checks are paused until tomorrow."}]},
      grants: [...challengeOperationGrants, "appsecrets:read", "files:read"],
      inputSchema: challengeInputSchema, outputSchema: challengeOutputSchema,
    },
    {
      key: "check_capture", name: "Check a saved catch",
      description: "After a catch is saved, moderates anything it shares, hiding a flagged photo for review, then checks it against the photo challenges.",
      endpoint: `${origin}/operations/check_capture`, mode: "async" as const,
      callbackTtlSeconds: 3600, retryPolicy: { maxRetries: 0 },
      quotas: { rules: [{ points: 30, duration: 86400, scope: "user" as const, message: "Catch checks are paused until tomorrow." }] },
      grants: [...new Set([
        "records:read:capture-check",
        ...challengeOperationGrants,
        ...safetyPublicationGrants,
        // A flagged photo is hidden with the reviewer's walk, which also
        // narrows other users' reposts of it and invalidates its awards.
        ...challengeReviewGrants,
        ...["moderation-case", ...reviewedModels].flatMap((model) => [`records:read.all:${model}`, `records:write.all:${model}`]),
      ])],
      inputSchema: captureCheckEventSchema,
      outputSchema: { type: "object", properties: { ok: { type: "boolean" }, moderation: { type: "string" }, challenges: { type: "string" }, skipped: { type: "boolean" } } },
    },
    {
      key: "suggest_cat_appearance",
      name: "Suggest a captured cat’s appearance",
      endpoint: `${origin}/operations/suggest_cat_appearance`,
      mode: "async" as const,
      callbackTtlSeconds: 3600,
      quotas: appearanceQuota,
      retryPolicy: { maxRetries: 0 },
      grants: [
        "project:stand",
        "appsecrets:read",
        "records:read:appearance-account",
        "records:read:capture-finalization",
        ...keeps("cat-appearance"),
        "records:read:app-settings",
        "records:read:appearance-request",
        // This project-owned ledger is private and shared across contributors.
        // Only this handler reads across it, by the verified file/cat digest;
        // clients receive neither this grant nor raw observation contents.
        "records:read.all:appearance-observation",
        "records:create:appearance-observation",
        "records:read:appearance-vote",
        "records:create:appearance-vote",
        "records:read:cat",
        "records:read:premium-grant",
        "records:read:capture-photo",
        "records:read:capture-cat-tag",
        "records:read:moderation-case",
        "files:read",
      ],
      // The paid-purpose credential belongs to the existing Tilly install in Fóir.
      // Agent execution authority is not needed by this operation.
      inputSchema: captureRequestEventSchema("appearance"),
      outputSchema: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          id: { type: "string" },
          answer: appearanceOutputSchema,
        },
      },
    },
  ];
}
/** Quotas are configured on native operations separately: the served manifest
 * does not declare them. Installation updates currently reset quota/callback
 * settings, so reapply/read back AFTER EVERY app update. Keep paid switches off
 * and pause hooks/callers during that maintenance. Reopen only after the native
 * policies are selectively released. No app-local quota counter substitutes
 * for Fóir's meter. See docs/operation-credentials.md. */
export function installedOperationPolicies() {
  return [
    ...installedOperationDefinitions("https://example.invalid").map((op) => ({
      key: installedOperationKeys[op.key as InstalledOperation],
      quotas: op.quotas,
      mode: op.mode,
    })),
    {
      key: "tilly.make-catch-art",
      quotas: artworkQuota,
      mode: "async" as const,
    },
    { key: "tilly.web-checkout", quotas: checkoutQuota, mode: "sync" as const },
  ];
}
export function installedManifestOperations(origin: string) {
  return installedOperationDefinitions(origin).map((op) => ({
    key: installedOperationKeys[op.key as InstalledOperation].slice(
      "tilly.".length,
    ),
    name: op.name,
    endpoint: new URL(op.endpoint).pathname,
    ...("description" in op ? { description: op.description } : {}),
    supports_async: op.mode === "async",
    timeout_ms: 300_000,
    retry_policy: { maxRetries: 0 },
    grants: op.grants,
    input_schema: op.inputSchema,
    output_schema: op.outputSchema,
  }));
}
