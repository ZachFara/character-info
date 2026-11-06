# 0007. GitHub workflow

## Context

Work is done through branches and pull requests, and `main` must only receive changes that pass the check.

## Decision

CI is one workflow with one job named `check`. It installs with `npm ci`, runs `make check`, and on pull requests also runs commitlint over the pull request's commits. The `main` branch is to be protected: pull requests required, the `check` job required, force pushes and deletion disallowed, rules applied to administrators. The pull request template has What changed, Why, and How it was tested.

## Consequences

- The repo must be public or the account on GitHub Pro for protection to be enforceable. Until that is resolved, this decision is only partly in effect. See Open Questions in PROGRESS.md.
- The job name `check` is what branch protection refers to. Renaming it breaks the requirement.
