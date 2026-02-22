---
title: "THJCC CTF 2026 - Official Writeup for 0422, r2s, Simple Hack and I use arch btw"
description: "The step by step official writeup for these challenges."
date: 2026-02-22T23:46:20+0800
tag: "CTF, THJCC CTF 2026, WriteUp"
lang: en-US
draft: true
---

# Introduction

# I use arch btw

This is a multi-stage challenge involving steganography, file extraction, hash cracking, and password-protected document extraction. Here's the detailed step-by-step approach:

**Challenge Description:**

Can you find the hidden message in the provided JPEG image file?

![CTFd](./images/i%20use%20arch%20btw/CTFd.png)

## File Analysis

Before diving into extraction, let's understand what we're working with, using `file` command:

```shell
file "THJCC_I use arch btw.jpg"
```

Output

```
THJCC_I use arch btw.jpg: JPEG image data, JFIF standard 1.01, aspect ratio, density 1x1, segment length 16, baseline, precision 8, 569x607, components 3
```

This confirms we have a standard JPEG file. Next, we do a binary analysis with the `strings` command:

```shell
strings "THJCC_I use arch btw.jpg"
```

Output

```
-e,5
H[#M;at
KK{F
}/B;
....
9"H(
"@-y
;({0
-<0nD|y
=_s#
\$}-G
Nkox&
readme.xlsxUT
biux
```

Take a look at the end of this file. We can see we have a `readme.xlsx` file, which confirms there is a hidden file inside this image.

### Extract hidden files

Binwalk is a forensics tool used to search binary images for embedded files and executable code. JPEG files can contain hidden data in their metadata or appended after the image data.

![binwalk](./images/i%20use%20arch%20btw/binwalk/binwalk.png)

```shell
binwalk -e "THJCC_I use arch btw.jpg"
```

### XLSX File

Navigate to the extraction directory and examine what was extracted:

You should find one file!!! The file `readme.xlsx`. xlsx is a Microsoft Excel file.

![alt text](./images/i%20use%20arch%20btw/binwalk/binwalk-extracted.png)

#### That file are encrypted

However, looking at the file command output, you can see that this file is encrypted:

```
readme.xlsx: CDFV2 Encrypted
```

![alt text](./images/i%20use%20arch%20btw/password-is-protected.png)

## Hashed Value

Our mission at this point is to extract the hash from this file type and crack it. One of the most popular tools is `john`, a password cracker. You can use `office2john`, one of John's utilities, to extract the hash value!

### Extract Password Hash from XLSX

The `office2john` tool (from the John the Ripper suite) converts Microsoft Office document hashes into a format that password cracking tools like hashcat can understand:

```shell
❯ office2john readme.xlsx
readme.xlsx:$office$*2007*20*128*16*8c78445e54b41f53ff8696023f465f38*17f96a28c8b4501b5a054b1ff55c5f13*2ff3b41a3016bd9284011bfd287343ab1e48e56e
```

### Wordlist Finding

Before we perform hash cracking, you need to find a wordlist.

For this challenge, the password is quite common and can be found in standard wordlists. I didn't make it too complex. The password is actually inside SecLists or rockyou.

For Blackarch users, install it via the command below. If not, you can clone the repository here:

>https://github.com/danielmiessler/SecLists

```shell
sudo pacman blackarch/seclists
```

### Cracking with Hashcat

Now we perform a dictionary attack using hashcat:

Your hash value should look like this:

```shell
$office$*2007*20*128*16*8c78445e54b41f53ff8696023f465f38*17f96a28c8b4501b5a054b1ff55c5f13*2ff3b41a3016bd9284011bfd287343ab1e48e56e
```

and launch the attack:

```bash
hashcat -a 0 readme_hash /usr/share/wordlists/seclists/Passwords/WiFi-WPA/probable-v2-wpa-top447.txt
```

![hashcat](./images/i%20use%20arch%20btw/hashcat/hashcat.png)

Now see the result here:

```shell
hashcat -a 0 readme_hash --show
```

![hashcat show](./images/i%20use%20arch%20btw/hashcat/hashcat-show.png)

Password is `rush2112` Now you can open it.

![flag](./images/i%20use%20arch%20btw/flag.png)

#### Flag

This is the flag for this challenge:

`THJCC{7h15_15_7h3_m3554g3....._1_u53_4rch_b7w}`
