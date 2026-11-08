"""Inject Unsplash access from ignored local config. Never log key values."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOWED = {'unsplash_access_key'}
KEY_PATTERN = re.compile(r'^[A-Za-z0-9_-]{16,80}$')


def unsplash_access_key(root=ROOT):
    """Return a validated access key, or an empty string when unavailable."""
    path = root / '.local/unsplash.json'
    if not path.is_file():
        return ''
    try:
        config = json.loads(path.read_text())
    except (ValueError, OSError):
        return ''
    if not isinstance(config, dict) or set(config) - ALLOWED:
        return ''
    key = config.get('unsplash_access_key')
    if not isinstance(key, str) or not KEY_PATTERN.fullmatch(key):
        return ''
    return key


def runtime_overlay(root=ROOT, include_key=True):
    """Generate the runtime config script. The key is never written into app/."""
    payload = {'unsplashAccessKey': unsplash_access_key(root) if include_key else ''}
    return {'assets/runtime-config.js': ('window.CleanFrameRuntime=' + json.dumps(payload, separators=(',', ':')) + ';\n').encode()}
