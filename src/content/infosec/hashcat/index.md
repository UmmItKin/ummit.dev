---
title: "Brute-Force Attack on MD5 Hash Using Hashcat"
description: Crack MD5 hashes with Hashcat on Linux using wordlist-based brute-force attacks.
date: 2024-10-28T09:10:10+0800
lastmod: 2026-07-28T01:23:38+0800
tag: "Password Cracking, Hashcat, Security"
lang: en-US
---

## Introduction

MD5 is a cryptographic hash function that produces a 128-bit hash value, and it's a one-way function. That means you can't reverse the hash value to the original value. But you can break it using brute-force attack. This article shows how to break an MD5 hash using Hashcat on Arch Linux or any other GNU/Linux distribution.

>NOTICE: I'll not cover any guide on OSX or windows. Use GNU/Linux instead.

## Prerequisites

Before we start, you’ll need a wordlist for the brute-force attack. You can easily download a wordlist from the Arch User Repository (AUR) with the following command:

```bash
paru -S wordlists
```

The downloaded wordlists will be located at `/usr/share/wordlists` and will be about 2.1 GB in size.

## Installing Hashcat

Install Hashcat from the official Arch Linux repository using the `pacman` command:

```bash
sudo pacman -S hashcat rocm-hip-sdk rocm-opencl-sdk
```

## Using Hashcat

To begin the brute-force attack on the MD5 hash, use the following command:

```bash
hashcat -m 0 -a 0 -d 2 <value_of_md5> <wordlist_file>
```

This process may take some time, depending on the complexity of the hash and the size of your wordlist.

Once the process is complete, you can view the cracked value of the MD5 hash using:

```bash
hashcat -m 0 -a 0 <value_of_md5> --show
```

## Advantages of Hashcat

Hashcat is useful for batch processing multiple hash values. You can use the `find` command to automate the process for all hashes in a specified directory. For example:

```bash
find /usr/share/wordlists/ -type f -exec hashcat -m 0 -a 0 -d 2 hash {} \;
```

This command runs Hashcat for each file in the specified directory, an efficient way to handle multiple hashes.
