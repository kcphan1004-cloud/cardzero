import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const scriptPath = path.join(
  process.cwd(),
  "scripts",
  "fix-generated-energy-from-official-html.mjs",
);

const forwarded = process.argv.slice(2);

const args = [
  scriptPath,
  "--series=mushoku-tensei",
  ...forwarded,
];

const child = spawn(
  process.execPath,
  args,
  {
    stdio: "inherit",
    shell: false,
  },
);

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
