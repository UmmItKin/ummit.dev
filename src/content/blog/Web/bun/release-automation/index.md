---
title: "Automated GitHub Releases with Bun, Bumpp, and Changelogithub"
description: Automate version bumping and GitHub release creation with changelog generation using Bun, bumpp, and changelogithub.
date: 2026-01-16T09:30:00+0800
lastmod: 2026-05-17T23:05:04+0800
tag: "Bun, GitHub, Automation"
lang: en-US
---

## Introduction

Ever wanted to automate your GitHub releases with auto-generated changelogs based on your commit messages? With **Bun**, **bumpp**, and **changelogithub**, you can create professional releases in seconds !!! no manual changelog writing required!

## Prerequisites

Before getting started, make sure you have the following tools:

- [Bun](https://bun.sh/) — A fast JavaScript runtime
- [bumpp](https://github.com/antfu/bumpp) — Interactive version bumping
- [changelogithub](https://github.com/antfu/changelogithub) — GitHub release notes generator

Install bumpp as a dev dependency:

```bash
bun add -D bumpp
```

## Setup

Add a release script to your `package.json`:

```json
{
  "scripts": {
    "release": "bumpp"
  }
}
```

## Bump the Version and Create a Tag

Run the release command:

```bash
bun run release
```

You'll see an interactive prompt like this:

```
✔ Current version 1.4.1 ›         patch 1.4.2

   files package.json
  commit chore: release v1.4.2
     tag v1.4.2
    push yes

    from 1.4.1
      to 1.4.2

✔ Bump? … yes
✔ Git commit
✔ Git tag
✔ Git push
```

This will:

1. Update the version in `package.json`
2. Create a git commit with message `chore: release vX.X.X`
3. Create a git tag `vX.X.X`
4. Push everything to your remote repository

## Step 2: Generate the Changelog

Now, let's generate the changelog and create a GitHub release:

```bash
bunx changelogithub
```

### No Previous Tag to Compare

If this is your **first release**, you'll likely encounter this error:

```
fatal: ambiguous argument 'c46318bd...v1.4.2': unknown revision or path not in the working tree.
```

**Why does this happen?**

This error occurs because `changelogithub` tries to compare the current tag with the previous tag to generate a changelog. Since this is your first release, there's no previous tag to compare against.

**Solution:** Manually specify the starting commit using the `--from` flag:

```bash
bunx changelogithub --from c46318b
```

To find your initial commit hash:

```bash
git log --oneline | tail -1
```

### Error 2: No GitHub Token Found

After fixing the first error, you might encounter this:

```
No GitHub token found, specify it via GITHUB_TOKEN env. Release skipped.
```

**Why does this happen?**

Since we're running `changelogithub` locally (without GitHub Actions), it needs a GitHub token to authenticate and create the release on your behalf.

**Solution:** Create and export a GitHub Personal Access Token.

#### How to Get a GitHub Token

1. Go to **GitHub** → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **"Generate new token (classic)"**
3. Give it a name (e.g., `changelogithub`)
4. Select the scope:
   - `public_repo` — for public repositories
   - `repo` — for private repositories
5. Click **"Generate token"** and copy it

#### Export the Token

Add the token to your current shell session:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

> **Tip:** Add this line to your `~/.zshrc` or `~/.bashrc` for permanent access.

## Now Run Again!

Now run the command again with both fixes:

```bash
bunx changelogithub --from c46318b
```

You should see output like this:

```
changelogithub v14.0.0
c46318b -> v1.4.2 (224 commits)
--------------

### 🚨 Breaking Changes
- Update package manager to use bun or bunx

### 🚀 Features
- Add Friends page
- Add Gear page
- **OG-Image**: Add Open Graph image generation

### 🐞 Bug Fixes
- Missing thumbnail
- Correct spelling errors

##### View changes on GitHub

--------------
Creating release notes...
Released on https://github.com/username/repo/releases/tag/v1.4.2
```

Your release is now live on GitHub with a beautifully formatted changelog!

## Automate with GitHub Actions

Want to skip the manual token setup entirely? Use GitHub Actions to automate the entire process!

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Generate Changelog & Release
        run: bunx changelogithub
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Now your workflow is:

1. Run `bun run release` locally
2. GitHub Actions automatically generates the changelog and creates the release

> **Note:** `secrets.GITHUB_TOKEN` is automatically provided by GitHub Actions — no manual setup required!

---

## Command Reference

| Command | Purpose |
|---------|---------|
| `bun run release` | Bump version, commit, tag, and push |
| `bunx changelogithub` | Generate changelog and create GitHub release |
| `bunx changelogithub --from <commit>` | First release (specify starting commit) |
| `bunx changelogithub --dry` | Preview changelog without publishing |

---

## References

- [bumpp](https://github.com/antfu/bumpp) — Version bumping tool by Anthony Fu
- [changelogithub](https://github.com/antfu/changelogithub) — Changelog generator by Anthony Fu
- [Conventional Commits](https://www.conventionalcommits.org/) — Commit message specification
