"""FastAPI app for live and recorded paired healthcare conversations."""
import asyncio
from contextlib import asynccontextmanager
import json
import os
from pathlib import Path
import shutil
import sys
from typing import Literal
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
import httpx
from pydantic import BaseModel, ConfigDict, Field

from ui.backend.app.config import Endpoint, SettingsInput, initial_endpoints
from ui.backend.app.runtime import Comparison, target_sides

from .paths import UI_ROOT, FRONTEND_ROOT


class TurnInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(min_length=1, max_length=12000)
    target: Literal["both", "baseline", "checkpoint"] = "both"


class FollowupInput(TurnInput):
    restart: bool = False


class StartInput(TurnInput):
    case_id: str = Field(max_length=80)


def create_app(data_path=None, python=None, runtime_root=None):
    path = Path(data_path or os.getenv("DEMO_CASES_FILE", UI_ROOT / "data/cases.json"))
    bundle = json.loads(path.read_text()) if path.is_file() else {"cases": [], "cohort_size": 0}
    cases = {c["id"]: c for c in bundle["cases"]}
    allowed_hosts = {h.strip() for h in os.getenv("DEMO_ALLOWED_HOSTS", "localhost,127.0.0.1,::1").split(",") if h.strip()}
    endpoints = initial_endpoints()
    runs = {}
    python = str(python or os.getenv("DEMO_HERMES_PYTHON", sys.executable))
    runtime_root = Path(runtime_root or os.getenv("DEMO_RUNTIME_DIR", UI_ROOT / ".local/runtime"))

    @asynccontextmanager
    async def lifespan(app):
        yield
        await asyncio.gather(*(r.cancel() for r in runs.values()))

    app = FastAPI(title="Nemotron Healthcare Demo", lifespan=lifespan, docs_url=None, redoc_url=None)
    app.state.runs = runs
    app.state.endpoints = endpoints

    @app.middleware("http")
    async def local_boundary(request, call_next):
        host = request.headers.get("host", "")
        try:
            hostname = urlsplit("http://" + host).hostname
        except ValueError:
            hostname = None
        origin = request.headers.get("origin")
        if hostname not in allowed_hosts:
            return JSONResponse({"detail": "Host not allowed"}, status_code=403)
        if (origin and origin != request.url.scheme + "://" + host) or request.headers.get("sec-fetch-site") == "cross-site":
            return JSONResponse({"detail": "Same-origin access required"}, status_code=403)
        if request.method in {"POST", "PUT", "PATCH"}:
            if request.headers.get("content-type", "").split(";")[0] != "application/json":
                return JSONResponse({"detail": "JSON required"}, status_code=415)
            size = request.headers.get("content-length", "0")
            if not size.isdigit() or int(size) > 65536:
                return JSONResponse({"detail": "Request too large"}, status_code=413)
            if len(await request.body()) > 65536:
                return JSONResponse({"detail": "Request too large"}, status_code=413)
        response = await call_next(request)
        response.headers.update({
            "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
        })
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Pydantic's default includes submitted input values, potentially API keys.
        return JSONResponse({"detail": "Invalid request fields", "fields": [".".join(map(str, e["loc"])) for e in exc.errors()]}, status_code=422)

    @app.get("/healthz")
    async def health():
        return JSONResponse({"status": "ready" if cases else "no_cases"}, status_code=200 if cases else 503)

    if os.getenv("DEMO_SERVE_FRONTEND", "1") == "1":
        @app.get("/")
        async def index():
            return FileResponse(FRONTEND_ROOT / "index.html")

        @app.get("/assets/{name}")
        async def assets(name: str):
            if name not in {"app.js", "styles.css", "icons.js"}:
                raise HTTPException(404)
            return FileResponse(FRONTEND_ROOT / "assets" / name)

    @app.get("/api/settings")
    async def settings():
        return dict(endpoints={s: e.public() for s, e in endpoints.items()},
                    runtime=dict(python_available=Path(python).is_file(), max_tokens=32768, context_tokens=65536,
                                 enable_thinking=True, temperature=0, top_p=0.9),
                    cases_ready=bool(cases))

    @app.put("/api/settings")
    async def save_settings(body: SettingsInput):
        if any(r.busy for r in runs.values()):
            raise HTTPException(409, "Wait for or stop the current comparison before changing connections")
        for side in endpoints:
            endpoints[side] = Endpoint.update(getattr(body, side), endpoints[side])
        return await settings()

    @app.post("/api/connections/check")
    async def check_connections():
        async def check(side, endpoint):
            if not endpoint.model:
                return side, dict(ok=False, message="Set the serving model ID")
            headers = {"Authorization": "Bearer " + endpoint.api_key} if endpoint.api_key else {}
            try:
                async with httpx.AsyncClient(timeout=8, follow_redirects=False, trust_env=False) as client:
                    response = await client.get(endpoint.base_url + "/models", headers=headers)
                if response.status_code != 200:
                    return side, dict(ok=False, message=f"Model discovery returned HTTP {response.status_code}")
                models = [r["id"] for r in response.json().get("data", []) if isinstance(r, dict) and isinstance(r.get("id"), str)]
                if endpoint.model not in models:
                    return side, dict(ok=False, message="Endpoint reached, but the configured model ID was not listed", models=models[:50])
                return side, dict(ok=True, message="Endpoint reached and model listed; inference not tested")
            except Exception:
                return side, dict(ok=False, message="Endpoint could not be reached or did not return a valid model list")
        return dict(await asyncio.gather(*(check(s, e) for s, e in endpoints.items())))

    @app.get("/api/cases")
    async def public_cases():
        return dict(cohort_size=bundle["cohort_size"], cases=[{k: c[k] for k in
                    ("id", "label", "icon", "category", "task", "opening")} for c in cases.values()])

    @app.get("/api/cases/{ident}/recorded")
    async def recorded(ident: str):
        if ident not in cases:
            raise HTTPException(404, "Unknown case")
        return dict(recorded=cases[ident]["recorded"], note="Recorded runs have different patient openings. Hosted baseline and local BF16 serving are not proven equivalent.")

    def get_run(ident):
        if ident not in runs:
            raise HTTPException(404, "Comparison not found; create a new one")
        return runs[ident]

    @app.post("/api/comparisons")
    async def start(body: StartInput):
        if body.case_id not in cases:
            raise HTTPException(404, "Unknown case")
        if not body.prompt.strip():
            raise HTTPException(422, "Enter a patient prompt")
        if any(not endpoints[s].model or not endpoints[s].base_url for s in target_sides(body.target)):
            raise HTTPException(409, "Configure the selected endpoint URLs and model IDs in Connections")
        if any(r.busy for r in runs.values()):
            raise HTTPException(409, "A comparison is running; stop it before starting another")
        # Bounded single-user process memory. Old case evidence stays in the original archives.
        while len(runs) >= 20:
            oldest = next(iter(runs))
            prior = runs.pop(oldest)
            shutil.rmtree(prior.directory, ignore_errors=True)
        run = Comparison(cases[body.case_id], endpoints, runtime_root, python,
                         timeout=int(os.getenv("DEMO_TURN_TIMEOUT", "900")))
        runs[run.id] = run
        run.start(body.prompt.strip(), body.target)
        return dict(id=run.id, turn=run.turn)

    @app.post("/api/comparisons/{ident}/turns")
    async def followup(ident: str, body: FollowupInput):
        run = get_run(ident)
        if not body.prompt.strip():
            raise HTTPException(422, "Enter a patient prompt")
        if any(r.busy for r in runs.values()):
            raise HTTPException(409, "Wait for the current turn to finish")
        sides = target_sides(body.target)
        if any(not run.endpoints[s].model or not run.endpoints[s].base_url for s in sides):
            raise HTTPException(409, "Configure the selected model in Connections, then start a new comparison")
        if not body.restart and any(run.lanes[s].turn == 0 for s in sides):
            raise HTTPException(409, "Run each selected model before sending it a follow-up")
        try:
            run.start(body.prompt.strip(), body.target, restart=body.restart)
        except ValueError as error:
            raise HTTPException(409, str(error)) from None
        return dict(id=run.id, turn=run.turn)

    @app.get("/api/comparisons/{ident}/events")
    async def events(ident: str, request: Request, after: int = 0):
        run = get_run(ident)
        try:
            cursor = max(after, int(request.headers.get("last-event-id", "0")))
        except ValueError:
            raise HTTPException(422, "Invalid event cursor") from None
        if cursor < 0 or cursor > len(run.events):
            raise HTTPException(422, "Invalid event cursor")
        return StreamingResponse(run.stream(cursor), media_type="text/event-stream",
                                 headers={"X-Accel-Buffering": "no"})

    @app.post("/api/comparisons/{ident}/cancel")
    async def cancel(ident: str):
        await get_run(ident).cancel()
        return {"cancelled": True}

    return app


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(create_app(), host=os.getenv("DEMO_BIND_HOST", "127.0.0.1"), port=int(os.getenv("DEMO_PORT", "4193")), access_log=False, proxy_headers=False)
