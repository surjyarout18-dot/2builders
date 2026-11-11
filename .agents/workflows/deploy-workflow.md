# Deploy Workflow

Zero-downtime deployment pipeline for Vercel and production CDN environments.

## Associated Skills
- `deploy-to-vercel`
- `vercel-cli-with-tokens`
- `vercel-optimize`
- `git-commit-formatter`
- `finishing-a-development-branch`

## Workflow Steps

1. **Pre-Deployment Clean Build**:
   ```powershell
   npm --prefix frontend run build
   ```
   - Confirms static assets in `frontend/dist` are ready.

2. **Branch Synchronization & Git Formatting**:
   - Ensure changes are committed on branch `robin`.
   - Format commit messages with Conventional Commits via `git-commit-formatter`:
     - `feat: ...` for new capabilities
     - `fix: ...` for UI/UX bug fixes
     - `refactor: ...` for layout improvements

3. **Remote Push**:
   ```powershell
   git push origin robin
   ```

4. **Vercel Deployment Verification**:
   - Verify automated CI/CD build on Vercel.
   - Run post-deploy smoke checks on target URL: `https://2builders.vercel.app/`
