import { getCodingIssueCatalog } from "@/lib/github-coding-issues";

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    if (originUrl.origin === requestUrl.origin) return true;

    return requestUrl.protocol === "http:" &&
      originUrl.protocol === "http:" &&
      requestUrl.port === originUrl.port &&
      isLoopbackHostname(requestUrl.hostname) &&
      isLoopbackHostname(originUrl.hostname);
  } catch {
    return false;
  }
}

function responseHeaders(request: Request): Headers {
  const headers = new Headers({
    "cache-control": "no-store, max-age=0",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  const origin = request.headers.get("origin");
  if (origin) headers.set("vary", "Origin");
  if (origin && isAllowedOrigin(request)) {
    headers.set("access-control-allow-origin", origin);
  }
  return headers;
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(request),
  });
}

export async function GET(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return json(request, { error: "Browser origin is not allowed." }, 403);
  }

  const catalog = await getCodingIssueCatalog({
    token: process.env.NEMOTRON_DASHBOARD_GITHUB_API_TOKEN,
  });
  return json(request, catalog);
}

export async function OPTIONS(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return json(request, { error: "Browser origin is not allowed." }, 403);
  }

  const headers = responseHeaders(request);
  headers.delete("content-type");
  headers.set("access-control-allow-methods", "GET, OPTIONS");
  headers.set("access-control-max-age", "86400");
  return new Response(null, { status: 204, headers });
}
