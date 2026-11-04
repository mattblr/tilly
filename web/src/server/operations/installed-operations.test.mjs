import test from "node:test";
import assert from "node:assert/strict";
import manifest from "./manifest.ts";
import {
  installedOperationKeys,
  installedOperationDefinitions,
  installedManifestOperations,
  requireInstalledDispatch,
  executionGrant,
} from "./installed-operations.ts";

test("credential operations keep distinct scoped owners and reject old or cross-routed dispatches", () => {
  for (const [route, key] of Object.entries(installedOperationKeys)) {
    assert.doesNotThrow(() => requireInstalledDispatch(route, key));
    assert.throws(() => requireInstalledDispatch(route, route));
    assert.throws(() => requireInstalledDispatch(route, "tilly.claim-premium"));
    assert.equal(
      executionGrant(`operations:execute:${route}`),
      `operations:execute:${key}`,
    );
  }
  assert.doesNotThrow(() =>
    requireInstalledDispatch("save-catch", "tilly.save-catch"),
  );
  assert.equal(executionGrant("records:read"), "records:read");
});
test("the installed manifest preserves contracts, bounded callbacks and purpose fields without a second service", () => {
  const origin = "https://fixture.example",
    app = manifest(origin);
  const definitions = installedOperationDefinitions(origin);
  const ops = installedManifestOperations(origin);
  assert.equal(ops.length, 9);
  assert.equal(
    new Set(app.operations.map((op) => op.key)).size,
    app.operations.length,
  );
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i],
      source = definitions[i];
    assert.ok(op.grants.includes("appsecrets:read"));
    assert.deepEqual(op.input_schema, source.inputSchema);
    assert.deepEqual(op.output_schema, source.outputSchema);
    assert.deepEqual(op.grants, source.grants);
    assert.equal(op.endpoint, new URL(source.endpoint).pathname);
    assert.equal(op.supports_async, source.mode === "async");
    assert.equal(op.retry_policy.maxRetries, 0);
    assert.ok(
      source.quotas.rules.every(
        (rule) =>
          rule.scope === "user" && rule.points > 0 && rule.duration === 86400,
      ),
    );
  }
  assert.equal(app.credentials.schema.properties.challengeOpenAI, undefined);
  for (const field of ["moderationOpenAI", "appearanceOpenAI", "openai"]) {
    assert.equal(app.credentials.schema.properties[field].format, "password");
    assert.equal(app.credentials.schema.properties[field].default, undefined);
  }
});
