import type { Plugin, ViteDevServer } from "vite";
import { getRequestListener } from "@hono/node-server";

export function apiDevPlugin(): Plugin {
  return {
    name: "flashmail-api-dev",
    enforce: "pre",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api", (req, res) => {
        void (async () => {
          const mod = await server.ssrLoadModule("./src/server/api.ts");
          const apiApp = mod.apiApp as {
            fetch: (request: Request) => Response | Promise<Response>;
          };
          getRequestListener(apiApp.fetch)(req, res);
        })();
      });
    },
  };
}
