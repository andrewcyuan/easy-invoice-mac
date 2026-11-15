import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
mkdirSync("src-tauri/resources", { recursive: true });
execFileSync("tar", [
  "--exclude=.git",
  "--exclude=node_modules",
  "--exclude=dist",
  "--exclude=target",
  "--exclude=gen",
  "--exclude=source.tar.gz",
  "--exclude=test-results",
  "-czf",
  "src-tauri/resources/source.tar.gz",
  ".",
]);
