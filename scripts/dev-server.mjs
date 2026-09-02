#!/usr/bin/env node
// Lightweight local dev server for the Mapica public site.
//
// Serves the static assets in `public/` and runs the real Vercel-style Node
// handlers in `api/*.js`, applying the rewrite rules from `vercel.json`. It has
// no third-party dependencies so it works anywhere Node 18+ is available.
//
// Usage: node scripts/dev-server.mjs   (honours PORT, defaults to 3000)

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const publicDir = join(root, 'public');

const PORT = Number(process.env.PORT || 3000);

// Load and normalise a Vercel-style handler (default export or module.exports).
function loadHandler(relPath) {
  const mod = require(join(root, relPath));
  return typeof mod === 'function' ? mod : mod.default;
}

const handlers = {
  route: loadHandler('api/route.js'),
  storefront: loadHandler('api/storefront.js'),
  'staff-local': loadHandler('api/staff-local.js'),
  follow: loadHandler('api/follow.js'),
};

// Rewrites mirror vercel.json. Each entry maps a request path to a static file
// or an api handler with derived query params.
const REWRITES = [
  { re: /^\/route\/([^/]+)\/?$/, api: 'route', query: (m) => ({ slug: m[1] }) },
  { re: /^\/@([^/]+)\/([^/]+)\/?$/, api: 'route', query: (m) => ({ slug: m[2] }) },
  { re: /^\/local\/?$/, file: 'creators.html' },
  { re: /^\/local\/apply\/?$/, file: 'open-app.html' },
  { re: /^\/staff\/local\/?$/, api: 'staff-local', query: () => ({}) },
  { re: /^\/privacy\/?$/, file: 'privacy.html' },
  { re: /^\/terms\/?$/, file: 'terms.html' },
  { re: /^\/contact\/?$/, file: 'contact.html' },
];

// Catch-all single segment -> storefront (creator) page, matched last.
const STOREFRONT_RE = /^\/([a-z0-9][a-z0-9-]*)\/?$/i;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

async function tryServeStatic(res, relFile) {
  const safe = normalize(relFile).replace(/^(\.\.[/\\])+/, '');
  const abs = join(publicDir, safe);
  if (!abs.startsWith(publicDir)) return false;
  try {
    const info = await stat(abs);
    const target = info.isDirectory() ? join(abs, 'index.html') : abs;
    const body = await readFile(target);
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[extname(target)] || 'application/octet-stream');
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

// Adapt Node's req/res to the small Vercel handler contract the api files use.
function makeVercelReq(req, query, body) {
  return {
    method: req.method,
    headers: req.headers,
    url: req.url,
    query,
    body,
  };
}

function makeVercelRes(res) {
  const wrapper = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      res.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    json(obj) {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.statusCode = this.statusCode;
      res.end(JSON.stringify(obj));
      return this;
    },
    send(body) {
      res.statusCode = this.statusCode;
      res.end(body == null ? '' : typeof body === 'string' || Buffer.isBuffer(body) ? body : String(body));
      return this;
    },
    end(body) {
      res.statusCode = this.statusCode;
      res.end(body);
      return this;
    },
  };
  return wrapper;
}

function readBody(req) {
  return new Promise((resolveBody) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolveBody(undefined);
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try {
          return resolveBody(JSON.parse(raw));
        } catch {
          return resolveBody(raw);
        }
      }
      resolveBody(raw);
    });
    req.on('error', () => resolveBody(undefined));
  });
}

async function runHandler(name, req, res, query) {
  const handler = handlers[name];
  const body = req.method === 'POST' ? await readBody(req) : undefined;
  const vReq = makeVercelReq(req, query, body);
  const vRes = makeVercelRes(res);
  try {
    await handler(vReq, vRes);
  } catch (err) {
    console.error(`handler ${name} threw`, err);
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.end('Internal error');
    }
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  const queryFromUrl = Object.fromEntries(url.searchParams.entries());

  console.log(`${req.method} ${pathname}`);

  // Direct api calls (used by client fetches, e.g. /api/follow).
  const apiMatch = pathname.match(/^\/api\/([a-z-]+)\/?$/i);
  if (apiMatch && handlers[apiMatch[1]]) {
    return runHandler(apiMatch[1], req, res, queryFromUrl);
  }

  // Root -> index.html
  if (pathname === '/' ) {
    if (await tryServeStatic(res, 'index.html')) return;
  }

  // Rewrites from vercel.json
  for (const rule of REWRITES) {
    const m = pathname.match(rule.re);
    if (!m) continue;
    if (rule.file) {
      if (await tryServeStatic(res, rule.file)) return;
    } else if (rule.api) {
      return runHandler(rule.api, req, res, { ...queryFromUrl, ...rule.query(m) });
    }
  }

  // Existing static asset (styles, images, .well-known, html, etc.)
  if (await tryServeStatic(res, pathname.replace(/^\//, ''))) return;

  // Catch-all single segment -> storefront (creator) page
  const sf = pathname.match(STOREFRONT_RE);
  if (sf && req.method !== 'POST') {
    return runHandler('storefront', req, res, { ...queryFromUrl, slug: sf[1] });
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Mapica dev server listening on http://localhost:${PORT}`);
  console.log(`Static root: ${publicDir}`);
  if (!process.env.SUPABASE_ANON_KEY) {
    console.log('Note: SUPABASE_ANON_KEY is not set — dynamic route/creator pages will return an error until it is configured.');
  }
});
