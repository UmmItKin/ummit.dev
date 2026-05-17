---
title: "將開發技能應用到生活中：工程師的效率駭客技巧"
description: "作為 technical guy，我們掌握的技能不只是用來寫程式。這篇文章分享如何將 Git、自動化腳本、容器化等技術應用到日常生活，提升效率和生活品質。"
date: 2026-03-19T23:45:00+0800
lastmod: 2026-05-17T23:05:04+0800
tag: "Git, Productivity, Life Hacks, Automation"
lang: zh-TW
draft: true
---

## 前言

作為一個 technical guy，我們日常工作中會用到各種開發工具和技術。但你有沒有想過，這些技能其實不只是用來寫 code 的？

很多時候，我們學到的技術概念和工具，其實都可以套用到日常生活中，幫助我們更有效率地處理各種事情。以下分享幾個我覺得很實用的例子。

## 1. Git 版本控制

### 用 Git 管理你的功課和文件

大部分人只會用 Git 來管理程式碼，但其實 Git 是一個非常強大的版本控制系統，可以用來管理任何文字型文件。

想像一下這些情境!

#### 大學功課

寫論文或報告時，你可能會不斷修改內容。用 Git 的話，你可以為每個重要階段建立 commit，隨時可以回到之前的版本。再也不用建立「報告_v1.docx」、「報告_v2_final.docx」、「報告_v3_真正final.docx」這種尷尬的文件名稱。

#### 個人筆記

用 Markdown 寫筆記，配合 Git 管理。不同主題可以用不同 branch，想合併內容時就 merge。還可以用 GitHub/GitLab 同步到雲端，手機和電腦都能存取。

### 管理論文

```bash
cd ~/Documents/my-thesis
git init

git add thesis.md
git commit -m "Initial thesis outline"

git add thesis.md references.md
git commit -m "Add literature review chapter"

git checkout -b alternative-approach

git checkout main

git log --oneline --graph

git show HEAD@{2.weeks.ago}:thesis.md
```

#### Git 的日常應用好處

- **時光機效果**：隨時可以回到過去任何一個保存點
- **實驗空間**：用 branch 嘗試新想法，失敗了就丟掉，不影響主線
- **協作方便**：和同學一起做 group project 時，可以用 Git 協作，不用再傳來傳去搞不清楚誰改了什麼
- **雲端備份**：push 到 GitHub/GitLab，永遠不用擔心資料遺失
