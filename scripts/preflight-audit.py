import subprocess
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_git_grep(pattern, paths=None, exclude=None):
    cmd = ['git', 'grep', '-n', '-i', '-E', pattern]
    if paths:
        cmd.extend(['--'] + paths)
    elif exclude:
        cmd.extend(['--'] + exclude)
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
    return res.stdout

print('=== 1. helixa|helix-logo ===')
out1 = run_git_grep('helixa|helix-logo', exclude=[':!pnpm-lock.yaml', ':!*.tsbuildinfo', ':!supabase/migrations/**'])
lines1 = [l for l in out1.splitlines() if l.strip()]
print(f'Total hits: {len(lines1)}')
with open('preflight-1-helixa.txt', 'w', encoding='utf-8') as f:
    f.write(out1)

print('=== 2. personal info ===')
out2 = run_git_grep('ziad|cultleader|thezmythz|zallat|1037312994|@gmail\\.com|t\\.me/|linkedin\\.com/in', paths=['app', 'components', 'lib', 'hooks', 'scripts', 'public'])
lines2 = [l for l in out2.splitlines() if l.strip()]
print(f'Total hits: {len(lines2)}')
with open('preflight-2-personal.txt', 'w', encoding='utf-8') as f:
    f.write(out2)
for l in lines2[:20]:
    print(' ', l)

print('=== 3. email === ===')
out3 = run_git_grep('email *=== *[\'"]', paths=['app', 'lib'])
lines3 = [l for l in out3.splitlines() if l.strip()]
print(f'Total hits: {len(lines3)}')
with open('preflight-3-email.txt', 'w', encoding='utf-8') as f:
    f.write(out3)
for l in lines3:
    print(' ', l)

print('=== 4. fake data ===')
out4 = run_git_grep('John Doe|Sarah|Jasper|Lorem|placeholder-(logo|user)', paths=['app', 'components', 'lib'])
lines4 = [l for l in out4.splitlines() if l.strip()]
print(f'Total hits: {len(lines4)}')
with open('preflight-4-fakedata.txt', 'w', encoding='utf-8') as f:
    f.write(out4)
for l in lines4[:20]:
    print(' ', l)

print('=== 5. getSupabaseBypassClient in app/api ===')
res5 = subprocess.run(['git', 'grep', '-l', 'getSupabaseBypassClient', '--', 'app/api'], capture_output=True, text=True, encoding='utf-8', errors='ignore')
lines5 = [l for l in res5.stdout.splitlines() if l.strip()]
print(f'Total files: {len(lines5)}')
with open('preflight-5-bypass.txt', 'w', encoding='utf-8') as f:
    f.write(res5.stdout)
for l in lines5[:15]:
    print(' ', l)
