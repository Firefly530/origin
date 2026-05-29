require("./loadEnv");
const { app } = require("./backend/app");
const { initializeDatabase } = require("./backend/db/initData");
const { prisma } = require("./backend/db/prisma");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);
const BASE_PORT = Number(process.env.PORT || 3000);
const MAX_PORT_ATTEMPTS = 20;
let serverInstance = null;
let shuttingDown = false;

/** `npm run dev` 时自动打开默认浏览器；设置 NO_OPEN_BROWSER=1 可关闭 */
function openBrowserInDev(port) {
  if (process.env.npm_lifecycle_event !== "dev") return;
  if (process.env.NO_OPEN_BROWSER === "1") return;
  const url = `http://127.0.0.1:${port}`;
  setTimeout(() => {
    try {
      if (process.platform === "win32") {
        exec(`start "" "${url}"`, { windowsHide: true });
      } else if (process.platform === "darwin") {
        exec(`open "${url}"`);
      } else {
        exec(`xdg-open "${url}"`);
      }
    } catch (err) {
      console.warn("Could not open browser:", err.message);
    }
  }, 500);
}

function startServerWithRetry(startPort, attemptsLeft, onPortInUse) {
  return new Promise((resolve, reject) => {
    const server = app
      .listen(startPort, () => {
        console.log(`Server running on http://localhost:${startPort}`);
        resolve(server);
      })
      .on("error", (err) => {
        if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
          Promise.resolve(onPortInUse?.(startPort))
            .then((handled) => {
              if (handled) {
                console.warn(`Port ${startPort} reclaimed, retrying same port...`);
                resolve(startServerWithRetry(startPort, attemptsLeft - 1, onPortInUse));
                return;
              }
              const nextPort = startPort + 1;
              console.warn(`Port ${startPort} is busy, retrying on ${nextPort}...`);
              resolve(startServerWithRetry(nextPort, attemptsLeft - 1, onPortInUse));
            })
            .catch(reject);
          return;
        }
        reject(err);
      });
  });
}

async function getWindowsListeningPids(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano -p tcp | findstr :${port}`);
    const lines = stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const pids = lines
      .filter((line) => /LISTENING/i.test(line))
      .map((line) => line.split(/\s+/).pop())
      .filter(Boolean)
      .map((pid) => Number(pid))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
    return [...new Set(pids)];
  } catch {
    return [];
  }
}

async function reclaimPortIfPossible(port) {
  if (process.platform !== "win32") return false;
  const pids = await getWindowsListeningPids(port);
  if (pids.length === 0) return false;

  for (const pid of pids) {
    try {
      await execAsync(`taskkill /PID ${pid} /F`);
      console.warn(`Killed stale process on port ${port}: PID ${pid}`);
    } catch (err) {
      console.warn(`Failed to kill PID ${pid}: ${err.message}`);
    }
  }
  return true;
}

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down...`);
  try {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(() => resolve()));
    }
    await prisma.$disconnect();
  } catch (err) {
    console.error("Shutdown error:", err);
  } finally {
    process.exit(0);
  }
}

async function bootstrap() {
  try {
    await initializeDatabase();
    serverInstance = await startServerWithRetry(BASE_PORT, MAX_PORT_ATTEMPTS, reclaimPortIfPossible);
    const addr = serverInstance.address();
    const port = typeof addr === "object" && addr && addr.port ? addr.port : BASE_PORT;
    openBrowserInDev(port);
  } catch (err) {
    console.error("Failed to bootstrap server:", err);
    process.exit(1);
  }
}

bootstrap();

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGBREAK", () => gracefulShutdown("SIGBREAK"));
