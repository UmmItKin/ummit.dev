# AGENTS.md

The conventions, architecture, and gotchas for this repo live in two places:

- @CLAUDE.md holds what applies to every change: commands, the pre-commit hook, writing rules, git.
- `.claude/rules/*.md` holds the conventions by topic. Each file starts with a `paths` list naming the files it applies to.

Read `CLAUDE.md` first. Claude Code loads the rule files on its own when it touches a matching file. Any other agent or tool must read the rule files whose `paths` match the files it is about to create or edit, before editing.

Together they are the single source of truth for how to work here, regardless of which agent or tool you are.
