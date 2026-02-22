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

---

# 0422

A very simple challenge about a web exploit.

Really simple. LOL.

This is a web exploitation challenge involving cookie manipulation and access control. Can you gain admin privileges by modifying client-side cookies?

> Vulnerability: Insecure Direct Object Reference (IDOR) / Broken Authentication / Insecure cookie handling.

![alt text](./images/0422/CTFd.png)

## Testing the Application

Start by visiting the application dashboard. You'll be presented with a login panel:

![0422 Dashboard](./images/0422/Dashboard.png)

Attempt to login with any username and password combination. The credentials themselves don't matter for this challenge. What matters is what happens after authentication.

### Login Attempt

After submitting the login form with test credentials, you'll receive an error response:

![Login Error](./images/0422/wrong.png)

This is expected. The server rejects the invalid credentials, but the important thing is what the server sends back in the response headers.

### Opening Developer Tools

Open Developer Tools with these steps:

- Press F12
- Click on the "Storage" tab (or "Application" in Chrome)
- In the left sidebar, click "Cookies"
- Select the domain: `https://chal.thjcc.org:3000`

### Identifying the Vulnerability

Let try one more time to send the login, and you'll see important cookie values:

```
Referer: http://chal.thjcc.org:3000/dashboard
Cookie: PHPSESSID=6cfc69646050e9e5a4f613e6cbacac06; role=guest; username=wae
```

Notice the `role=guest` cookie. This is the vulnerability!

### Modifying the Role Cookie

Find the cookie named `role` with the current value `guest`. Double-click on the `role` cookie's value field and change it from `guest` to `admin`:

![F12](./images/0422/f12.png)

### End this Game !!

Now Refresh the page. The server will now trust the modified cookie and grant you admin privileges.

The flag displayed on the admin dashboard is:

`THJCC{c00k135_4r3_n07_53cur3_1f_n07_51gn3d_4nd_p13453_d0_7h3_53cur3_c0d1ng_r3v13w_101111}`

![Flag Retrieved](./images/0422/flag.png)

---

# r2s

Should I upgrade my web server?

I'm too lazy. nvm, lol.

It should be safe enough?

This challenge involves a simple penetration testing methodology. All you need to do is perform basic footprinting on this server.

## CTFd token

Since we're running an instance of this challenge, each user needs to generate a token to solve it. Go to the CTF website profile page at `https://ctf2026.thjcc.org/settings`, generate a token, and enter it on the r2s instance page.

![Instance](./images/r2s/instance/Instance.png)
![Instance Created](./images/r2s/instance/instance-created.png)

## Testing the Application

Looking at the page, we see a login panel:

![Visit](./images/r2s/dashboard/visit.png)

### First try to login

Let's randomly enter something. As expected, it's not that easy. We receive an `Invalid username or password` message:

![Login](./images/r2s/dashboard/try-to-login.png)

### Confirming Next.js

Let's use F12 to check. Every website has its unique code signatures, and this one is no exception:

```shell
src="/_next/static/chunks/webpack-1b7be808ceb885ba.js"
```

![Next](./images/r2s/footprinting/next.png)

We can clearly see this is using Next.js. However, the version is still uncertain. Let's perform deep footprinting to identify it:

### Confirming Next.js Version

For Next.js, we can use the following method to manually determine the version. You can search the keyword `version` in each `.js` file:

Go to: `F12` > `Debugger` > `Main Thread` `chal.thjcc.org:10454` `*.js`

You'll see many generated JavaScript files. Open each one and search for the `version` keyword!

![NextJS Version Confirm](./images/r2s/footprinting/next-ver.png)

We successfully found `window.next={version:"15.0.0",appDir:!0}`:

![React Version Confirm](./images/r2s/footprinting/react-ver.png)

We also found `var cc=i.version;if("19.0.0-rc-65a56d0e-20241020`

However, regarding this version number... If you search for Next.js version releases online, there's no version 19. This is because Next.js is React-based. The `19.0.0-rc` is actually the React version, not the Next.js version.

#### Automatically Detect Version with cURL

Here's a script you can use to automatically detect React and Next.js versions:

```shell
CHAL="http://chal.thjcc.org:10454"; \
curl -sL "$CHAL" | grep -oP '/_next/static/[^"]+\.js' | xargs -I {} curl -sL "${CHAL}{}" | grep -oP '(?<=version:")[^"]+' | sort -u
```

### Finding the CVE

Now that we've confirmed the versions, let's search for an available exploit. Are there any applicable CVEs?

![Searching PoC](./images/r2s/react2shell/searching-poc.png)

We found one that works:

>https://nextjs.org/blog/CVE-2025-66478

>https://vercel.com/kb/bulletin/security-bulletin-cve-2025-55184-and-cve-2025-55183

As mentioned in the article, this is an RCE vulnerability!

>A critical vulnerability has been identified in the React Server Components (RSC) protocol. The issue is rated CVSS 10.0 and can allow remote code execution when processing attacker-controlled requests in unpatched environments.

### Finding a Proof of Concept

Now let's find a working PoC. I'll use my own PoC:

https://github.com/UmmItKin/CVE-2025-55182-PoC

The usage is straightforward. Simply clone the repository and run `make` to use it:

```bash
git clone https://github.com/UmmItKin/CVE-2025-55182-PoC
cd CVE-2025-55182-PoC
make
```

Then, use this tool to RCE the machine. It's located in `/flag.txt`!

![RCE](./images/r2s/react2shell/rce.png)

Flag: `THJCC{r34ct_ssr_rc3_1s_d4ng3r0us}`
