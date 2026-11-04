import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { installedOperationPolicies } from "../web/src/server/operations/installed-operations.ts";

// Settings for already-installed operations, never a second config push. Use
// OAuth and an explicitly selected project; no provider or broad Fóir API key.
// Fóir gap (docs/known-gaps.md, "Installation policies"): the app manifest
// can't carry quotas or preconditions, and an app update resets them. Here:
// re-apply them after every install or update. Closes when the manifest carries
// them and updates keep them.
const apply = process.argv.slice(2);
if (apply.some((arg) => arg !== "--apply") || apply.length > 1)
  throw Error("Use no arguments to preview, or --apply.");
const { FOIR_API_URL, FOIR_PROJECT_ID, FOIR_TENANT_ID } = process.env;
if (!FOIR_API_URL || !FOIR_PROJECT_ID || !FOIR_TENANT_ID)
  throw Error(
    "Set FOIR_API_URL, FOIR_PROJECT_ID and FOIR_TENANT_ID explicitly.",
  );
const env = { ...process.env };
delete env.FOIR_API_KEY;
const cli = process.env.FOIR_CLI_PATH || "foir";
const context = [
  "--api-url",
  FOIR_API_URL,
  "--project-id",
  FOIR_PROJECT_ID,
  "--tenant-id",
  FOIR_TENANT_ID,
  "--org-id",
  "-",
  "--json",
];
function call(args: string[]) {
  const result = spawnSync(cli, [...context, ...args], {
    env,
    encoding: "utf8",
  });
  if (result.error || result.status !== 0)
    throw Error(
      "Fóir operation settings request failed; no automatic retry. Inspect the selected project.",
    );
  return JSON.parse(result.stdout);
}
for (const definition of installedOperationPolicies()) {
  const key = definition.key;
  const before = call(["operations", "get", key]);
  if (before.key !== key || !before.id)
    throw Error("The existing installed operation did not match.");
  const matches =
    isDeepStrictEqual(before.quotas, definition.quotas) &&
    (definition.mode !== "async" || before.callbackTtlSeconds === 3600);
  console.log(
    `${apply.length ? "Apply" : "Preview"} ${key}: per-user native quota ${definition.quotas.rules[0].points}/${definition.quotas.rules[0].duration}s; async=${definition.mode === "async"}; ${matches ? "matches" : "needs update"}`,
  );
  if (matches) continue;
  if (!apply.length) continue;
  call([
    "x-generated",
    "operations",
    "update",
    "--id",
    before.id,
    "--quotas",
    JSON.stringify(definition.quotas),
    ...(definition.mode === "async" ? ["--callback-ttl-seconds", "3600"] : []),
  ]);
  const after = call(["operations", "get", key]);
  if (
    !isDeepStrictEqual(after.quotas, definition.quotas) ||
    (definition.mode === "async" && after.callbackTtlSeconds !== 3600)
  )
    throw Error(
      `Native quota/callback readback did not match ${key}; leave client/hook admission off.`,
    );
}
if (apply.length)
  console.log(
    "Settings readback verified. Review/selectively release only these operation drafts before enabling their callers/hooks.",
  );
