---
title: "SCP and SSH Guide for Secure File Transfers"
description: "Transfer files securely with SCP and manage SSH server access with key-based authentication."
date: 2022-01-27T20:24:39+0800
lastmod: 2026-07-28T01:35:00+0800
tag: "Linux, SSH, Remote Access"
lang: en-US
---

## Introduction

Securely transferring files and accessing remote systems is essential for remote server management. The `scp` (secure copy) command lets you transfer files between local and remote systems, while SSH (Secure Shell) handles authentication and data encryption. This guide covers `scp` for file transfers along with features like verbose mode and custom port usage.

## Secure File Transfer with SCP

### Understanding SCP

`scp` (Secure Copy) is a command-line utility that facilitates secure file transfers between local and remote systems. Leveraging the security features of SSH, `scp` ensures your data remains encrypted and protected during transit.

### Utilizing Verbose Mode for Transparency

The `scp` command provides a `--verbose` flag (`-v` for short) that displays detailed information about the file transfer process. This can be immensely helpful for troubleshooting and gaining insights into the transfer progress.

To enable verbose mode, simply append the `--verbose` flag to your `scp` command:

```shell
scp --verbose <local_file> user@remote_host:remote_path
```

### Customizing Port Usage

By default, `scp` uses port 22 for SSH connections. However, you can specify a custom port using the `-P` flag followed by the desired port number:

```shell
scp -P <custom_port> <local_file> user@remote_host:remote_path
```

## Streamlined Remote Server Access with SSH

### Enhanced Security with Verbose Logging

SSH also offers a verbose mode, which can be activated using the `-v` flag. This mode provides detailed information about the SSH connection process, aiding in debugging and security audits.

```shell
ssh -v user@remote_host
```

### Custom Ports for SSH Connections

Similar to `scp`, SSH allows you to specify custom ports for connections using the `-p` flag followed by the port number:

```shell
ssh -p <custom_port> user@remote_host
```

## Conclusion

With `scp` for secure file transfers and features like verbose mode and custom port usage, you have the tools to manage remote servers with security and flexibility. Incorporate these into your workflow to keep control over file transfers and remote access.
