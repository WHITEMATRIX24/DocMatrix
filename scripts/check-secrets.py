"""Scan tracked files without printing matches or secret values."""
from pathlib import Path
import re, subprocess, sys
patterns = [re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'), re.compile(rb'AKIA[A-Z0-9]{16}'), re.compile(rb'(?:JWT_SECRET|AWS_SECRET_ACCESS_KEY|BACKUP_ENCRYPTION_KEY|AUTH_ENCRYPTION_KEY)\s*=\s*[\"\x27]?[A-Za-z0-9+/]{32,}')]
violations=[]
for name in subprocess.check_output(['git','ls-files','-z']).decode().split('\0'):
    if not name or name.endswith(('.env.example','.png','.jpg','.pdf','.woff2')): continue
    path=Path(name)
    if not path.is_file(): continue
    if path.name == '.env' or any(p.search(path.read_bytes()) for p in patterns): violations.append(name)
if violations:
    print('Credential scan rejected these paths:\n'+'\n'.join(violations)); sys.exit(1)
print('Tracked-file credential scan passed.')
