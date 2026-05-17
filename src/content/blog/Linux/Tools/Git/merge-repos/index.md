---
title: "How to Merge Git Repositories While Preserving History"
description: "A guide to merging Git repositories using remote merge and subtree merge, keeping complete commit history intact."
date: 2026-03-19T20:15:00+0800
tag: "Git, Version Control, Repository Management"
lang: en-US
---

## Introduction

If you manage multiple Git repositories and want to consolidate them into a single repository, you need to choose the right merge strategy.

This guide covers two main approaches:

- **Remote merge** for flat merging at the root level
- **Subtree merge** for organizing repos into subdirectories

Both methods preserve complete commit history, but they are suited for different use cases.

## Why Merge Repositories?

There are several reasons to merge repositories:

- consolidating related projects into a monorepo
- reorganizing code for better maintainability
- preserving historical context for future development
- reducing the overhead of managing multiple repos

## Requirements

Before starting, make sure:

- you have Git installed
- you have access to both source and target repositories
- you have backed up your repositories before attempting any merge

A backup can be as simple as:

```bash
git clone /path/to/repo /path/to/repo-backup
```

## Method 1: Remote Merge (Flat Structure)

This method merges two repositories at the root level.

The result is a single branch with both histories combined.

### When to Use Remote Merge

Use this method when:

- both repositories contain different files with minimal overlap
- you want a flat directory structure
- the repositories represent different aspects of the same project

### How Remote Merge Works

```bash
# In the target repository
cd /path/to/target-repo

# Add source repo as a remote
git remote add source-repo /path/to/source-repo

# Fetch commits from source
git fetch source-repo

# Merge with allow-unrelated-histories flag
git merge source-repo/master --allow-unrelated-histories -m "merge: add source repo"

# Clean up the remote
git remote remove source-repo
```

### Why `--allow-unrelated-histories`

By default, Git refuses to merge repositories with no common ancestor.

The `--allow-unrelated-histories` flag tells Git to proceed anyway.

This is safe when you intentionally want to combine two independent repos.

### Handling Conflicts

If both repositories have files with the same name, Git will report a conflict.

You need to choose which version to keep:

```bash
# Use the version from the source repo
git checkout --theirs conflicting-file.md

# Use the version from the target repo
git checkout --ours conflicting-file.md

# Stage the resolved file
git add conflicting-file.md

# Complete the merge
git commit
```

### Example: Merging a build-scripts repo into a project repo

Suppose you have:

- `project-repo` with application code
- `build-scripts` with CI/CD configuration

You can merge `build-scripts` into `project-repo`:

```bash
cd ~/repos/project-repo

git remote add build /home/user/repos/build-scripts
git fetch build
git merge build/main --allow-unrelated-histories -m "merge: add build scripts"

# If there is a conflict in README.md
git checkout --theirs README.md
git add README.md
git commit -m "merge: add build scripts"

git remote remove build
```

Result:

```text
*   a1b2c3d merge: add build scripts
|\
| * e4f5g6h docs: update build instructions
| * h7i8j9k feat: add Docker build
* k0l1m2n feat: add user authentication
* n3o4p5q fix: resolve login bug
```

Both histories are preserved and merged at a single point.

## Method 2: Subtree Merge (Directory Structure)

This method imports a repository into a subdirectory.

It keeps the imported repo organized and separated from the main repo content.

### When to Use Subtree Merge

Use this method when:

- you want to maintain a clear directory structure
- the imported repo represents a sub-project or module
- you need to organize multiple repos under different paths

### How Subtree Merge Works (Without Squashing)

```bash
# In the target repository
cd /path/to/target-repo

# Add repo as a subtree under a specific path
git subtree add --prefix="libs/module-name" /path/to/source-repo main
```

This preserves all individual commits from the source repo.

### How Subtree Merge Works (With Squashing)

```bash
# Add repo as a subtree with squashed history
git subtree add --prefix="libs/module-name" /path/to/source-repo main --squash
```

This condenses the entire history into a single commit.

### With or Without Squashing?

| Aspect | Without `--squash` | With `--squash` |
|--------|-------------------|----------------|
| Commit count | Full history preserved | Single commit |
| Use case | Important history | Large external libs |
| Clarity | Detailed timeline | Clean summary |

Use squashing when:

- importing third-party libraries
- the commit history is not relevant
- you want to keep the main branch clean

Skip squashing when:

- the commits contain valuable context
- you need to trace bug fixes or features
- the repo is part of active development

### Example: Organizing multiple repos into a monorepo

Suppose you have:

- `web-app` with frontend code
- `api-server` with backend code
- `shared-utils` with common utilities

You want to organize them under a single `monorepo`:

```bash
cd ~/repos/monorepo

# Add frontend under packages/frontend
git subtree add --prefix="packages/frontend" ~/repos/web-app main

# Add backend under packages/backend
git subtree add --prefix="packages/backend" ~/repos/api-server main

# Add utilities under packages/utils with squashed history
git subtree add --prefix="packages/utils" ~/repos/shared-utils main --squash
```

Result:

```text
monorepo/
├── packages/
│   ├── frontend/  (full commit history from web-app)
│   ├── backend/   (full commit history from api-server)
│   └── utils/     (single squashed commit from shared-utils)
```

The commit graph shows separate branches for each subtree:

```text
*   x9y8z7 Add 'packages/utils/' from commit 'a1b2c3'
|\
| * a1b2c3 Squashed 'packages/utils/' content
*   w6v5u4 Add 'packages/backend/' from commit 't3s2r1'
|\
| * t3s2r1 feat: add user routes
| * q0p9o8 fix: database connection
*   n7m6l5 Add 'packages/frontend/' from commit 'k4j3i2'
|\
| * k4j3i2 feat: add login page
| * h1g0f9 feat: setup React app
* e8d7c6 docs: initial monorepo setup
```

## Moving Files After Subtree Merge

After importing a repo with subtree, you may want to reorganize files.

Use `git mv` to preserve history:

```bash
# Remove old version if it exists
git rm old-location/file.txt

# Move files with git mv
git mv source-dir/file.txt target-dir/file.txt

# Move all files in a directory
for item in source-dir/*; do
  git mv "$item" target-dir/
done

# Remove empty directory
rmdir source-dir

# Commit the reorganization
git commit -m "refactor: reorganize project structure"
```

## Using Remote URLs Instead of Local Paths

All examples above use local paths, but you can also use remote URLs:

```bash
# Remote merge with GitHub URL
git remote add source git@github.com:username/repo.git
git fetch source
git merge source/main --allow-unrelated-histories

# Subtree merge with GitHub URL
git subtree add --prefix="vendor/lib" git@github.com:username/lib.git main
```

If you encounter authentication issues with HTTPS, use SSH instead:

```bash
# HTTPS (may require password)
git@github.com:username/repo.git

# SSH (uses SSH keys)
git@github.com:username/repo.git
```

## Comparison Table

| Feature | Remote Merge | Subtree (No Squash) | Subtree (Squashed) |
|---------|--------------|---------------------|-------------------|
| Directory structure | Flat (root) | Organized (subdir) | Organized (subdir) |
| Commit history | Full, interleaved | Full, separate | Single commit |
| Best for | Combining similar projects | Importing modules | Importing large libs |
| Complexity | Simple | Moderate | Simple |

## Troubleshooting

### Error: refusing to merge unrelated histories

Add `--allow-unrelated-histories`:

```bash
git merge source/main --allow-unrelated-histories
```

### Error: Authentication failed

Use SSH instead of HTTPS:

```bash
git@github.com:user/repo.git
```

### Conflict in binary files

Choose one version explicitly:

```bash
git checkout --theirs file.pdf
git add file.pdf
git commit
```

### Subtree command not found

Make sure you are using a recent version of Git:

```bash
git --version
```

`git subtree` is available in Git 1.7.11+.

## Best Practices

Before merging repositories, follow these best practices:

- **Always backup first** using `git clone`
- **Test locally** before pushing to remote
- **Use descriptive commit messages** explaining why you merged
- **Clean up temporary remotes** after merging
- **Document the merge** in your project README

Example cleanup:

```bash
git remote remove temp-remote
```

Example commit message:

```bash
git commit -m "merge: consolidate frontend and backend repos for easier maintenance"
```

## Conclusion

Merging Git repositories while preserving history is straightforward once you understand the two main methods:

- **Remote merge** combines repos at the root level
- **Subtree merge** organizes repos into subdirectories

Choose the method based on your project structure and whether individual commit history matters.

Always test merges locally first, handle conflicts carefully, and document the reasoning behind your merge decisions.
