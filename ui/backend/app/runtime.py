"""Bounded local runs, paired sessions, subprocess events, and cancellation."""
import asyncio
from copy import deepcopy
from dataclasses import dataclass, field
import json
import os
from pathlib import Path
import signal
import sys
import time
from uuid import uuid4

from .paths import REPO_ROOT as ROOT, BACKEND_ROOT


def target_sides(target):
    if target == "both":
        return ("baseline", "checkpoint")
    if target in {"baseline", "checkpoint"}:
        return (target,)
    raise ValueError("Unknown model target")


def worker_environment(home, sandbox):
    # Do not inherit unrelated provider credentials, proxy settings, or personal Hermes state.
    allowed = ("PATH", "LANG", "LC_ALL", "SSL_CERT_FILE", "SSL_CERT_DIR")
    env = {k: os.environ[k] for k in allowed if k in os.environ}
    env.update(HOME=str(home), HERMES_HOME=str(home), PYTHONNOUSERSITE="1", PYTHONUNBUFFERED="1",
               PYTHONPATH=os.pathsep.join([str(BACKEND_ROOT / "vendor/hermes_agent_runtime"), str(BACKEND_ROOT / "vendor"), str(ROOT)]),
               HEALTH_SANDBOX_SESSION_DIR=str(sandbox))
    return env


@dataclass
class Lane:
    history: list = field(default_factory=list)
    status: str = "ready"
    process: object = None
    turn: int = 0


class Comparison:
    def __init__(self, case, endpoints, directory, python, timeout=900):
        self.id = uuid4().hex
        self.case = deepcopy(case)
        self.endpoints = deepcopy(endpoints)
        self.directory = Path(directory) / self.id
        self.directory.mkdir(parents=True, mode=0o700)
        self.python, self.timeout = python, timeout
        self.lanes = {side: Lane() for side in endpoints}
        self.events = []
        self.condition = asyncio.Condition()
        self.turn = 0
        self.busy = False
        self.task = None
        self.created = time.monotonic()

    async def publish(self, kind, **values):
        async with self.condition:
            self.events.append(dict(id=len(self.events) + 1, type=kind, turn=self.turn, **values))
            self.condition.notify_all()

    def start(self, prompt, target="both", restart=False):
        if self.busy:
            raise ValueError("A turn is already running")
        sides = target_sides(target)
        for side in sides:
            lane = self.lanes[side]
            if not restart and lane.turn >= 20:
                raise ValueError("Run this model again to start a fresh conversation after 20 turns")
            if not restart and lane.turn and lane.status != "complete":
                raise ValueError("Run this model again after an error or cancellation")
        self.turn += 1
        self.busy = True
        for side in sides:
            lane = self.lanes[side]
            if restart:
                lane.history = []
                lane.turn = 0
            lane.turn += 1
            lane.status = "pending"
        self.task = asyncio.create_task(self.run(prompt, sides, restart))

    async def run(self, prompt, sides, restart):
        await self.publish("patient", text=prompt, sides=sides, restart=restart)
        try:
            await asyncio.gather(*(self.run_lane(side, prompt) for side in sides))
        finally:
            self.busy = False
            await self.publish("turn_complete", statuses={s: lane.status for s, lane in self.lanes.items()})

    async def run_lane(self, side, prompt):
        lane = self.lanes[side]
        home = self.directory / side / "hermes"
        sandbox = self.directory / side / "sandbox"
        home.mkdir(parents=True, exist_ok=True, mode=0o700)
        sandbox.mkdir(parents=True, exist_ok=True, mode=0o700)
        message = dict(endpoint=self.endpoints[side].worker(), case=self.case["case"],
                       system_prompt=self.case["system_prompt"], history=lane.history,
                       prompt=prompt, turn=lane.turn, session_id=self.id + "_" + side)
        lane.status = "starting"
        await self.publish("status", side=side, status="starting")
        try:
            async with asyncio.timeout(self.timeout):
                process = await asyncio.create_subprocess_exec(
                    self.python, "-m", "ui.backend.app.worker", cwd=ROOT, env=worker_environment(home, sandbox),
                    stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.DEVNULL, start_new_session=True, limit=8 * 1024 * 1024)
                lane.process = process
                process.stdin.write(json.dumps(message).encode())
                await process.stdin.drain()
                process.stdin.close()
                terminal = False
                async for line in process.stdout:
                    event = json.loads(line)
                    kind = event.pop("type")
                    if terminal:
                        raise ValueError("Worker emitted events after completion")
                    if kind == "complete":
                        lane.history = event.pop("_history")
                        lane.status = "complete"
                        terminal = True
                    elif kind == "error":
                        lane.status = "error"
                        terminal = True
                    elif kind == "status":
                        lane.status = event["status"]
                    elif kind not in {"tool_start", "tool_complete", "reply_delta", "reply_reset"}:
                        raise ValueError("Unknown worker event")
                    await self.publish(kind, side=side, **event)
                code = await process.wait()
                if code != 0 or not terminal:
                    raise RuntimeError("Worker exited without a completed response")
        except asyncio.CancelledError:
            lane.status = "cancelled"
            await self.publish("cancelled", side=side)
            raise
        except TimeoutError:
            lane.status = "error"
            await self.publish("error", side=side, message="Request timed out. Start a new comparison to retry.")
        except Exception:
            lane.status = "error"
            await self.publish("error", side=side, message="The Hermes worker stopped unexpectedly. Check the configured interpreter and endpoint.")
        finally:
            if lane.process and lane.process.returncode is None:
                try:
                    os.killpg(lane.process.pid, signal.SIGTERM)
                    await asyncio.wait_for(lane.process.wait(), timeout=3)
                except (ProcessLookupError, TimeoutError):
                    if lane.process.returncode is None:
                        try:
                            os.killpg(lane.process.pid, signal.SIGKILL)
                        except ProcessLookupError:
                            pass
                        await lane.process.wait()
            lane.process = None

    async def cancel(self):
        if self.task and not self.task.done():
            self.task.cancel()
            await asyncio.gather(self.task, return_exceptions=True)

    async def stream(self, after=0):
        cursor = after
        while True:
            async with self.condition:
                if cursor >= len(self.events) and self.busy:
                    try:
                        await asyncio.wait_for(self.condition.wait(), timeout=10)
                    except TimeoutError:
                        pass
                pending = self.events[cursor:]
                done = not self.busy
            for event in pending:
                yield "id: " + str(event["id"]) + "\ndata: " + json.dumps(event) + "\n\n"
                cursor = event["id"]
            if done:
                return
            if not pending:
                yield ": heartbeat\n\n"
