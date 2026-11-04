import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(resolve(root, "web/package.json"));
const { buildSchema, extendSchema, parse, printSchema } = require("graphql");
const [source, ...flags] = process.argv.slice(2);
if (
  !source ||
  flags.some((flag) => flag !== "--optional-premium") ||
  flags.length > 1
)
  throw Error(
    "Usage: node scripts/prepare-native-schema.mjs <actual-native-schema.graphqls> [--optional-premium]",
  );
let schema = buildSchema(readFileSync(resolve(source), "utf8"));
// Retain a previously exported optional paid contract for compilation only when
// Development disables its runtime ceiling. Never grant a key more access just
// for codegen. Verify active documents against the UNMODIFIED source export
// with check:ios-contract --without-paid; these extra types confer no authority.
if (
  flags.length &&
  !schema.getMutationType()?.getFields().executeTillyClaimPremium
)
  schema = extendSchema(
    schema,
    parse(
      readFileSync(
        resolve(root, "ios/GraphQL/Premium.optional.graphqls"),
        "utf8",
      ),
    ),
  );
const sdl = printSchema(schema) + "\n";
for (const target of [
  "schema.graphqls",
  "Execution/schema.graphqls",
  "Notifications/schema.graphqls",
  "Safety/schema.graphqls",
  "Selfies/schema.graphqls",
  "Challenges/schema.graphqls",
])
  writeFileSync(resolve(root, "ios/GraphQL", target), sdl);
console.log(
  "Prepared native codegen schemas. Keep the actual source export for separate runtime-scope validation.",
);
