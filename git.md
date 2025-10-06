# Git Workflow Guide

> **TL;DR:** Work on `cole_main`. Run `./sync-branches.sh` (option 3) weekly. Done.

---

## Setup ✓

- ✅ Git rerere enabled (auto-remembers conflict resolutions)
- ✅ Upstream configured: `wannabespace/conar`
- ✅ Fork: `coleski/conar`
- ✅ Script ready: `./sync-branches.sh`

---

## Your Branch Structure

```
upstream/main (wannabespace/conar)
    ↓
main (your fork, pristine - never touch)
    ↓
cole_main (YOUR ONLY BRANCH - work here)
```

Optional feature branches (only if submitting PRs):
- `mysql_support`
- `mssql_support`
- `private_mode`
- `feat/visualizer-enhancements`
- `feat/table-context-menu`

---

## Daily Workflow

```bash
# Just work on cole_main
git checkout cole_main

# Make changes, commit, push as normal
git add .
git commit -m "feat: cool new thing"
git push
```

**That's it.** Don't overthink it.

---

## Weekly: Sync with Upstream

When upstream updates (weekly/monthly):

**Option 1: Use the script** (recommended)
```bash
./sync-branches.sh
# Choose option 3: Update cole_main
```

**Option 2: Manual**
```bash
# Update main from upstream
git checkout main
git pull upstream main
git push origin main

# Update cole_main
git checkout cole_main
git rebase main
# Resolve conflicts if any (git rerere auto-applies previous fixes)
git push -f origin cole_main
```

---

## Common Scenarios

### Scenario 1: Extract feature for PR to upstream

Started work on `cole_main` but now want to submit a PR:

```bash
# Create feature branch from clean main
git checkout main
git pull upstream main
git checkout -b feature-extracted

# Cherry-pick commits from cole_main
git log cole_main --oneline  # Find commit hashes
git cherry-pick abc123 def456 ghi789

# Push and open PR
git push -u origin feature-extracted
# Open PR on GitHub: feature-extracted → wannabespace/conar:main
```

### Scenario 2: Upstream merged your PR

```bash
# Update main (now includes your merged PR)
git checkout main
git pull upstream main
git push origin main

# Delete the merged feature branch
git branch -d feature-xyz
git push origin --delete feature-xyz

# Update cole_main
git checkout cole_main
git rebase main
git push -f origin cole_main
```

### Scenario 3: Update a feature branch

Before submitting a PR, rebase on latest main:

```bash
git checkout feature-xyz
git rebase main
# Resolve conflicts if any
git push -f origin feature-xyz
```

### Scenario 4: Conflict during rebase

```bash
# You'll see: CONFLICT (content): Merge conflict in some-file.js

# Fix the conflict in your editor, then:
git add some-file.js
git rebase --continue

# Git rerere remembers this - won't ask again!
git push -f origin cole_main
```

### Scenario 5: Delete unused feature branches

If you're not submitting PRs, clean up:

```bash
# Delete locally
git branch -D mysql_support mssql_support private_mode

# Delete from your fork
git push origin --delete mysql_support
git push origin --delete mssql_support
git push origin --delete private_mode
```

---

## The Sync Script

Run: `./sync-branches.sh`

Options:
1. **Sync main with upstream** - Updates your main from wannabespace/conar
2. **Update all feature branches** - Rebases each feature branch on main
3. **Update cole_main** ⬅ **Most common** - Rebases cole_main on main
4. **Full sync** - All of the above

Edit the script to add/remove feature branches:
```bash
FEATURE_BRANCHES=(
  "mysql_support"
  "mssql_support"
  "private_mode"
  "feat/visualizer-enhancements"
  "feat/table-context-menu"
)
```

---

## Rules to Stay Sane

1. ✅ **Work on `cole_main`** - Your main development branch
2. ✅ **Never commit to `main`** - It mirrors upstream only
3. ✅ **Force push after rebase** - Always safe after rebasing
4. ✅ **Run sync weekly** - Stay up to date with upstream
5. ✅ **Feature branches optional** - Only needed for PRs

---

## Emergency: Reset Everything

If things get really messed up:

```bash
# Reset main to upstream
git checkout main
git fetch upstream
git reset --hard upstream/main
git push -f origin main

# Rebuild cole_main from scratch
git checkout main
git checkout -B cole_main

# Optionally merge feature branches back
git merge mysql_support --no-ff
git merge private_mode --no-ff

# Force push
git push -f origin cole_main
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Daily work | `git checkout cole_main` |
| Update from upstream | `./sync-branches.sh` (option 3) |
| Create PR branch | `git checkout main && git checkout -b feature-name` |
| Merge feature to cole_main | `git checkout cole_main && git merge feature-name` |
| Update feature branch | `git checkout feature-name && git rebase main` |
| Cherry-pick for PR | `git cherry-pick abc123 def456` |

---

## FAQ

**Q: Should I use feature branches?**
- Only if submitting PRs to upstream
- Otherwise, just work on `cole_main`

**Q: Will I lose work when rebasing?**
- No, git rerere remembers your conflict resolutions
- Your commits are safe

**Q: When should I force push?**
- After rebasing any branch
- Always safe on `cole_main` (your branch)
- Never force push shared branches

**Q: What if I want to contribute a feature upstream later?**
- Cherry-pick commits from `cole_main` into a new feature branch
- See "Scenario 1: Extract feature for PR"

**Q: What if upstream adds breaking changes?**
- Update `main` first
- Rebase `cole_main` - fix conflicts once
- Git rerere remembers the fix

**Q: Can I just never sync with upstream?**
- Yes, but you'll miss bug fixes and improvements
- Recommend syncing monthly at minimum

---

## Your Actual Daily Commands

```bash
# Morning
git checkout cole_main
git pull

# Code all day...

# Evening
git add .
git commit -m "feat: did some stuff"
git push

# Friday (weekly sync)
./sync-branches.sh  # option 3
```

**That's your entire git workflow.**
