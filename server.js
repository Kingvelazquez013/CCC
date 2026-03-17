/**
 * Custom Next.js server with WebSocket PTY support.
 *
 * Usage:
 *   node server.js
 *
 * This wraps the standard Next.js handler and adds WebSocket upgrade
 * handling for the /api/terminal path. When a client connects via WS,
 * a PTY (pseudo-terminal) is spawned and piped bidirectionally.
 *
 * Dependencies (optional — terminal works in HTTP fallback without these):
 *   npm install node-pty ws
 */

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "4000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let pty, WebSocketServer;

try {
  pty = require("node-pty");
  const ws = require("ws");
  WebSocketServer = ws.WebSocketServer;
  console.log("[server] node-pty + ws loaded — PTY terminal enabled");
} catch {
  console.log("[server] node-pty or ws not found — terminal will use HTTP fallback");
  console.log("[server] Install with: npm install node-pty ws");
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("[server] Error handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // WebSocket upgrade for terminal
  if (pty && WebSocketServer) {
    const wss = new WebSocketServer({ noServer: true });
    const sessions = new Map();

    server.on("upgrade", (request, socket, head) => {
      const { pathname } = parse(request.url, true);

      if (pathname === "/api/terminal") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    wss.on("connection", (ws) => {
      const shell = process.env.SHELL || "/bin/bash";
      const term = pty.spawn(shell, [], {
        name: "xterm-256color",
        cols: 120,
        rows: 30,
        cwd: process.cwd(),
        env: { ...process.env, TERM: "xterm-256color" },
      });

      const sessionId = `pty-${Date.now()}`;
      sessions.set(sessionId, term);

      console.log(`[terminal] Session ${sessionId} started (PID: ${term.pid})`);

      // PTY → WebSocket
      term.onData((data) => {
        if (ws.readyState === 1) {
          ws.send(data);
        }
      });

      term.onExit(({ exitCode }) => {
        console.log(`[terminal] Session ${sessionId} exited (code: ${exitCode})`);
        sessions.delete(sessionId);
        if (ws.readyState === 1) {
          ws.close();
        }
      });

      // WebSocket → PTY
      ws.on("message", (msg) => {
        const data = msg.toString();

        // Handle resize commands
        if (data.startsWith("\x1b[resize:")) {
          const match = data.match(/resize:(\d+),(\d+)/);
          if (match) {
            term.resize(parseInt(match[1]), parseInt(match[2]));
          }
          return;
        }

        term.write(data);
      });

      ws.on("close", () => {
        console.log(`[terminal] Session ${sessionId} closed`);
        term.kill();
        sessions.delete(sessionId);
      });
    });

    // Cleanup on server shutdown
    process.on("SIGINT", () => {
      for (const [id, term] of sessions) {
        console.log(`[terminal] Killing session ${id}`);
        term.kill();
      }
      process.exit(0);
    });
  }

  server.listen(port, hostname, () => {
    console.log(`[server] CCC ready on http://${hostname}:${port}`);
  });
});
