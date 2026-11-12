"""Optional Respan tracing for the floor-plan pipeline.

Tracing turns on only when RESPAN_API_KEY is set, so the engine keeps running
without a key (or without respan-ai installed) and makes no new outbound calls.
"""
import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass

RESPAN_API_KEY = (os.getenv("RESPAN_API_KEY") or "").strip()

_respan = None
_workflow = None
_task = None

if RESPAN_API_KEY:
    try:
        from respan import Respan, task as respan_task, workflow as respan_workflow

        # Initialize once, before the pipeline decorators below are applied.
        _respan = Respan(api_key=RESPAN_API_KEY, app_name="2builders")
        _workflow = respan_workflow
        _task = respan_task
    except Exception as e:
        print(f"Respan tracing disabled: {e}")


def trace_workflow(name: str):
    """Root trace span for one pipeline run; falls back to the plain function."""
    def decorator(fn):
        return _workflow(name=name)(fn) if _workflow is not None else fn
    return decorator


def trace_task(name: str):
    """Child span for one pipeline step; falls back to the plain function."""
    def decorator(fn):
        return _task(name=name)(fn) if _task is not None else fn
    return decorator
