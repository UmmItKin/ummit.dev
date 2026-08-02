---
title: "How to Change DNS Servers on Linux"
description: "Change DNS servers on Linux to Cloudflare, Google, or any custom resolver for faster and more private browsing."
date: 2023-08-19T15:22:25+0800
lastmod: 2026-07-28T01:50:00+0800
tag: "Linux, DNS, Networking"
lang: en-US
---

## Introduction

Faster DNS servers can speed up domain lookups and improve browsing. This guide shows how to change DNS servers on Linux by editing `/etc/resolv.conf`, using Cloudflare DNS and Google DNS as examples.

## Understanding DNS Servers

DNS servers are crucial in translating human-readable domain names (e.g., www.example.com) into IP addresses that computers understand. Using faster and more reliable DNS servers can significantly reduce the time it takes to resolve domain names, resulting in quicker website loading times.

## Configuring DNS Servers

Configuring DNS servers on your Linux system involves editing a specific configuration file. Below, we'll guide you through the process of configuring popular DNS servers such as Cloudflare DNS and Google DNS.

### Using Cloudflare DNS (1.1.1.1 and 1.0.0.1)

Cloudflare DNS is known for its impressive speed, often outperforming other DNS servers. To set up your Linux system to utilize Cloudflare DNS, follow these steps:

1. Open a terminal window.

2. Edit the `/etc/resolv.conf` file using a text editor such as `nano` or `vim`:

   ```shell
   sudo nano /etc/resolv.conf
   ```

3. Add the following lines at the top of the file:

   ```shell
   nameserver 1.1.1.1
   nameserver 1.0.0.1
   ```

These lines specify the Cloudflare DNS servers for domain name resolution.

### Using Google DNS (8.8.8.8 and 8.8.4.4)

Google DNS is another popular choice, valued for its reliability and performance. To configure your system to use Google DNS, follow these steps:

1. Open a terminal window.

2. Edit the `/etc/resolv.conf` file:

   ```shell
   sudo nano /etc/resolv.conf
   ```

3. Add the following lines:

   ```shell
   nameserver 8.8.8.8
   nameserver 8.8.4.4
   ```

These lines indicate the Google DNS servers for your domain resolution needs.

With these configurations in place, your Linux system will utilize either Cloudflare DNS or Google DNS for translating domain names to IP addresses. This can result in improved speed and responsiveness.

## Installation on Arch-Based Linux

If you're using an Arch-Based Linux distribution, such as Arch Linux or Manjaro, you can easily install the necessary tools for working with DNS settings. The `dnsutils` package provides essential utilities like `nslookup` and `dig`. To install this package, follow these steps:

1. Open a terminal window.

2. Run the following command to install the `dnsutils` package:

   ```shell
   sudo pacman -S dnsutils
   ```

This will install the required tools for DNS-related tasks on your Arch-Based system.

### Verifying Your Configured DNS Server

After configuring your DNS server, it's important to verify that your Linux system is indeed using the desired DNS server. You can achieve this by using the `dig` command in combination with `grep` to extract relevant information. Follow these steps:

1. Open a terminal window.

2. Enter the following command:

   ```shell
   dig | grep "SERVER"
   ```

This command will display the DNS server information currently in use by your system. By performing this check, you can ensure that your chosen DNS server has been successfully configured and is actively being utilized for domain name resolution.

## Conclusion

Changing DNS servers on Linux is a straightforward way to reduce latency. Cloudflare DNS (1.1.1.1 and 1.0.0.1) and Google DNS (8.8.8.8 and 8.8.4.4) both offer faster, more reliable domain name resolution than most defaults.
