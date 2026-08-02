---
title: "Install and Manage Multiple Kernels with GRUB on Arch Linux"
description: Install and manage multiple Linux kernels on Arch Linux with GRUB bootloader for flexibility and compatibility.
date: 2023-12-26T05:33:45+0800
lastmod: 2026-07-28T01:35:00+0800
tag: "GRUB, Arch Linux, Kernel"
lang: en-US
---

## Overview

GRUB (Grand Unified Bootloader) is a popular bootloader used on many Linux distributions, including Arch Linux. Installing multiple kernels alongside GRUB allows you to choose which kernel version to boot into, providing flexibility and compatibility. This guide walks through installing multiple kernels on Arch Linux.

## Step 1: Install Kernels

Open your terminal and install the desired kernel versions. In this example, we'll install the regular Linux kernel, the LTS (Long-Term Support) kernel, and the Zen kernel.

```bash
sudo pacman -S linux linux-headers
sudo pacman -S linux-lts linux-headers
sudo pacman -S linux-zen linux-headers
```

These commands install the Linux, Linux LTS, and Linux Zen kernels along with their respective headers.

## Step 2: Generate GRUB Configuration

After installing the kernels and GRUB, generate the GRUB configuration file to include the new kernels:

```bash
sudo grub-mkconfig -o /boot/grub/grub.cfg
```

This command scans your system for installed kernels and generates a configuration file (`grub.cfg`) in the `/boot/grub/` directory.

## Step 3: Reboot

Reboot your system to apply the changes:

```bash
reboot
```

During the boot process, you'll now see a GRUB menu that allows you to choose the kernel version you want to boot into.

## Selecting Kernel during Boot

When your system starts, GRUB presents a menu where you can choose the kernel you want to boot. Use the arrow keys to navigate and press Enter to select a kernel.

## Conclusion

Installing multiple kernels on Arch Linux with GRUB provides a safety net in case a new kernel version introduces compatibility issues. It allows you to choose a specific kernel version during the boot process, ensuring that you can always access your system. Experiment with different kernels to find the one that works best for your hardware and requirements.
