---
title: "The Agent Skills I Use, With Links to Every Repo"
description: "A list of the Claude Code agent skills I use day to day, grouped by what they do, with GitHub links to each source."
date: 2026-10-26
tag: "Claude Code, Agent Skills, AI"
lang: en-US
---

Agent skills are small folders with a `SKILL.md` file. Claude Code reads the file and loads the instructions when a task matches. I use a handful of them every day, and a few more sit installed for the odd job. This post groups them by what they are for, with one link to the repository that ships each group.

| Skill | Group | What it does |
|---|---|---|
| humanizer | Writing | Rewrites text so it reads less like a chatbot wrote it |
| lieflat-less-ai-tone | Writing | Rewrites only the AI-style patterns on its list, leaving the rest word for word |
| humanizer-zh-tw | Writing | Polishes Chinese text, removing filler and formulaic phrasing while keeping the facts and voice |
| ponytail | Code | Pushes toward the smallest working change, with review, audit, debt, gain, and help modes |
| deep-research | Academic | Multi-agent research pipeline, from a quick brief to a systematic review |
| academic-paper | Academic | Paper planning, revision, abstracts, literature reviews, citation checks, and AI disclosure |
| academic-paper-reviewer | Academic | Simulated peer review from a panel of reviewer personas |
| academic-pipeline | Academic | Runs research, writing, review, and revision in order |
| sr-screener | Academic | Screens study records against eligibility criteria |
| i-have-adhd | Output | Shapes answers for readers with ADHD |
| answer-me-with-html | Output | Turns an answer into a one-page visual HTML explainer |
| graphify | Understanding | Builds a knowledge graph from code, docs, papers, images, and videos |
| watch | Video | Downloads a video, extracts frames, and pulls the transcript |

## Writing and editing

humanizer rewrites text so it reads less like a chatbot wrote it. It is the skill behind the writing pass on this site.

[![humanizer](https://img.shields.io/badge/humanizer-GitHub-181717?style=for-the-badge&logo=github&logoColor=fff)](https://github.com/blader/humanizer)

lieflat-less-ai-tone works on Chinese prose. It finds AI writing traces from an explicit list of rules and rewrites only the matches, leaving every other sentence word for word.

[![lieflat-less-ai-tone](https://img.shields.io/badge/lieflat--less--ai--tone-GitHub-181717?style=for-the-badge&logo=github&logoColor=fff)](https://github.com/larashero3-dotcom/lieflat-less-ai-tone)

humanizer-zh-tw polishes Chinese articles, reviews, and documents. It removes filler, repetition, and formulaic phrasing, and keeps the facts, the stated confidence, and the author's voice. It edits text you already have. It does not judge who wrote the text.

[![Humanizer--zh--TW](https://img.shields.io/badge/Humanizer--zh--TW-GitHub-181717?style=for-the-badge&logo=github&logoColor=fff)](https://github.com/kevintsai1202/Humanizer-zh-TW)

## Keeping code small

The ponytail plugin is built around one idea: write the smallest working change. The core mode asks whether a feature needs to exist before writing it. The rest of the plugin reviews a diff for over-engineering, audits a whole repository for things to delete, collects the shortcuts it leaves behind into a ledger, shows the measured impact of the mode, and includes a quick reference.

[![ponytail](https://img.shields.io/badge/ponytail-GitHub-181717?style=for-the-badge&logo=github&logoColor=fff)](https://github.com/DietrichGebert/ponytail)

## Academic research and writing

One repository ships five skills, one for each stage of a paper. deep-research runs a multi-agent research pipeline with eight modes, from a quick brief to a systematic review. academic-paper covers planning, revision, abstracts, literature reviews, citation checks, and AI disclosure. academic-paper-reviewer simulates a peer review from a panel of reviewer personas. academic-pipeline runs research, writing, review, and revision in order. sr-screener screens study records against eligibility criteria for systematic and scoping reviews.

[![academic-research-skills](https://img.shields.io/badge/academic--research--skills-GitHub-181717?style=for-the-badge&logo=github&logoColor=fff)](https://github.com/Imbad0202/academic-research-skills)

## Output that fits the reader

i-have-adhd shapes answers for readers with ADHD. It leads with the next action, numbers multi-step work, and keeps tangents out.

[![i-have-adhd](https://img.shields.io/badge/i--have--adhd-GitHub-181717?style=for-the-badge&logo=github&logoColor=fff)](https://github.com/ayghri/i-have-adhd)

answer-me-with-html turns an answer into a one-page visual HTML explainer. The model writes a short Markdown draft, and a bundled CLI builds the page. It suits flows, comparisons, diagnoses, and anything with steps or branches.

[![answer-me-with-html](https://img.shields.io/badge/answer--me--with--html-GitHub-181717?style=for-the-badge&logo=github&logoColor=fff)](https://github.com/QingYunA/answer-me-with-html)

## Understanding code and projects

graphify turns any input into a persistent knowledge graph. The input can be code, docs, papers, images, or videos. It finds the central nodes and the communities in the graph, and it gives you tools to query the graph, trace paths between items, and explain them. It is the first thing I reach for when a codebase is too big to hold in my head.

[![graphify](https://img.shields.io/badge/graphify-GitHub-181717?style=for-the-badge&logo=github&logoColor=fff)](https://github.com/Graphify-Labs/graphify)

## Video

watch takes a video URL or a local file, downloads it, extracts frames with ffmpeg, and pulls the transcript so the agent can answer questions about the video.

[![claude-video](https://img.shields.io/badge/claude--video-GitHub-181717?style=for-the-badge&logo=github&logoColor=fff)](https://github.com/bradautomates/claude-video)

Skills are cheap to try. If one looks useful, install it, read its `SKILL.md`, and see whether the instructions match how you work.
