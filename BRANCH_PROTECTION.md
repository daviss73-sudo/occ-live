# OCC Live — GitHub Branch Protection Configuration

Apply these settings to the `main` branch in GitHub Settings > Branches > Branch protection rules.

## Required Settings

| Setting | Value |
|---|---|
| Require a pull request before merging | ✓ |
| Require approvals | 1+ |
| Require status checks to pass before merging | ✓ |
| Required status checks | `Safety & Consent Tests`, `Production Build` |
| Require conversation resolution before merging | ✓ |
| Require signed commits | Recommended |
| Do not allow bypassing the above settings | ✓ |
| Restrict who can push to matching branches | ✓ |
| Allow force pushes | ✗ (disabled) |
| Allow deletions | ✗ (disabled) |

## Required Status Checks

These checks must pass before any PR can be merged to `main`:

1. **Safety & Consent Tests** — Runs `npm run test:safety` (34 assertions covering all consent/interaction safety rules)
2. **Production Build** — Verifies TypeScript compiles and Vite builds successfully

## Production Environment

Configure a GitHub Environment named `production` with:

- Required reviewers (project owner must approve)
- Deployment branch restriction: `main` only
- Wait timer: optional (gives time to abort if needed)

## Deployment Flow

```
Developer (Kiro workspace)
        ↓
Development branch
        ↓
Pull Request
        ↓
Automated safety tests (must pass)
        ↓
Code review (must approve)
        ↓
Merge to main
        ↓
Production environment (approval required)
        ↓
OCC LIVE (production)
```

## What This Prevents

- Direct pushes to main without review
- Deployment of code that breaks consent/safety
- Force-push history rewriting
- Unreviewed code reaching production
- Safety tests being skipped or ignored
