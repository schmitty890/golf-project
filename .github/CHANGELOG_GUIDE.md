# CHANGELOG Update Guide

## Overview
This project uses a Git pre-commit hook to ensure that CHANGELOG.md files are updated with every commit. This helps maintain accurate project history and makes it easier to track changes over time.

## How It Works

When you make a commit, the pre-commit hook automatically:

1. **Detects which files were changed**
2. **Determines which CHANGELOG.md needs updating:**
   - Changes in `server/` → update `server/CHANGELOG.md`
   - Changes in `client/` → update `client/CHANGELOG.md`
   - Changes in root files → update `CHANGELOG.md`
3. **Blocks the commit** if the appropriate CHANGELOG wasn't updated
4. **Provides helpful guidance** on what to add

## Workflow Example

### Step 1: Make Your Changes
```bash
# Example: Edit a server file
vim server/routes/strings.js
```

### Step 2: Stage Your Changes
```bash
git add server/routes/strings.js
```

### Step 3: Try to Commit
```bash
git commit -m "Add validation to strings endpoint"
```

### Step 4: Hook Detects Missing CHANGELOG
```
⚠  Server files were modified but server/CHANGELOG.md was not updated

✗ CHANGELOG.md update required!

Files to update:
  → server/CHANGELOG.md
```

### Step 5: Update the CHANGELOG
Edit `server/CHANGELOG.md` and add your changes:

```markdown
## [1.2.0] - 2025-11-23

### Added
- Input validation for strings endpoint to prevent empty submissions

### Changed
- Enhanced error messages in POST /api/strings route
```

### Step 6: Stage the CHANGELOG
```bash
git add server/CHANGELOG.md
```

### Step 7: Commit Successfully
```bash
git commit -m "Add validation to strings endpoint"
# ✓ CHANGELOG.md files updated!
# ✓ Pre-commit checks passed
```

## CHANGELOG Format

Follow the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:

```markdown
## [Version] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Vulnerability fixes
```

## Which CHANGELOG to Update?

| Files Changed | CHANGELOG to Update |
|--------------|-------------------|
| `server/**/*.js` | `server/CHANGELOG.md` |
| `client/src/**/*` | `client/CHANGELOG.md` |
| Root files, docs | `CHANGELOG.md` |
| Multiple areas | Update all relevant CHANGELOGs |

## Tips

### 1. Update CHANGELOG Before Committing
Make it a habit to update the CHANGELOG as you work, not after.

### 2. Be Descriptive
Instead of:
```markdown
### Changed
- Updated API
```

Write:
```markdown
### Changed
- Enhanced POST /api/strings endpoint with request validation
- Added error handling for database connection failures
```

### 3. Group Related Changes
If your commit includes multiple related changes, group them under appropriate sections:

```markdown
## [1.2.0] - 2025-11-23

### Added
- User authentication middleware
- JWT token generation utilities

### Changed
- Updated user routes to require authentication
- Enhanced security headers in Express configuration

### Fixed
- Fixed CORS issue preventing client authentication
```

### 4. Version Numbers
Follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features (backwards compatible)
- **PATCH** (0.0.1): Bug fixes (backwards compatible)

## Bypassing the Hook (Emergency Only)

If you absolutely must commit without updating the CHANGELOG (not recommended):

```bash
git commit --no-verify -m "Emergency hotfix"
```

⚠️ **Warning:** Only use `--no-verify` in emergency situations. Always update the CHANGELOG as soon as possible afterward.

## Troubleshooting

### Hook Not Running?
Check if the hook is executable:
```bash
ls -la .git/hooks/pre-commit
```

If not executable:
```bash
chmod +x .git/hooks/pre-commit
```

### Hook Running on Wrong Files?
The hook intelligently detects:
- Server changes: any file in `server/` (except `server/CHANGELOG.md`)
- Client changes: any file in `client/` (except `client/CHANGELOG.md`)
- Root changes: root-level files (except `.git/` and `CHANGELOG.md`)

## Best Practices

1. **Update as you code** - Don't wait until commit time
2. **Be specific** - Describe what changed and why
3. **Update version numbers** - Increment appropriately
4. **Keep dates current** - Use today's date for new entries
5. **Reference issues/PRs** - Link to related issues when applicable

## Example Commit Flow

```bash
# 1. Make changes
vim server/routes/strings.js

# 2. Update CHANGELOG immediately
vim server/CHANGELOG.md

# 3. Stage everything
git add server/routes/strings.js server/CHANGELOG.md

# 4. Commit (hook will pass)
git commit -m "Add input validation to strings endpoint"

# 5. Success!
```

## Questions?

If you have questions about:
- **CHANGELOG format**: See [keepachangelog.com](https://keepachangelog.com/)
- **Version numbers**: See [semver.org](https://semver.org/)
- **Git hooks**: See `.git/hooks/pre-commit`
