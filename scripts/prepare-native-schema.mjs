import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(resolve(root, "web/package.json"));
const { buildSchema, printSchema } = require("graphql");
const [source, ...extra] = process.argv.slice(2);
if (!source || extra.length)
  throw Error(
    "Usage: node scripts/prepare-native-schema.mjs <actual-native-schema.graphqls>",
  );
const schema = buildSchema(readFileSync(resolve(source), "utf8"));
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
