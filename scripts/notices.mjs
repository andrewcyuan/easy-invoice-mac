// Keep dependency notices in the app, alongside the AGPL license and corresponding source.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const js = JSON.parse(
  execFileSync("corepack", ["pnpm", "licenses", "list", "--prod", "--json"], {
    encoding: "utf8",
  }),
);
const cargo = JSON.parse(
  execFileSync(
    "cargo",
    [
      "metadata",
      "--manifest-path",
      "src-tauri/Cargo.toml",
      "--format-version",
      "1",
    ],
    { encoding: "utf8", maxBuffer:32*1024*1024, stdio: ["ignore", "pipe", "ignore"] },
  ),
);
const entries = [
  ...Object.values(js)
    .flat()
    .map((p) => ({
      name: p.name,
      version: p.versions.join(", "),
      license: p.license,
      dir: p.paths[0],
    })),
  ...cargo.packages
    .filter((p) => p.name !== "easy-invoice-mac")
    .map((p) => ({
      name: p.name,
      version: p.version,
      license: p.license,
      dir: p.manifest_path.replace(/\/Cargo.toml$/, ""),
    })),
];
const sections = entries.map((p) => {
  const files = readdirSync(p.dir).filter((name) =>
    /^(licen[cs]e|copying|notice|copyright)([.-]|$)/i.test(name),
  );
  const notices = files.flatMap((name) => {
    try {
      return [readFileSync(join(p.dir, name), "utf8")];
    } catch {
      return [];
    }
  });
  return `${p.name} ${p.version}\nLicense: ${p.license}\n${notices.join("\n")}`;
});
sections.push(readFileSync("public/fonts/OFL.txt", "utf8"));
sections.push(readFileSync("src-tauri/resources/SHADCN_LICENSE.txt", "utf8"));
writeFileSync(
  "src-tauri/resources/THIRD_PARTY_NOTICES.txt",
  sections.join("\n\n" + "=".repeat(72) + "\n\n"),
);
