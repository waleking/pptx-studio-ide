# Git Clone Depth: Shallow vs Full Clones

## Overview

When cloning large repositories like VS Code, you can choose between a **shallow clone** (faster, smaller) or a **full clone** (complete history).

## Shallow Clone

A shallow clone downloads only recent commits, not the full history.

```bash
# Clone with depth=1 (only latest commit)
git clone --depth 1 https://github.com/microsoft/vscode.git

# Clone with depth=10 (last 10 commits)
git clone --depth 10 https://github.com/microsoft/vscode.git
```

### Advantages
- **Fast**: Downloads much less data (minutes vs hours for VS Code)
- **Small**: `.git` folder is ~27MB instead of ~2GB+
- **Sufficient for development**: You have all the code, just not the history

### Limitations
- **Cannot push to a different remote**: Parent commits reference objects that don't exist locally
- **Limited git log**: Only see commits within the depth
- **Some git operations fail**: `git blame` may be incomplete, `git bisect` limited

### How to Check if Shallow
```bash
git rev-parse --is-shallow-repository
# Returns: true or false
```

## Unshallowing (Converting to Full Clone)

When you need full history (e.g., to push to your own fork):

```bash
# Fetch all history from origin
git fetch --unshallow origin

# Or from a specific remote
git fetch --unshallow upstream
```

### What Happens During Unshallow
1. Git downloads all missing commit objects
2. Removes the `.git/shallow` file
3. Repository becomes a full clone
4. You can now push to any remote

### Time and Size Impact
For VS Code:
- **Download time**: 5-15 minutes (depends on network)
- **Size increase**: `.git` grows from ~27MB to ~2GB+

## Best Practices for Forks

### Option 1: Shallow Clone + Unshallow Later (Recommended)
```bash
# Initial fast clone
git clone --depth 1 https://github.com/microsoft/vscode.git pptx-studio-ide
cd pptx-studio-ide

# Make your changes...

# When ready to push to your fork
git remote add upstream https://github.com/microsoft/vscode.git
git remote set-url origin git@github.com:YOUR_USERNAME/pptx-studio-ide.git
git fetch --unshallow upstream
git push -u origin main
```

### Option 2: Full Clone from Start
```bash
# Takes longer but no issues later
git clone https://github.com/microsoft/vscode.git pptx-studio-ide
```

### Option 3: Orphan Branch (Fresh Start)
If you don't need VS Code history in your fork:
```bash
# Create a new branch with no history
git checkout --orphan fresh-start
git add -A
git commit -m "Initial commit: PPTX Studio IDE based on VS Code"
git branch -M main
git push -u origin main --force
```

## Common Errors

### "remote unpack failed: index-pack failed"
**Cause**: Pushing from shallow clone - missing parent objects
**Fix**: `git fetch --unshallow upstream`

### "fatal: refusing to merge unrelated histories"
**Cause**: Trying to merge shallow clone with different remote
**Fix**: Add `--allow-unrelated-histories` flag (use carefully)

## References

- [Git Documentation: Shallow Clones](https://git-scm.com/docs/shallow)
- [GitHub: Working with Forks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks)
