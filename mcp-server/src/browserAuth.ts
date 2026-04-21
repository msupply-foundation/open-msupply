import http from 'http';
import { spawn } from 'child_process';

const CONFIG_PORT = 39101;

export interface BrowserAuthResult {
  url: string;
  username: string;
  password: string;
  mode?: string;
}

export interface BrowserAuthOptions {
  envOverrides: Partial<BrowserAuthResult>;
  timeoutMs?: number;
}

function openUrlInBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';
  const args = process.platform === 'win32' ? ['""', url] : [url];
  try {
    spawn(cmd, args, {
      shell: process.platform === 'win32',
      detached: true,
      stdio: 'ignore',
    }).unref();
  } catch (err) {
    console.error(`[open-msupply-mcp] Could not open browser automatically: ${err}`);
    console.error(`[open-msupply-mcp] Please open ${url} manually.`);
  }
}

const AUTH_TOKEN_QUERY = `query authToken($username: String!, $password: String!) {
  authToken(password: $password, username: $username) {
    ... on AuthTokenError { __typename error { description } }
    ... on AuthToken { __typename token }
  }
}`;

interface TestConnectionResult {
  ok: boolean;
  error?: string;
}

async function testConnection(
  url: string,
  username: string,
  password: string
): Promise<TestConnectionResult> {
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: AUTH_TOKEN_QUERY,
        variables: { username, password },
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `Server returned HTTP ${res.status}` };
    }
    const body = (await res.json()) as {
      data?: {
        authToken?:
          | { __typename: 'AuthToken'; token: string }
          | { __typename: 'AuthTokenError'; error: { description: string } };
      };
      errors?: Array<{ message: string }>;
    };
    if (body.errors?.length) {
      return { ok: false, error: body.errors.map((e) => e.message).join('; ') };
    }
    const token = body.data?.authToken;
    if (!token) return { ok: false, error: 'Empty authToken response' };
    if (token.__typename === 'AuthTokenError') {
      return { ok: false, error: token.error.description || 'Authentication failed' };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Could not reach server: ${msg}` };
  }
}

function renderHtml(envOverrides: Partial<BrowserAuthResult>): string {
  const overridesJson = JSON.stringify(envOverrides);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Open mSupply MCP — Connect</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { font-size: 1.25rem; margin-bottom: 0.25rem; }
    p.sub { color: #666; margin-top: 0; margin-bottom: 1.5rem; font-size: 0.9rem; }
    label { display: block; font-size: 0.85rem; font-weight: 500; margin-top: 1rem; }
    input, select { width: 100%; padding: 0.5rem; margin-top: 0.25rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; box-sizing: border-box; }
    input:disabled { background: #f4f4f4; color: #666; }
    button { margin-top: 1.5rem; width: 100%; padding: 0.6rem; background: #1a73e8; color: white; border: 0; border-radius: 4px; font-size: 1rem; cursor: pointer; }
    button:disabled { background: #999; cursor: not-allowed; }
    .hint { color: #888; font-size: 0.75rem; margin-top: 0.25rem; }
    .done { text-align: center; padding: 3rem 1rem; }
    .err { margin-top: 1rem; padding: 0.75rem; background: #fdecea; color: #c1362b; border: 1px solid #f5c2be; border-radius: 4px; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div id="app">
    <h1>Open mSupply MCP</h1>
    <p class="sub">Configure the connection the MCP server will use for this session.</p>
    <form id="f">
      <label>Server URL
        <input name="url" placeholder="http://localhost:8000" required>
      </label>
      <label>Username
        <input name="username" required>
      </label>
      <label>Password
        <input name="password" type="password" required>
      </label>
      <label>Permission mode
        <select name="mode">
          <option value="">(use env vars / defaults)</option>
          <option value="read-only">Read-only (queries, no mutations)</option>
          <option value="read-write">Read/write (all mutations)</option>
          <option value="safe-mutations">Safe mutations (no deletes)</option>
        </select>
        <div class="hint">Controls which tools the MCP exposes to the model.</div>
      </label>
      <button type="submit" id="submitBtn">Connect</button>
      <div id="err" class="err" style="display:none"></div>
    </form>
  </div>
  <script>
    const envOverrides = ${overridesJson};
    const form = document.getElementById('f');
    const submitBtn = document.getElementById('submitBtn');
    const errEl = document.getElementById('err');
    const saved = JSON.parse(localStorage.getItem('omsupplyMcpConfig') || '{}');
    for (const [k, v] of Object.entries(saved)) {
      if (form.elements[k]) form.elements[k].value = v;
    }
    for (const [k, v] of Object.entries(envOverrides)) {
      if (form.elements[k] && v) {
        form.elements[k].value = v;
        form.elements[k].disabled = true;
        form.elements[k].title = 'Set via environment variable';
      }
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Testing connection…';
      const fd = new FormData(form);
      const data = {};
      for (const [k, v] of fd.entries()) {
        if (typeof v === 'string' && v !== '') data[k] = v;
      }
      const toSave = { ...data };
      for (const k of Object.keys(envOverrides)) delete toSave[k];
      localStorage.setItem('omsupplyMcpConfig', JSON.stringify(toSave));
      try {
        const res = await fetch('/connect', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data),
        });
        const body = await res.json().catch(() => ({ ok: false, error: 'Unexpected server response' }));
        if (!res.ok || !body.ok) {
          throw new Error(body.error || 'Connection failed');
        }
        document.getElementById('app').innerHTML = '<div class="done"><h1>Connected</h1><p>You can close this tab.</p></div>';
        setTimeout(() => window.close(), 200);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Connect';
      }
    });
  </script>
</body>
</html>`;
}

export async function runBrowserAuthFlow(
  options: BrowserAuthOptions
): Promise<BrowserAuthResult> {
  const { envOverrides, timeoutMs = 5 * 60 * 1000 } = options;
  const html = renderHtml(envOverrides);

  let server: http.Server | null = null;

  const resultPromise = new Promise<BrowserAuthResult>((resolve, reject) => {
    const s = http.createServer((req, res) => {
      if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
      if (req.method === 'POST' && req.url === '/connect') {
        let body = '';
        req.on('data', (chunk: unknown) => (body += String(chunk)));
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body) as BrowserAuthResult;
            const merged: BrowserAuthResult = {
              url: envOverrides.url ?? parsed.url,
              username: envOverrides.username ?? parsed.username,
              password: envOverrides.password ?? parsed.password,
              mode: envOverrides.mode ?? parsed.mode,
            };
            if (!merged.url || !merged.username || !merged.password) {
              res.writeHead(400, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'url, username, and password are all required' }));
              return;
            }
            const test = await testConnection(
              merged.url,
              merged.username,
              merged.password
            );
            if (!test.ok) {
              res.writeHead(400, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: test.error }));
              return;
            }
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
            resolve(merged);
            setTimeout(() => s.close(), 500);
          } catch (err) {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: `Invalid request: ${err}` }));
          }
        });
        return;
      }
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
    });

    s.once('error', (err: Error) => reject(err));

    s.listen(CONFIG_PORT, '127.0.0.1', () => {
      server = s;
      const url = `http://localhost:${CONFIG_PORT}`;
      console.error(`[open-msupply-mcp] Waiting for configuration at ${url}`);
      openUrlInBrowser(url);
    });
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => {
      if (server) server.close();
      reject(
        new Error(
          `Browser auth flow timed out after ${Math.round(timeoutMs / 1000)}s. ` +
            `Open http://localhost:${CONFIG_PORT} to configure, or set OMSUPPLY_URL / OMSUPPLY_USERNAME / OMSUPPLY_PASSWORD env vars.`
        )
      );
    }, timeoutMs)
  );

  return Promise.race([resultPromise, timeoutPromise]);
}
