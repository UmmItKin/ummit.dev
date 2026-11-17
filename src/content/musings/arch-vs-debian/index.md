---
title: "我用 Arch 同 Debian 嘅體感，點解我覺得 rolling 反而穩陣?"
description: "純粹個人體感。用過幾年 Debian，再用咗幾年 Arch Linux，講下我點睇 stable release、rolling release、apt 同 pacman，仲有 AUR 嘅 supply chain 問題。"
date: 2026-11-17
lang: zh-HK
---

先講清楚，呢篇只係我自己嘅體感，唔係 benchmark，亦唔係要說服你轉 distro。每個人用法/睇法都唔同。

而呢篇文會出現係因為太多人問我點解會覺得 Ubuntu/Debian 廢反而 arch 係 stable?

>所係個句 - 最緊要係你用得開心覺得好用就岩。

## 2017 至 2021 年用 Debian，爛過好多次

我用 Debian 嘅時間大概係 2017 至 2021 年。嗰段時間入面，我部機爛過好多次。

之後轉咗去 Arch Linux，用到而家幾年，一次都未爛過。

我知呢個講法同大家嘅印象調轉晒。一般人覺得 Debian 係穩定嘅代名詞，Arch 就係「你一 update 就會爛」。但係以我自己嘅經驗嚟講，事實剛好相反。

## Package manager：pacman 穩過 apt

我覺得 Arch 個 package manager 穩過 Debian。apt 我用落真係覺得好爛。

用 apt 嘅時候，我成日唔知佢做緊乜，出問題又唔知點執。pacman 就直接好多，裝咩、刪咩、升咩，我都睇得明。

最傷嘅係 `apt autoremove` 同 `apt autoclean`。佢哋有機會幫你刪錯嘢，刪完成部機就廢咗。而且修好難，重裝仲易過修。

## Rolling release 爛嘅機率，我覺得一定細過 Debian

好多人怕 rolling release，因為佢成日更新，覺得更新得多就容易爛。

我嘅睇法係，rolling release 每次只係更新少少，有問題好快就會有人 report 同修好。Debian 就係一次過跳一大個版本，幾年嘅改動一齊落嚟，咁先至更加容易出事。

所以我覺得 rolling release 爛嘅機率，一定細過 Debian。

## Stable release 要等幾耐先用得到？

Stable release 嘅另一個問題係，你唔知要等幾耐先用得到新嘢。

一個 package 有新版本，修咗 bug，你喺 Debian 可能要等好耐先見到。咁樣反而好難講係穩定。舊版本唔代表冇 bug，只係代表啲 bug 冇人幫你修。

## 自己 config 自己嘅系統

Rolling 加上 Arch 嘅做法，我覺得更加容易 custom 我嘅 Linux。設定檔清楚，我想改乜就改乜，config 起上嚟易好多。

相反 apt 我覺得太難用，要改啲嘢成日要兜好大個圈。

## AUR 嘅 supply chain attack

講到 Arch，一定有人提 AUR 嘅 supply chain attack。

AUR 的確出過呢類事。但如果咁樣講嘅話，npm 都一樣啦。任何開放俾人上載 package 嘅地方，developer 都可以好簡單出現，惡意嘅 package 都一樣可以混入去。呢個唔係 Arch 獨有嘅問題。

我自己嘅做法係，用 AUR 之前睇下 PKGBUILD，唔好盲目裝。

## 總結

以 Linux 嚟講，俾我最好體感嘅係 NixOS 同 Arch。

以上全部都係我自己嘅感覺。我 2017 至 2021 年用 Debian 爛過好多次，用 Arch 幾年一次都未爛過，所以我而家會揀 Arch。你嘅經驗可能完全唔同，咁都好正常。
