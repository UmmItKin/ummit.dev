---
title: "Simple Linux Forensics Workflow (Disk Images)"
description: A simple digital forensics blog guide for cloning, hashing, file system analysis, data recovery, and steganography checks on evidence images.
date: 2026-04-18T11:00:00+0800
tag: "Digital Forensics, Incident Response, Linux"
lang: en-US
---

## Introduction

This is a simple Linux forensics workflow for disk images. All commands are examples, so replace placeholders with your own case paths and use them only in authorized labs or investigations.

## 1) Clone Evidence and Log Hashes

Create a forensic clone and write a hash log during imaging:

```bash
dcfldd if=<source_image.iso> of=<clone_image.iso> hash=sha256 hashlog=<hash_log.txt> bs=4096
```

Verify integrity between source and clone:

```bash
sha256sum <source_image.iso>
sha256sum <clone_image.iso>
```

## 2) Open GUI Triage (Optional)

Start Autopsy for quick visual triage:

```bash
autopsy
```

## 3) Partition and File System Overview

Inspect partition layout:

```bash
mmls <clone_image.iso>
```

Inspect file system details:

```bash
fsstat <clone_image.iso>
```

List files recursively:

```bash
fls -r <clone_image.iso>
```

Read one file by inode (example):

```bash
icat <clone_image.iso> <inode_number> > <output_file.txt>
```

## 4) Search Unallocated Data

Extract unallocated blocks and scan printable text:

```bash
blkls <clone_image.iso> | strings
```

## 5) Recover Files with TSK

Recover deleted files only (`-e`):

```bash
tsk_recover -e <clone_image.iso> <output_deleted_dir/>
```

Recover allocated files only (`-a`):

```bash
tsk_recover -a <clone_image.iso> <output_allocated_dir/>
```

## 6) Carve Hidden Tail Data

Carve data starting from an offset (example):

```bash
dd if=<clone_image.iso> of=<tail_output.bin> bs=1 skip=<offset>
```

Inspect extracted text:

```bash
strings <tail_output.bin>
```

Decode Base64 artifacts if found:

```bash
echo "<base64_text>" | base64 -d
```

## 7) Check and Crack Archives

Identify archive type:

```bash
file <archive_file>
```

Extract ZIP hash and crack with John:

```bash
zip2john <archive.zip> > <archive.hash>
john --wordlist=<wordlist.txt> <archive.hash>
```

Test archive password:

```bash
7z t -p"<password>" "<archive_file>"
```

Extract archive content:

```bash
7z x -p"<password>" "<archive_file>"
```

## 8) Steganography Checks

Analyze PNG files for hidden data:

```bash
zsteg -a <image.png>
```

Check BMP metadata:

```bash
steghide info <image.bmp>
```

Try seed and wordlist cracking:

```bash
stegseek --seed <image.bmp>
stegseek --crack <image.bmp> <wordlist.txt> <stegseek_output.txt>
```

Extract hidden payload if password is known:

```bash
steghide extract -sf <image.bmp> -p "<password>" -xf <extracted_payload.txt>
```

## 9) File Carving Tools

Use one or more carving tools:

```bash
foremost -t all -i <clone_image.iso> -o <foremost_output_dir/>
photorec /d <photorec_output_dir/> /cmd <clone_image.iso> search
scalpel -c <scalpel.conf> -o <scalpel_output_dir/> <clone_image.iso>
```

## 10) Final Partition Validation

Use TestDisk for partition checks:

```bash
testdisk /list <clone_image.iso>
```
