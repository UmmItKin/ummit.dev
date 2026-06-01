---
title: "Arch Linux Bluetooth Connectivity Guide"
description: "Quick-reference cheatsheet for installing, configuring, and troubleshooting Bluetooth on Arch Linux."
date: 2026-06-01T16:00:00+0800
tag: "Arch Linux, Bluetooth, Linux"
lang: en-US
---

## Installation

```bash
sudo pacman -S bluez bluez-utils
```

## Systemd Service Management

```bash
sudo systemctl start bluetooth.service
sudo systemctl enable bluetooth.service
sudo systemctl stop bluetooth.service
sudo systemctl restart bluetooth.service
sudo systemctl status bluetooth.service
```

## Bluetoothctl CLI Commands

Type `bluetoothctl` in your terminal to enter the interactive shell, then use these commands:

| Command | Description |
|---|---|
| `power on` / `off` | Turn the Bluetooth radio on or off |
| `scan on` / `off` | Start or stop searching for nearby devices |
| `devices` | List all discovered and known devices |
| `paired-devices` | List all successfully paired devices |
| `pair <MAC>` | Pair with a specific device |
| `trust <MAC>` | Trust the device (allows automatic reconnects) |
| `connect <MAC>` | Establish a connection to the device |
| `disconnect <MAC>` | Disconnect from the device |
| `remove <MAC>` | Unpair and delete the device from system memory |
| `exit` | Quit the bluetoothctl shell |

## Real Example: Connect a Bluetooth Headset

Walk through pairing and connecting a headset from scratch:

```bash
sudo systemctl start bluetooth.service

bluetoothctl

power on
scan on
scan off
pair AA:BB:CC:DD:EE:FF
trust AA:BB:CC:DD:EE:FF
connect AA:BB:CC:DD:EE:FF
exit
```
