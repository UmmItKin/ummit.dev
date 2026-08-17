---
title: "Must-Have Oh My Zsh Plugins for Productivity"
description: "Must-have Oh My Zsh plugins for syntax highlighting, auto-suggestions, and command completion."
date: 2023-08-11T10:05:30+0800
lastmod: 2026-08-17T23:47:32+0800
tag: "Linux, Zsh, Productivity"
lang: en-US
---

## Why use plugins?

Oh-My-Zsh plugins are the secret sauce that can transform your terminal life. Imagine having a terminal that anticipates your needs, boosts your efficiency, and just feels right. Well, with these powerful plugins, you're about to embark on a journey to terminal enlightenment. Ready to explore? Dive in: [Oh-My-Zsh Plugins](https://github.com/ohmyzsh/ohmyzsh/wiki/Plugins)

## Git Plugin: Your Versatile Commandeer

The Git plugin is enabled by default. To make sure it is there:

1. Unlock the gateway to configuration by opening your `~/.zshrc` file:

```shell
nano ~/.zshrc
```

2. Traverse the script to locate the revered `plugins` section. Here, make certain that `git` is securely enlisted:

```shell
plugins=( git )
```

3. Seal your changes and depart from the text editor's realm.

## Install zsh-autosuggestions

The zsh-autosuggestions plugin acts as your intuitive guide, enriching your command-line interactions with unparalleled finesse. This remarkable plugin observes your keystrokes, channeling its insights from your command history to offer suggestions tailored to your context. It's akin to conversing with a terminal that understands your intentions.

1. Begin your odyssey by unlocking your terminal's gateway.
2. Navigate to the sacred grounds of custom plugins by entering:

```shell
cd ~/.oh-my-zsh/custom/plugins
```

3. Unleash the power of zsh-autosuggestions by invoking the following incantation:

```shell
git clone https://github.com/zsh-users/zsh-autosuggestions
```

### Apply zsh-autosuggestions to your shell

Prepare to sculpt your terminal interactions into an intuitive symphony, guided by the zsh-autosuggestions plugin.

1. Reenter the terminal's domain, ready to shape your experience.
2. Manipulate the script of destiny by accessing the Zsh configuration file:

```shell
nano ~/.zshrc
```

3. Traverse the mystic grounds until you encounter the sacred `plugins` realm. Here, amid echoes of commands past, usher in zsh-autosuggestions:

```shell
plugins=(zsh-autosuggestions)
```

4. Etch your alterations into existence and retreat from the text editor's realm.

#### See the effect

1. Close and reopen your terminal.
2. Type a command you have run before. zsh-autosuggestions will suggest the rest of it in grey as you type; press the right arrow to accept.
