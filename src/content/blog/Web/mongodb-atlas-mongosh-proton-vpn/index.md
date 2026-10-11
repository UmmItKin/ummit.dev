---
title: "Connecting to MongoDB Atlas with mongosh while Proton VPN is on (Linux)"
description: "Why mongosh fails to reach MongoDB Atlas with Proton VPN on, and how to fix it with split tunneling on Linux."
date: 2026-10-11
tag: "MongoDB, Proton VPN, Linux"
lang: en-US
---

# Connecting to MongoDB Atlas with mongosh while Proton VPN is on (Linux)

I lost an evening to this during a university lab. `mongosh` refused to connect to my MongoDB Atlas cluster, and Atlas kept telling me to fix my IP access list even though my IP was already on it. The real cause was Proton VPN. This post covers how I found that out, why Proton's split tunneling didn't work out of the box, and the config that fixed it.

## Who this is for

- Linux users running the **Proton VPN desktop app** (GTK app, WireGuard).
- Anyone using `mongosh` (or another MongoDB client) to reach **MongoDB Atlas** and seeing `ECONNRESET`.
- Students on database courses who want to keep the VPN on for everything else.

If you don't need the VPN while you work, the fastest fix is to disconnect it. The rest of this post is for keeping it on.

## My environment

| Item | Version |
|---|---|
| OS | Arch Linux |
| Proton VPN app | `proton-vpn-gtk-app` 4.18.5, protocol WireGuard |
| Proton VPN daemon | `proton-vpn-daemon` 0.13.8 |
| Proton VPN CLI | `proton-vpn-cli` 1.0.5 |
| Python | 3.14 |
| MongoDB Shell | `mongosh` 2.5.1, installed as a standalone binary at `/usr/bin/mongosh` |
| Database | MongoDB Atlas free tier (M0), MongoDB 8.0, 3 node replica set |

## The symptom

```text
$ mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net/" --apiVersion 1 --username myuser
Enter password: ****************
MongoServerSelectionError: read ECONNRESET. It looks like this is a MongoDB Atlas cluster.
Please ensure that your Network Access List allows connections from your IP.
```

The error suggests the Atlas IP access list, so that's where I looked first. It was a dead end.

## Finding the cause

### 1. Check the public IP

```bash
curl -s https://api.ipify.org
```

The IP it printed was already in Atlas under **Security → Database & Network Access → IP Access List**, and Atlas even labelled it "includes your current IP address". So the list looked fine.

A lookup of that IP showed it belonged to a VPN and datacenter provider. That was the first hint: my traffic was leaving through Proton VPN.

### 2. Test the connection layer by layer

Atlas SRV records point to three shard hosts on port 27017:

```bash
dig +short SRV _mongodb._tcp.cluster0.xxxxx.mongodb.net
```

TCP to a shard connected fine:

```bash
H=ac-xxxxxxx-shard-00-00.xxxxx.mongodb.net
timeout 5 bash -c "</dev/tcp/$H/27017" && echo tcp-ok
```

The TLS handshake never finished. It printed `Connecting to ...` and then hung until the timeout:

```bash
timeout 10 openssl s_client -connect $H:27017 -servername $H </dev/null
```

`curl -v https://$H:27017` showed the same picture. The Client Hello went out and no reply came back.

### 3. Rule out the access list completely

As a test I added `0.0.0.0/0` (allow from anywhere) to the Atlas access list and waited for it to turn **Active**. The TLS handshake still hung.

That settled it. The packets were not reaching Atlas properly through the VPN tunnel, so no access list change could help. I did not pin down the exact reason Proton's tunnel drops TLS on port 27017. It could be port filtering on the VPN server or something in the tunnel path. What matters is that bypassing the tunnel for mongosh fixed it.

Remove the `0.0.0.0/0` entry after a test like this. Leaving a database open to the whole internet is a bad idea, even with a password on it.

## The fix: exclude mongosh from the VPN

Proton VPN on Linux has **split tunneling**. In **Exclude** mode, everything goes through the VPN except the apps you list. The goal is to list `mongosh`.

### Why the default setup did not work

I hit four separate problems before it worked.

1. **The mode was wrong.** My config had split tunneling enabled in **Include** mode with an empty list. Include mode means only the listed apps use the VPN, so an empty list does nothing useful here.
2. **mongosh was not in the app picker.** The app picker only lists programs that have a desktop entry (`.desktop` file). A CLI tool like mongosh has none.
3. **There is no IP option in this version.** Version 4.18.5 has code for IP based split tunneling, but the settings widget for it is empty, so you can only exclude apps.
4. **Settings are locked while connected.** You must disconnect before the split tunneling settings can change.

The Proton CLI doesn't help either. Version 1.0.5 has no split tunneling setting at all, and on Python 3.14 it crashed on startup (see the bonus section at the end).

### Step 1. Disconnect and fully quit Proton VPN

Click **Disconnect**, then quit the app from the tray icon menu. Closing the window is not enough, because the app keeps running in the tray. Check it is gone:

```bash
pgrep -af protonvpn-app   # should print nothing
```

If the app is still running when you edit its settings file, it can overwrite your change.

### Step 2. Edit the settings file

Back it up first:

```bash
cp ~/.config/Proton/VPN/settings.json ~/.config/Proton/VPN/settings.json.bak
nano ~/.config/Proton/VPN/settings.json
```

Inside `features`, set `split_tunneling` like this. The important parts are `"mode": "exclude"` and the path in `app_paths`:

```text
"split_tunneling": {
    "enabled": true,
    "mode": "exclude",
    "config_by_mode": {
        "exclude": {
            "mode": "exclude",
            "app_paths": ["/usr/bin/mongosh"],
            "ip_ranges": []
        },
        "include": {
            "mode": "include",
            "app_paths": [],
            "ip_ranges": []
        }
    }
}
```

Check that the JSON is still valid:

```bash
python3 -m json.tool ~/.config/Proton/VPN/settings.json | grep -A3 '"exclude"'
```

Use the real path of your mongosh (`readlink -f "$(command -v mongosh)"`). The match works best when mongosh is a real binary. If yours is a Node script started through `npx` or `node`, the running program is `node`, and excluding the mongosh path may not catch it.

### Step 3. Reconnect and confirm the daemon picked it up

Open Proton VPN and click **Connect**. Then check the daemon log:

```bash
journalctl -u proton.VPN.service -n 30 --no-pager | grep -i split
```

You want to see a line like this:

```text
Setting SplitTunnelingConfig(mode=<SplitTunnelingMode.EXCLUDE: 'exclude'>, app_paths=['/usr/bin/mongosh'], ip_ranges=[]) for user 1000
```

### Step 4. Allow your real IP in Atlas

mongosh now leaves through your normal internet connection, so Atlas sees your **real** IP instead of the VPN one. Every other program still shows the VPN IP, so `curl ipify` won't give you the right answer. mongosh can look it up, because it bypasses the VPN:

```bash
/usr/bin/mongosh --nodb --quiet --eval "fetch('https://api.ipify.org').then(r=>r.text()).then(print)"
```

Add that IP as `x.x.x.x/32` under **Network Access → Add IP Address**. Wait about a minute until it shows **Active**.

You can tell which stage you are at from the error:

| Error | Meaning |
|---|---|
| `read ECONNRESET` | Traffic is still going through the VPN |
| `SSL alert number 80` | Traffic bypasses the VPN, but your real IP is not allowed yet |
| `Authentication failed` | The network is fine. The username or password is wrong |

### Step 5. Run mongosh with its full path

This one surprised me. The same command worked when I ran it as `/usr/bin/mongosh ...` but failed when I typed just `mongosh ...`.

The daemon log showed why. In this version, the daemon compares your list against the **command line** the process was started with, checking whether it begins with the path you listed. Typed as `mongosh`, the command line starts with `mongosh`, not `/usr/bin/mongosh`, so it is not excluded.

Either type the full path:

```bash
/usr/bin/mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net/" --apiVersion 1 --username myuser
```

or add an alias so the plain command works:

```bash
echo "alias mongosh=/usr/bin/mongosh" >> ~/.zshrc && source ~/.zshrc
```

After that, mongosh connects and you get the `Atlas atlas-xxxx-shard-0 [primary] test>` prompt, with the VPN still on for everything else.

## Optional: make mongosh show up in the Proton app picker

If you prefer the GUI, give mongosh a desktop entry so the picker can list it:

```bash
cat > ~/.local/share/applications/mongosh.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=MongoDB Shell (mongosh)
Exec=/usr/bin/mongosh
Terminal=true
Categories=Development;
EOF
update-desktop-database ~/.local/share/applications
```

The Proton app only reads the app list when it starts, so quit and reopen it afterwards. This didn't work reliably for me, which is why I edited the JSON directly.

## Bonus: fixing the Proton VPN CLI crash on Python 3.14

`protonvpn` (CLI 1.0.5) crashed straight away with a long traceback that ended in:

```text
AttributeError: type object 'GreenSocket' has no attribute 'sendmsg'
```

The cause is not Proton itself. Its crash reporter `sentry_sdk` checks whether `eventlet` is installed. On my system `eventlet` was installed as a dependency of other packages, and importing it breaks on Python 3.14.

The workaround is a small wrapper that hides `eventlet` before the CLI starts. Put it in `~/.local/bin/protonvpn`, which comes before `/usr/bin` in `PATH`:

```python
#!/usr/bin/python
# Workaround: sentry_sdk imports eventlet, which crashes on Python 3.14. Hide it.
import sys
sys.modules["eventlet"] = None
from proton.vpn.cli import main
sys.argv[0] = "protonvpn"
sys.exit(main())
```

```bash
chmod +x ~/.local/bin/protonvpn
protonvpn --help
```

The CLI and the GUI cannot run at the same time, so quit the GUI before using the CLI.

## Summary

1. `ECONNRESET` from Atlas with the VPN on doesn't always mean an access list problem. Test TCP and TLS separately to see where it breaks.
2. If TLS hangs even with `0.0.0.0/0` allowed, the VPN path is the problem.
3. Proton VPN 4.18.5 on Linux can only exclude apps, not IPs. Its picker does not list CLI tools, and settings are locked while connected.
4. Put the full mongosh path in `app_paths` under `exclude` in `~/.config/Proton/VPN/settings.json` while the app is fully quit.
5. Allow your **real** IP in Atlas, and look it up through mongosh because other tools still show the VPN IP.
6. Start mongosh by its full path, or alias it, because the exclude match checks the start of the command line.

The fastest option is still to disconnect the VPN while you work with the database. If you want it on all the time, this setup works.
