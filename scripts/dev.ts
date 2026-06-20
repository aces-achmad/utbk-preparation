import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const env = {
  ...loadFileEnv(),
  ...process.env,
};

const backend = Bun.spawn(["bun", "run", "dev:backend"], {
  cwd: process.cwd(),
  env,
  stdout: "inherit",
  stderr: "inherit",
});

const frontend = Bun.spawn(["bun", "run", "dev:frontend"], {
  cwd: process.cwd(),
  env,
  stdout: "inherit",
  stderr: "inherit",
});

let shuttingDown = false;

const shutdown = () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  backend.kill();
  frontend.kill();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const firstExit = await Promise.race([
  backend.exited.then((code) => ({ process: "backend", code })),
  frontend.exited.then((code) => ({ process: "frontend", code })),
]);

shutdown();

const [backendExitCode, frontendExitCode] = await Promise.all([
  backend.exited,
  frontend.exited,
]);

process.exit(
  firstExit.code !== 0
    ? firstExit.code
    : backendExitCode !== 0
      ? backendExitCode
      : frontendExitCode,
);

function loadFileEnv() {
  const envPath = join(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return {};
  }

  const contents = readFileSync(envPath, "utf8");

  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        return [key, value];
      }),
  );
}
