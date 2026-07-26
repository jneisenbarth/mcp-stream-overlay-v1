import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function mcpStateRelay() {
  let latestState = null;
  const clients = new Set();

  function broadcast(state) {
    latestState = state;
    const payload = `data: ${JSON.stringify(state)}\n\n`;
    for (const response of clients) response.write(payload);
  }

  return {
    name: "mcp-state-relay",
    configureServer(server) {
      server.middlewares.use("/mcp-events", (req, res) => {
        if (req.method !== "GET") {
          res.statusCode = 405;
          return res.end();
        }

        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive"
        });

        res.write(": connected\n\n");
        clients.add(res);

        if (latestState) {
          res.write(`data: ${JSON.stringify(latestState)}\n\n`);
        }

        const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15000);

        req.on("close", () => {
          clearInterval(heartbeat);
          clients.delete(res);
        });
      });

      server.middlewares.use("/mcp-state", (req, res) => {
        if (req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify(latestState ?? {}));
        }

        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end();
        }

        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
          try {
            const state = JSON.parse(body);
            broadcast(state);
            res.statusCode = 204;
            res.end();
          } catch {
            res.statusCode = 400;
            res.end("Invalid JSON");
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), mcpStateRelay()]
});
