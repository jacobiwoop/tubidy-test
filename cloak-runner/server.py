#!/usr/bin/env python3
"""HTTP service for running CloakBrowser jobs inside Docker.

The service is intended to be bound to 127.0.0.1 on the host or protected by a
reverse proxy. The normal API exposes fixed jobs; /run remains a debug escape
hatch for sending a Python script explicitly.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


HOST = os.environ.get("RUNNER_HOST", "0.0.0.0")
PORT = int(os.environ.get("RUNNER_PORT", "8765"))
MAX_BODY_BYTES = int(os.environ.get("RUNNER_MAX_BODY_BYTES", str(512 * 1024)))
MAX_TIMEOUT_SECONDS = int(os.environ.get("RUNNER_MAX_TIMEOUT_SECONDS", "300"))
RUNNER_TOKEN = os.environ.get("RUNNER_TOKEN", "")
ENABLE_DEBUG_RUN = os.environ.get("ENABLE_DEBUG_RUN", "").lower() in {"1", "true", "yes"}
BASE_DIR = Path(__file__).resolve().parent
CHOSIC_FOCUS_SCRIPT = BASE_DIR / "scripts" / "chosic_focus_cookie.py"


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def is_authorized(handler: BaseHTTPRequestHandler) -> bool:
    if not RUNNER_TOKEN:
        return True
    return handler.headers.get("Authorization") == f"Bearer {RUNNER_TOKEN}"


def read_json_body(handler: BaseHTTPRequestHandler, required: bool = True) -> tuple[dict | None, str | None]:
    try:
        length = int(handler.headers.get("Content-Length", "0"))
    except ValueError:
        return None, "invalid_content_length"

    if length == 0 and not required:
        return {}, None

    if length <= 0 or length > MAX_BODY_BYTES:
        return None, "invalid_body_size"

    try:
        body = handler.rfile.read(length)
        payload = json.loads(body.decode("utf-8"))
    except Exception:
        return None, "invalid_json"

    if not isinstance(payload, dict):
        return None, "invalid_json"

    return payload, None


def get_timeout(payload: dict | None, default: int = 120) -> tuple[int | None, str | None]:
    payload = payload or {}
    timeout = payload.get("timeout", default)
    try:
        return max(1, min(int(timeout), MAX_TIMEOUT_SECONDS)), None
    except (TypeError, ValueError):
        return None, "invalid_timeout"


def execute_python(script_path: Path, timeout: int, work_dir: Path | None = None) -> dict:
    job_id = uuid.uuid4().hex
    job_dir = Path(tempfile.mkdtemp(prefix=f"cloak-job-{job_id}-"))
    cwd = work_dir or job_dir

    started = time.time()
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    env["CLOAK_JOB_ID"] = job_id
    env["CLOAK_OUTPUT_DIR"] = str(job_dir)

    timed_out = False
    try:
        completed = subprocess.run(
            ["python", str(script_path)],
            cwd=str(cwd),
            env=env,
            text=True,
            capture_output=True,
            timeout=timeout,
        )
        exit_code = completed.returncode
        stdout = completed.stdout
        stderr = completed.stderr
    except subprocess.TimeoutExpired as exc:
        timed_out = True
        exit_code = 124
        stdout = exc.stdout or ""
        stderr = exc.stderr or ""
        stderr += f"\nTimed out after {timeout}s"
    except Exception as exc:
        exit_code = 1
        stdout = ""
        stderr = str(exc)

    artifacts = []
    for path in job_dir.iterdir():
        if not path.is_file():
            continue
        artifacts.append({"name": path.name, "size": path.stat().st_size})

    response = {
        "ok": exit_code == 0,
        "job_id": job_id,
        "exit_code": exit_code,
        "timed_out": timed_out,
        "duration_ms": int((time.time() - started) * 1000),
        "stdout": stdout,
        "stderr": stderr,
        "artifacts": artifacts,
    }

    shutil.rmtree(job_dir, ignore_errors=True)
    return response


def execute_script_text(script: str, timeout: int) -> dict:
    job_dir = Path(tempfile.mkdtemp(prefix="cloak-script-"))
    script_path = job_dir / "job.py"
    script_path.write_text(script, encoding="utf-8")
    try:
        return execute_python(script_path, timeout, work_dir=job_dir)
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


def parse_stdout_json(stdout: str) -> dict | None:
    for line in reversed(stdout.splitlines()):
        line = line.strip()
        if not line:
            continue
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed
    return None


class RunnerHandler(BaseHTTPRequestHandler):
    server_version = "CloakRunner/1.0"

    def do_GET(self) -> None:
        if self.path == "/health":
            json_response(self, 200, {"ok": True, "service": "cloak-runner"})
            return
        json_response(self, 404, {"ok": False, "error": "not_found"})

    def do_POST(self) -> None:
        if not is_authorized(self):
            json_response(self, 401, {"ok": False, "error": "unauthorized"})
            return

        if self.path == "/chosic/focus-cookie":
            self.handle_chosic_focus_cookie()
            return

        if self.path == "/run":
            if not ENABLE_DEBUG_RUN:
                json_response(self, 404, {"ok": False, "error": "debug_run_disabled"})
                return
            self.handle_run()
            return

        json_response(self, 404, {"ok": False, "error": "not_found"})

    def handle_run(self) -> None:
        payload, error = read_json_body(self)
        if error:
            status = 413 if error == "invalid_body_size" else 400
            json_response(self, status, {"ok": False, "error": error})
            return

        script = payload.get("script")
        if not isinstance(script, str) or not script.strip():
            json_response(self, 400, {"ok": False, "error": "missing_script"})
            return

        timeout, error = get_timeout(payload)
        if error:
            json_response(self, 400, {"ok": False, "error": error})
            return

        response = execute_script_text(script, timeout)
        json_response(self, 200 if response["ok"] else 500, response)

    def handle_chosic_focus_cookie(self) -> None:
        payload, error = read_json_body(self, required=False)
        if error:
            status = 413 if error == "invalid_body_size" else 400
            json_response(self, status, {"ok": False, "error": error})
            return

        timeout, error = get_timeout(payload, default=180)
        if error:
            json_response(self, 400, {"ok": False, "error": error})
            return

        response = execute_python(CHOSIC_FOCUS_SCRIPT, timeout, work_dir=BASE_DIR)
        result = parse_stdout_json(response["stdout"])
        payload = {
            "ok": response["ok"] and bool(result and result.get("ok")),
            "job_id": response["job_id"],
            "exit_code": response["exit_code"],
            "timed_out": response["timed_out"],
            "duration_ms": response["duration_ms"],
            "result": result,
            "stderr": response["stderr"],
        }
        if not result:
            payload["stdout"] = response["stdout"]

        json_response(self, 200 if payload["ok"] else 500, payload)

    def log_message(self, fmt: str, *args) -> None:
        print(f"{self.address_string()} - {fmt % args}", flush=True)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), RunnerHandler)
    print(f"cloak-runner listening on {HOST}:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
