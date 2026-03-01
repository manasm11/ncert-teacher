---
name: fix-pr
description: Fix CI/CD pipeline failures and merge conflicts in a GitHub pull request, then push fixes until the PR is green and mergeable.
argument-hint: "[PR number]"
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Agent
---

# Fix PR — Resolve CI/CD Failures & Merge Conflicts

You are tasked with fixing **all** CI/CD pipeline failures and merge conflicts for PR #$ARGUMENTS in this repository.

## Context

- Repository: !`git remote get-url origin 2>/dev/null`
- Current branch: !`git branch --show-current`
- Default branch: !`gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null || echo main`

## Step-by-step procedure

### 1. Fetch PR details

```
gh pr view $ARGUMENTS --json number,title,headRefName,baseRefName,mergeable,mergeStateStatus,statusCheckRollup
```

Save the **head branch name** and **base branch name** for later use.

### 2. Check out the PR branch

```
gh pr checkout $ARGUMENTS
```

Make sure the local branch is up to date with the remote.

### 3. Resolve merge conflicts (loop until clean)

- Attempt to merge the base branch into the head branch: `git merge <base-branch>`
- If there are conflicts:
  - Read each conflicted file.
  - Understand both sides of the conflict by examining the PR's intent and the base branch changes.
  - Resolve conflicts intelligently — preserve the intent of both the PR and the base branch changes.
  - Stage resolved files with `git add`.
  - Complete the merge with `git commit`.
- Repeat until `git merge <base-branch>` reports "Already up to date."

### 4. Identify CI/CD failures

```
gh pr checks $ARGUMENTS
```

For each failing check:
- Read the failure logs: `gh run view <run-id> --log-failed`
- Identify the root cause (lint errors, type errors, test failures, build errors, etc.)

### 5. Fix CI/CD failures (loop until all pass)

For each failure:
1. Understand the error from the logs.
2. Find the relevant source files using Grep/Glob.
3. Read the files to understand context.
4. Apply the fix using Edit.
5. If possible, verify locally:
   - Lint: `npm run lint`
   - Build: `npm run build`
   - Tests: `npm test` (if available)

### 6. Commit and push fixes

- Stage only the files you changed.
- Write a clear commit message describing the fixes.
- Push to the remote branch: `git push`

### 7. Verify — THE CRITICAL LOOP

After pushing, **wait for CI to run** and then re-check:

```
gh pr checks $ARGUMENTS --watch
```

Also re-check mergeability:

```
gh pr view $ARGUMENTS --json mergeable,mergeStateStatus
```

**If any check still fails or there are new merge conflicts, go back to step 3 and repeat.**

Continue this loop until:
- ALL CI/CD checks pass (green)
- There are NO merge conflicts
- The PR is in a mergeable state

### 8. Final summary

Once everything is green, report:
- What merge conflicts were resolved and how
- What CI/CD failures were fixed and what changes were made
- The final status of all checks
- The PR URL for the user to review

## Important rules

- NEVER force-push. Always use regular `git push`.
- NEVER skip pre-commit hooks (`--no-verify`).
- NEVER modify CI/CD configuration files (e.g., `.github/workflows/`) unless the failure is clearly caused by a bug in the workflow file itself.
- If a failure is caused by a flaky test (passes locally, fails in CI with no code-related reason), note it in the summary but do not endlessly retry.
- If after 3 full cycles of fix-push-check the same error persists, stop and report the issue to the user instead of looping forever.
- Always ask the user before making architectural or behavioral changes to resolve failures — only make minimal, targeted fixes.
