# Review Workflow

Pre-commit code inspection, security rule auditing, and CodeRabbit review verification.

## Associated Skills
- `code-review`
- `receiving-code-review`
- `requesting-code-review`
- `autofix`
- `firebase-security-rules-auditor`

## Workflow Steps

1. **Diff & Change Inspection**:
   - Run `git diff` and `git status` to review modified files.
   - Ensure no unintended temporary files or secrets are staged.

2. **Policy Compliance Check**:
   - Zero price strings: Ensure no dollar amounts, pricing plans, or subscription paywalls exist.
   - Branch enforcement: Confirm current git branch is `robin` (never `main`).

3. **Code Quality & Dead Code Audit**:
   - Verify all React hooks follow dependency rules.
   - Clean up unused imports, dead CSS classes, or redundant inline styles.

4. **Security & Data Sanitization**:
   - Audit any dynamic input or JSON parsing routines.
   - Verify file upload handlers sanitize MIME types (PNG, JPG, WEBP, PDF only).
