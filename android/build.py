"""Build and sign Yakınım without putting a private key/password in the repository."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--signing-json', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--skip-build', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parent
project = root / 'twa'
config = json.loads((root / 'twa-config.json').read_text())
private_path = Path(args.signing_json).resolve()
private = json.loads(private_path.read_text())
if private['packageId'] != config['packageId']:
    raise SystemExit('Signing identity does not match the application')
sdk = Path(os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT') or '')
tools = sdk / 'build-tools' / '36.0.0'
if not (tools / 'apksigner').is_file():
    raise SystemExit('Android SDK Build Tools 36.0.0 required')
if not args.skip_build:
    (project / 'local.properties').write_text(f'sdk.dir={sdk.resolve()}\n')
    subprocess.run(['./gradlew','--no-daemon','assembleRelease','--console=plain'],cwd=project,check=True)
unsigned = project / 'app/build/outputs/apk/release/app-release-unsigned.apk'
aligned = unsigned.with_name('app-release-aligned.apk')
subprocess.run([str(tools/'zipalign'),'-p','-f','4',str(unsigned),str(aligned)],check=True)
output = Path(args.output).resolve()
output.parent.mkdir(parents=True,exist_ok=True)
env = dict(os.environ,YAKINIM_STORE_PASSWORD=private['storePassword'],YAKINIM_KEY_PASSWORD=private['keyPassword'])
subprocess.run([str(tools/'apksigner'),'sign','--ks',str(private_path.parent/private['keystoreFile']),
               '--ks-key-alias',private['alias'],'--ks-pass','env:YAKINIM_STORE_PASSWORD',
               '--key-pass','env:YAKINIM_KEY_PASSWORD','--out',str(output),str(aligned)],env=env,check=True)
result = subprocess.run([str(tools/'apksigner'),'verify','--verbose','--print-certs',str(output)],
                        env=env,check=True,text=True,capture_output=True)
certificate_line = next(line for line in result.stdout.splitlines() if 'certificate SHA-256 digest:' in line)
actual = certificate_line.split(': ',1)[1].strip().lower()
expected = {f['value'].replace(':','').lower() for f in config['fingerprints']}
links = json.loads((root.parent/'public/.well-known/assetlinks.json').read_text())
site_expected = {fingerprint.replace(':','').lower() for statement in links
                 if statement['target']['package_name']==config['packageId']
                 for fingerprint in statement['target']['sha256_cert_fingerprints']}
if actual not in expected or actual not in site_expected:
    output.unlink()
    raise SystemExit('APK certificate does not match the site binding')
print(result.stdout)
print('APK SHA-256:',hashlib.sha256(output.read_bytes()).hexdigest())
print('APK bytes:',output.stat().st_size)
