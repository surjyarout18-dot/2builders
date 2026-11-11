# 2builders Workspace Directives & Skill Orchestration

Welcome to **2builders** — the open-source, 100% Free 2D Floor Plan to 3D Building & Vastu Engine.

---

## 1. Core Operating Directives

- **100% Free Forever**: All features, exports, tools, and downloads are completely free. Never introduce pricing tiers, dollar amounts, subscription forms, or checkout paywalls.
- **Git Branch Protocol**: NEVER commit or push directly to `main`. Always work on, commit to, and push to the **`robin`** branch (`git push origin robin`).
- **Design Philosophy**: Adhere to the floordesign.ai architectural standard: precision CAD dark mode, sleek glassmorphism, responsive non-overlapping toolbars, sub-millimeter geometry, and high-contrast typography.

---

## 2. Skill Orchestration Matrix

Antigravity automatically orchestrates installed skills based on task type:

- **Frontend & UI (`/frontend-design`, `/fskills`)**:
  - `frontend-design`, `web-design-guidelines`, `vercel-react-best-practices`, `vercel-composition-patterns`.
  - Guidelines: Ground designs in architectural aesthetics, maintain strict container isolation, and prevent toolbar collision.
- **Debugging & Error Diagnostics**:
  - `systematic-debugging`, `chrome-devtools`, `memory-leak-debugging`, `debug-optimize-lcp`.
  - Guidelines: Evidence before claims; formulate falsifiable hypotheses before modifying code.
- **Testing & Quality Assurance**:
  - `test-driven-development`, `webapp-testing`, `playwright-cli`, `verification-before-completion`.
  - Guidelines: Run `npm run build` and ensure exit code 0 before asserting completion.
- **Security & Access**:
  - `firebase-security-rules-auditor`, `firestore-rules-creation`, `credentials`, `autofix`.
- **DevOps & Releases**:
  - `deploy-to-vercel`, `vercel-cli-with-tokens`, `git-commit-formatter`, `finishing-a-development-branch`.

### Domain Gating Rules
- **Bioinformatics & Science skills**: Strictly INACTIVE in this workspace.
- **Native mobile (Android/Xcode)**: Strictly INACTIVE in this workspace.
- **Documents & slides (Canva/Docx/Pptx)**: Active only when explicitly generating export documents.

---

## 3. Standard Workflows Reference

The workspace includes verified workflows in `.agents/workflows/`:
- `build-workflow.md`: Clean, compile, type-check, and bundle verification.
- `debug-workflow.md`: Root-cause diagnosis and regression fixes.
- `test-workflow.md`: Geometry math validation and visual testing.
- `review-workflow.md`: Pre-commit inspection and policy verification.
- `deploy-workflow.md`: Vercel zero-downtime deployment.
