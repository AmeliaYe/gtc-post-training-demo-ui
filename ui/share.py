"""Private-network sharing gateway; the inference service remains on loopback."""
from contextlib import asynccontextmanager
import hmac
from ipaddress import ip_address
import os
import re

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, StreamingResponse
import httpx
from starlette.background import BackgroundTask

COOKIE = "healthcare_demo_share"
GET_PATHS = re.compile(
    r"(?:|assets/(?:app\.js|styles\.css|icons\.js)|api/settings|api/cases|"
    r"api/cases/[A-Za-z0-9_-]+/recorded|api/comparisons/[0-9a-f]{32}/events)"
)
POST_PATHS = re.compile(r"api/comparisons(?:/[0-9a-f]{32}/(?:turns|cancel))?")


def create_share_app(*, token, origin, upstream="http://127.0.0.1:4193", transport=None):
    if not re.fullmatch(r"[A-Za-z0-9_-]{32,128}", token):
        raise ValueError("A randomly generated share token is required")
    expected_host = httpx.URL(origin).netloc.decode()

    @asynccontextmanager
    async def lifespan(app):
        async with httpx.AsyncClient(base_url=upstream, transport=transport,
                                     trust_env=False, follow_redirects=False,
                                     timeout=httpx.Timeout(30, read=1000)) as client:
            app.state.client = client
            yield

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

    def matches(value):
        return hmac.compare_digest(value.encode(), token.encode())

    @app.middleware("http")
    async def boundary(request: Request, call_next):
        if (request.headers.get("host") != expected_host
                or request.headers.get("origin", origin) != origin):
            return JSONResponse({"detail": "Same-origin access required"}, status_code=403)
        response = await call_next(request)
        response.headers.update({
            "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
        })
        return response

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
    async def proxy(path: str, request: Request):
        linked = path.startswith("share/")
        if linked:
            credential, separator, path = path[len("share/"):].partition("/")
            if not matches(credential):
                return JSONResponse({"detail": "Invalid sharing link"}, status_code=403)
            if not separator:
                if request.method != "GET":
                    return JSONResponse({"detail": "Not found"}, status_code=404)
                # Keep the capability in the address bar. Relative assets, API
                # requests and EventSource URLs authenticate through this prefix;
                # no redirect-to-root cookie handoff is needed.
                return RedirectResponse("/share/" + token + "/", status_code=307)
        if not linked and not matches(request.cookies.get(COOKIE, "")):
            if request.method == "GET" and not path:
                return HTMLResponse(
                    '<!doctype html><html lang="en"><head><meta charset="utf-8">'
                    '<meta name="viewport" content="width=device-width,initial-scale=1">'
                    '<title>Open the complete demo link</title></head><body><main>'
                    '<h1>Open the complete demo link</h1>'
                    '<p>This address is reachable, but it does not include access to the demo.</p>'
                    '<p>Use the full link from the sender, including <code>/share/...</code>. '
                    'The full link works without browser cookies.</p></main></body></html>',
                    status_code=403)
            return JSONResponse({"detail": "Open the demo using its sharing link"}, status_code=403)
        if path == "api/settings" and request.method != "GET":
            return JSONResponse({"detail": "Connection settings are managed by the demo owner"}, status_code=403)
        if not ((request.method == "GET" and GET_PATHS.fullmatch(path))
                or (request.method == "POST" and POST_PATHS.fullmatch(path))):
            return JSONResponse({"detail": "Not found"}, status_code=404)

        body = b""
        if request.method == "POST":
            if request.headers.get("sec-fetch-site") == "cross-site":
                return JSONResponse({"detail": "Same-origin access required"}, status_code=403)
            if request.headers.get("content-type", "").split(";")[0] != "application/json":
                return JSONResponse({"detail": "JSON required"}, status_code=415)
            async for chunk in request.stream():
                body += chunk
                if len(body) > 65536:
                    return JSONResponse({"detail": "Request too large"}, status_code=413)
        headers = {"Accept": request.headers.get("accept", "*/*")}
        if request.method == "POST":
            headers["Content-Type"] = "application/json"
        if "last-event-id" in request.headers:
            headers["Last-Event-ID"] = request.headers["last-event-id"]
        try:
            upstream_request = app.state.client.build_request(
                request.method, "/" + path, params=request.query_params,
                headers=headers, content=body)
            response = await app.state.client.send(upstream_request, stream=True)
            if path == "api/settings" and response.status_code == 200:
                try:
                    await response.aread()
                    settings = response.json()
                    settings["shared_access"] = True
                    return JSONResponse(settings)
                finally:
                    await response.aclose()
            return StreamingResponse(
                response.aiter_bytes(), status_code=response.status_code,
                headers={"Content-Type": response.headers.get("content-type", "application/octet-stream"),
                         "X-Accel-Buffering": "no"},
                background=BackgroundTask(response.aclose))
        except httpx.HTTPError:
            return JSONResponse({"detail": "The demo service is temporarily unavailable"}, status_code=502)

    return app


if __name__ == "__main__":
    import uvicorn
    host = os.environ["DEMO_SHARE_HOST"]
    address = ip_address(host)
    if not address.is_private or address.is_unspecified:
        raise ValueError("Bind the sharing gateway to a specific private network address")
    port = int(os.getenv("DEMO_SHARE_PORT", "4195"))
    app = create_share_app(token=os.environ["DEMO_SHARE_TOKEN"], origin=f"http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, access_log=False)
