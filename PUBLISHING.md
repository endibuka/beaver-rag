# Publishing to npm

This guide walks you through publishing the RAG System package to npm.

## Prerequisites

1. **npm account**: Create one at [npmjs.com/signup](https://www.npmjs.com/signup)
2. **Git repository**: Push your code to GitHub (or other Git host)
3. **Completed package.json**: Ensure all fields are filled

## Step 1: Update package.json

Edit [package.json](package.json) and update these fields:

```json
{
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/RAG-System"
  }
}
```

**Important:** Also check if the package name `beaver-rag` is available on npm:
- Visit: https://www.npmjs.com/package/beaver-rag
- If it's taken, change the name in package.json to something unique like `@yourusername/beaver-rag`

## Step 2: Verify Package Name Availability

```bash
npm view beaver-rag
```

If it returns "npm ERR! 404", the name is available. If it shows package info, the name is taken.

**Alternative naming options:**
- `@yourusername/beaver-rag` (scoped package)
- `beaver-rag-ts`
- `typescript-beaver-rag`
- `your-beaver-rag`

## Step 3: Build and Test

Make sure everything builds and tests pass:

```bash
# Install dependencies
bun install

# Type check
bun run typecheck

# Lint
bun run lint

# Run tests
bun test

# Build the package
bun run build
```

Verify the `dist/` directory contains:
- `index.js` (CJS)
- `index.mjs` (ESM)
- `index.d.ts` (TypeScript types)

## Step 4: Test Locally

Test your package locally before publishing:

```bash
# Create a tarball
npm pack

# This creates beaver-rag-0.1.0.tgz
```

In a separate test project:

```bash
mkdir test-beaver-rag
cd test-beaver-rag
npm init -y
npm install ../RAG-System/beaver-rag-0.1.0.tgz

# Test import
node -e "const rag = require('beaver-rag'); console.log(rag)"
```

## Step 5: Create .npmignore (Optional)

Create `.npmignore` to exclude files from the published package:

```
# Source files
src/
tests/

# Config files
.env
.env.example
tsconfig.json
tsup.config.ts
bunfig.toml
eslint.config.js
.prettierrc.json

# Development
docker-compose.yml
examples/
docs/
*.log
.DS_Store

# Git
.git
.gitignore
```

**Note:** Files already listed in `package.json` "files" field will be included regardless.

## Step 6: Login to npm

```bash
npm login
```

Enter your:
- Username
- Password
- Email
- One-time password (if 2FA enabled)

Verify you're logged in:

```bash
npm whoami
```

## Step 7: Publish to npm

### First-time publish:

```bash
npm publish
```

### If using a scoped package (@yourusername/beaver-rag):

```bash
# Public scoped package
npm publish --access public

# Private scoped package (requires paid npm account)
npm publish --access restricted
```

The `prepublishOnly` script will automatically:
1. Build the package (`bun run build`)
2. Run tests (`bun test`)

## Step 8: Verify Publication

1. Visit https://www.npmjs.com/package/beaver-rag (or your package name)
2. Check that all information is correct
3. Test installation:

```bash
npm install beaver-rag
```

## Step 9: Push to Git

```bash
git add .
git commit -m "feat: publish to npm v0.1.0"
git tag v0.1.0
git push origin main --tags
```

## Publishing Updates

### Patch release (0.1.0 → 0.1.1) - Bug fixes

```bash
npm version patch
npm publish
git push --tags
```

### Minor release (0.1.0 → 0.2.0) - New features

```bash
npm version minor
npm publish
git push --tags
```

### Major release (0.1.0 → 1.0.0) - Breaking changes

```bash
npm version major
npm publish
git push --tags
```

## Best Practices

### 1. Semantic Versioning

Follow [semver.org](https://semver.org):
- **Patch** (0.0.x): Bug fixes
- **Minor** (0.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

### 2. Changelog

Maintain a CHANGELOG.md:

```markdown
# Changelog

## [0.1.0] - 2025-12-13

### Added
- Initial release
- OpenAI embeddings support
- PostgreSQL + pgvector storage
- Recursive and fixed-size chunking
- Full test suite
```

### 3. GitHub Release

Create a GitHub release for each version:
1. Go to your repo → Releases → Draft a new release
2. Tag: `v0.1.0`
3. Title: `v0.1.0 - Initial Release`
4. Description: Copy from CHANGELOG.md

### 4. npm Scripts

Your package.json already includes:

```json
{
  "scripts": {
    "prepublishOnly": "bun run build && bun run test"
  }
}
```

This ensures you never publish broken code.

### 5. Beta Releases

For testing before official release:

```bash
# Publish as beta
npm version 0.2.0-beta.0
npm publish --tag beta

# Users install with:
npm install beaver-rag@beta
```

### 6. Deprecate Old Versions

If a version has critical bugs:

```bash
npm deprecate beaver-rag@0.1.0 "Critical bug, please upgrade to 0.1.1"
```

## Troubleshooting

### "You do not have permission to publish"

The package name might be taken or you're not logged in.

**Solution:**
```bash
npm whoami  # Check if logged in
npm view beaver-rag  # Check if name is taken
```

Use a scoped package: `@yourusername/beaver-rag`

### "Package name too similar to existing package"

npm blocks confusingly similar names.

**Solution:** Choose a more unique name.

### Build files not included

**Solution:** Check `package.json` "files" field includes "dist"

### Types not working for consumers

**Solution:** Ensure `package.json` has:
```json
{
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts"
      }
    }
  }
}
```

## Unpublishing (Emergency Only)

**Warning:** Only unpublish within 72 hours of publishing and if no one depends on it.

```bash
# Unpublish specific version
npm unpublish beaver-rag@0.1.0

# Unpublish entire package (dangerous!)
npm unpublish beaver-rag --force
```

**Better alternative:** Deprecate instead:
```bash
npm deprecate beaver-rag@0.1.0 "This version is broken, use 0.1.1"
```

## Summary Checklist

Before publishing:

- [ ] Update package.json author and repository
- [ ] Check package name availability
- [ ] Build passes: `bun run build`
- [ ] Tests pass: `bun test`
- [ ] Test locally with `npm pack`
- [ ] Create .npmignore (optional)
- [ ] Login to npm: `npm login`
- [ ] Publish: `npm publish`
- [ ] Verify on npmjs.com
- [ ] Push to Git with tags
- [ ] Create GitHub release
- [ ] Update CHANGELOG.md

## Post-Publishing

1. **Add npm badge to README.md:**

```markdown
[![npm version](https://badge.fury.io/js/beaver-rag.svg)](https://www.npmjs.com/package/beaver-rag)
[![npm downloads](https://img.shields.io/npm/dm/beaver-rag.svg)](https://www.npmjs.com/package/beaver-rag)
```

2. **Monitor downloads:**
   - Visit: https://npm-stat.com/charts.html?package=beaver-rag

3. **Set up CI/CD** (GitHub Actions):
   - Auto-publish on tag push
   - Run tests on every PR

## Resources

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [npm Package Best Practices](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
