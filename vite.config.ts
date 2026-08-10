/// <reference types="vitest" />
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

type LocalFunctionHandler = (
  request: Request,
  context: Record<string, never>
) => Response | Promise<Response>;

interface LocalFunctionModule {
  default?: LocalFunctionHandler;
}

function netlifyFunctionsPlugin(): Plugin {
  const functionPathMap: Record<string, string> = {
    '/api/admin/roles': 'admin-roles',
    '/api/admin/roles/assign': 'admin-role-assign',
    '/api/privacy/consent': 'consent',
    '/api/auth/register': 'auth-register',
    '/api/admin/participants': 'admin-participants',
    '/api/auth/me': 'me',
  };

  return {
    name: 'netlify-functions-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        try {
          const fullUrl = new URL(req.url, `http://${req.headers.host || 'localhost:5173'}`);
          const pathParts = fullUrl.pathname.split('/').filter(Boolean);
          const resource = functionPathMap[fullUrl.pathname] || pathParts[1];

          if (!resource) {
            return next();
          }

          const modulePath = `./netlify/functions/${resource}.ts`;
          let funcModule: LocalFunctionModule;
          try {
            funcModule = await server.ssrLoadModule(modulePath) as LocalFunctionModule;
          } catch (loadErr) {
            console.error(`[NetlifyDev] Could not load handler for ${resource}:`, loadErr);
            return next();
          }

          const handler = funcModule.default;
          if (typeof handler !== 'function') {
            return next();
          }

          const headers = new Headers();
          for (const [key, val] of Object.entries(req.headers)) {
            if (val) {
              if (Array.isArray(val)) {
                val.forEach((v) => headers.append(key, v));
              } else {
                headers.set(key, val);
              }
            }
          }

          let body: Uint8Array[] | null = null;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const chunks: Uint8Array[] = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            body = chunks;
          }

          const webRequest = new Request(fullUrl.toString(), {
            method: req.method,
            headers,
            body: body && body.length > 0 ? Buffer.concat(body) : null,
          });

          const webResponse = await handler(webRequest, {});

          if (webResponse && webResponse instanceof Response) {
            res.statusCode = webResponse.status;

            // Handle set-cookie explicitly to prevent merging multiple cookies into one string
            if (typeof webResponse.headers.getSetCookie === 'function') {
              const cookies = webResponse.headers.getSetCookie();
              if (cookies && cookies.length > 0) {
                res.setHeader('set-cookie', cookies);
              }
            }

            webResponse.headers.forEach((val, key) => {
              if (key.toLowerCase() !== 'set-cookie') {
                res.setHeader(key, val);
              }
            });

            const buffer = await webResponse.arrayBuffer();
            res.end(Buffer.from(buffer));
            return;
          }

          next();
        } catch (error: unknown) {
          console.error('[NetlifyDev Error]', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          const message = error instanceof Error ? error.message : 'Internal Server Error';
          res.end(JSON.stringify({ error: { message } }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [react(), tailwindcss(), netlifyFunctionsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
  };
});
