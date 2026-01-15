---
title: "Full Disk Encryption with GRUB and Including /boot: Step-by-Step Guide"
date: 2023-12-21T11:42:02+0800
lastmod: 2026-01-15T10:00:00+0800
tag: "LUKS, Linux, Arch linux, FDE"
lang: en-US
---

> **Note:** This is an updated installation method for the latest Arch Linux install.

## Guys! Arch Got an Update

**2026-01-13 12:00:00**

Today, I updated my Arch installation with a fresh install, but I encountered an issue where it gets stuck at loading `/dev/mapper/vol-root`. I did some research and asked my friends who use full disk encryption about it.

During that time, I learned that Arch recently updated something very important for FDE users. Here is the latest version of how to install with FDE on Arch.

For the lastest reference link please see:

https://wiki.archlinux.org/title/Dm-crypt/System_configuration#rd.luks.name

## Introduction

Since systemd-boot doesn't support encrypted `/boot`, GRUB does. There are not so good points though, like only argon2id are not supported.

>Warning: GRUB's support for LUKS2 is still limited. You skill need to use LUKS2 with PBKDF2. inorder it boot are working.

### Step 1: Encrypt the Disk

To begin, encrypt your disk using the LUKS format, so avoid using certain options:

```shell
cryptsetup luksFormat --type luks2 --cipher aes-xts-plain64 --hash sha512 --pbkdf pbkdf2 --iter-time 5000 --key-size 512 --use-urandom --verify-passphrase /dev/nvme0n1p2
```

Ensure you answer `YES` when prompted. GRUB doesn't support the `--pbkdf argon2id` option, so it's crucial to stick to LUKS1 for compatibility.

### Step 2: Open LUKS Device and Set Up Logical Volumes

After formatting, open the LUKS device and set up logical volumes using LVM (Logical Volume Manager):

```shell
cryptsetup open /dev/nvme0n1p2 crypt # Decrypting disk and create mapper named 'crypt'

pvcreate /dev/mapper/crypt # Create physical volume named 'crypt'
vgcreate vol /dev/mapper/crypt # Create volume group named 'vol'

lvcreate -l 3%FREE vol -n swap # Create logcial volume and set this size uses 3% of this partition and named to swap.
lvcreate -l 50%FREE vol -n root # Create logcial volume and set this size uses 50% of this partition and named to root.
lvcreate -l 100%FREE vol -n home # Create logcial volume and set this size uses 100% of this partition and named to home.
```

Format the root and home volumes:

```shell
mkfs.btrfs /dev/vol/root
mkfs.btrfs /dev/vol/home
```

Create swap space:

```shell
mkswap /dev/vol/swap
swapon /dev/vol/swap
```

Mount the volumes:

```shell
mount /dev/vol/root /mnt
mkdir /mnt/home
mount /dev/vol/home /mnt/home
```

### Step 3: Prepare for GRUB Installation

Since GRUB supports EFI systems, mount the EFI system partition:

```shell
mkfs.fat -F32 /dev/nvme0n1p1
mount /dev/nvme0n1p1 --mkdir /mnt/boot/efi
```

Now, proceed with the essential package installations:

```shell
pacstrap -i /mnt base base-devel linux linux-firmware linux-headers lvm2 vim neovim networkmanager pipewire
```

Generate the `/etc/fstab` file:

```shell
genfstab -U /mnt >> /mnt/etc/fstab
```

The process of installing Arch Linux is the same as that of ArchLinux!

If you are unfamiliar with the process, please refer to this article:

[Complete Guide to setting up LUKS on LVM encryption in Arch Linux (Minimal System)](/posts/linux/distribution/archlinux/archlinux-luks-encryption-fully-install-systemd)

### Step 4: Configure mkinitcpio.conf

Edit the `/etc/mkinitcpio.conf` file, ensuring that the `HOOKS` line includes `lvm2` and `sd-encrypt`. It should look like this. Or you can just directly copy this line.

```shell
HOOKS=(systemd autodetect microcode modconf kms keyboard keymap sd-vconsole sd-encrypt block lvm2 filesystems fsck)
```

Save the changes. Now add a file because this causes the error:

`==> ERROR: file not found: '/etc/vconsole.conf'`

```shell
echo "KEYMAP=us" > /etc/vconsole.conf
```

And now regenerate the configuration:

```shell
mkinitcpio -P
```

### Step 5: Install and Configure GRUB

Install GRUB and efibootmgr:

```shell
pacman -S grub efibootmgr
```

Configure the GRUB file:

```shell
nvim /etc/default/grub
```

Fist, (get UUID using `blkid /dev/nvme0n1p2`):

Edit `GRUB_CMDLINE_LINUX_DEFAULT`

```shell
GRUB_CMDLINE_LINUX_DEFAULT="rd.luks.name=<Your_M.2_UUID>=crypt root=/dev/mapper/vol-root"
```

and set `GRUB_ENABLE_CRYPTODISK` to `y`.

Install GRUB:

```shell
grub-install --recheck /dev/nvme0n1p1
```

Generate the GRUB configuration:

```shell
grub-mkconfig -o /boot/grub/grub.cfg
```

### Step 6: Reboot and Decrypt

Reboot your system. You'll notice that GRUB prompts you to enter the passphrase or password for decryption. After successfully decrypting, you'll encounter another decryption prompt for your volume disk.

>Note: The decryption process may take some time, and entering the wrong passphrase will lead to a GRUB rescue mode. you need to reboot and try again.

### Reboot

After completing these steps, Now exit your current user then umount your arch system. You can enjoy your new Arch Linux system with LUKS encryption. (But no GUI XD)

```shell
exit
umount -R /mnt
```

## References

- [Alpine Linux with Full Disk Encryption](https://battlepenguin.com/tech/alpine-linux-with-full-disk-encryption/)
- [[SOLVED] Grub with lvm on LUKS -> rescue mode. Incomplete grub.cfg?](https://bbs.archlinux.org/viewtopic.php?id=246628)
- [Arch Linux | LVM on LUKS with GRUB | Encrypted Installation](https://invidious.einfachzocken.eu/watch?v=FcNQQxtPA0A)
- [Encrypted /boot](https://wiki.archlinux.org/title/GRUB#Encrypted_/boot)
- [dm-crypt/Encrypting an entire system](https://wiki.archlinux.org/title/Dm-crypt/Encrypting_an_entire_system)
