#!/usr/bin/env python3
"""Merge supplied deployment settings without deleting existing OAuth secrets."""
import json
import os
from pathlib import Path
import secrets
from urllib.parse import urlparse

root = Path(__file__).resolve().parent.parent
env_file = root / '.env'
values = {}
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            # Files written by this script use JSON strings (Compose-compatible).
            try:
                parsed = json.loads(value)
                # Environment variables are always strings, even when their
                # value looks numeric (for example INVITE_CODE_MAX_USES=100).
                values[key] = parsed if isinstance(parsed, str) else str(parsed)
            except ValueError:
                values[key] = value.strip().strip("'\"")

previous_url = values.get('APP_URL', '').rstrip('/')
providers = {
    'github': ('GITHUB_OAUTH_CLIENT_ID', 'GITHUB_OAUTH_CLIENT_SECRET'),
    'google': ('GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'),
    'zhihu': ('ZHIHU_OAUTH_APP_ID', 'ZHIHU_OAUTH_APP_KEY'),
}
oauth_keys = [key for keys in providers.values() for key in keys]
oauth_keys += [name.upper() + '_OAUTH_REDIRECT_URI' for name in providers]
previous_redirects = {name: values.get(name.upper() + '_OAUTH_REDIRECT_URI', '')
                      for name in providers}

for key in ['APP_URL', 'APP_KEY'] + oauth_keys:
    if os.environ.get(key):
        values[key] = os.environ[key]

url = urlparse(values.get('APP_URL', ''))
if url.scheme != 'https' or not url.netloc or url.path not in ('', '/'):
    raise SystemExit('APP_URL must be the public HTTPS origin')
for name, credential_keys in providers.items():
    redirect_key = name.upper() + '_OAUTH_REDIRECT_URI'
    callback_path = f'/api/user/login/{name}/callback'
    previous_redirect = previous_redirects[name]
    if not os.environ.get(redirect_key) and (
            not previous_redirect or previous_redirect == previous_url + callback_path):
        values[redirect_key] = values['APP_URL'].rstrip('/') + callback_path
    for key in credential_keys:
        values.setdefault(key, '')

production = root / 'config/production.json'
if not production.exists():
    production.parent.mkdir(parents=True, exist_ok=True)
    production.write_text((root / 'config/production.example.json').read_text())
production.chmod(0o600)
configured_key = json.loads(production.read_text()).get('appKey', '')
if not values.get('APP_KEY'):
    values['APP_KEY'] = (configured_key if len(configured_key) >= 32
                         and configured_key != 'REPLACE_WITH_RANDOM_HEX'
                         else secrets.token_hex(32))
if len(values['APP_KEY']) < 32:
    raise SystemExit('APP_KEY must contain at least 32 characters')
for key, value in values.items():
    if not isinstance(value, str) or any(char in value for char in '\r\n\x00'):
        raise SystemExit(f'Invalid environment value for {key}')

temporary = root / '.env.next'
temporary.touch(mode=0o600, exist_ok=True)
temporary.chmod(0o600)
temporary.write_text(''.join(f'{key}={json.dumps(value)}\n' for key, value in values.items()))
temporary.replace(env_file)
print('Runtime configuration saved; OAuth: ' + ', '.join(
    name + (' configured' if all(values.get(key) for key in keys)
            else ' awaiting credentials')
    for name, keys in providers.items()))
