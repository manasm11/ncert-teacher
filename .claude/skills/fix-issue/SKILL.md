---
name: fix-issue
description: Fix a GitHub issue by analyzing the issue, implementing the fix, creating a PR, and watching the pipeline for failures.
argument-hint: "[Issue number]"
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Agent
---

# Fix Issue — Auto-fix GitHub Issues

You are tasked with fixing GitHub issue #$ARGUMENTS in this repository.

## Context

- Repository: !`git remote get-url origin 2>/dev/null`
- Current branch: !`git branch --show-current`
- Default branch: !`gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null || echo main`

## Step-by-step procedure

### 1. Fetch Issue Details

```
gh issue view $ARGUMENTS --json number,title,body,labels,assignees
```

Save the **issue title** and **issue description** for understanding what needs to be fixed.

### 2. Analyze and Understand the Issue

- Read the issue title and description carefully.
- Identify what needs to be fixed or implemented.
- Look for any existing code in the codebase that relates to the issue.

### 3. Create a Branch for the Fix

```
git checkout -b fix/issue-$ARGUMENTS
```

### 4. Implement the Fix

Based on the issue description:
1. Find the relevant source files using Grep/Glob.
2. Read the files to understand the context.
3. Apply the fix using Edit/Write.
4. Verify locally if possible:
   - Lint: `npm run lint`
   - Build: `npm run build`
   - Tests: `npm test` (if available)

### 5. Commit the Changes

- Stage only the files you changed.
- Write a clear commit message describing the fix:
  - Format: `fix: [short description of the fix] (#$ARGUMENTS)`

### 6. Push and Create PR

```
git push -u origin fix/issue-$ARGUMENTS
gh pr create --title "Fix: [issue title]" --body "## Summary
- Fixes issue #$ARGUMENTS

## Changes made
[Description of changes]

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Save the PR number for the next step.

### 7. Watch Pipeline and Fix Failures

```
gh pr checks $ARGUMENTS --watch
```

If there are any CI/CD failures or merge conflicts:

1. Check for merge conflicts:
   ```
   gh pr view $ARGUMENTS --json mergeable,mergeStateStatus
   ```

2. If there are conflicts or failures, use the **fix-pr** skill to resolve them:
   ```
   /fix-pr $PR_NUMBER
   ```

3. Wait for the pipeline to complete after fixes.

### 8. Final Summary

Once everything is green:
- Report the PR URL
- Confirm all checks pass
- Confirm the PR is mergeable

## Important rules

- NEVER force-push. Always use regular `git push`.
- NEVER skip pre-commit hooks (`--no-verify`).
- Always create a new branch for the fix, never commit directly to main.
- If the issue is unclear or requires clarification, ask the user for more details before proceeding.
- If after attempting to fix, the issue cannot be resolved, report the problem to the user.
