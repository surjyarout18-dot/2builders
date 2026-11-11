# Build Workflow

This workflow standardizes application builds, type-checking, and asset bundle verification.

## Steps

1. **Clean & Dependency Sync**:
   ```powershell
   cd frontend
   npm install
   ```

2. **Full Static Type-Check & Production Compilation**:
   ```powershell
   npm run build
   ```
   - Invokes `tsc -b` to enforce TypeScript strictness across all types and components.
   - Runs `vite build` to optimize and minify assets.

3. **Bundle Size & Chunk Verification**:
   - Verify that chunks are appropriately split.
   - Ensure vendor chunks (Three.js, Lucide, React) are loaded without memory leaks.

4. **Exit Verification**:
   - Exit code must be 0 before proceeding to testing, commit, or deployment.
