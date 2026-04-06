#!/usr/bin/env bash
set -euo pipefail

# Release script — determines version bump from conventional commits,
# merges dev into main, runs npm version, pushes with tags.
#
# Usage:
#   ./scripts/release.sh          # auto-detect bump (patch or minor)
#   ./scripts/release.sh patch    # force patch
#   ./scripts/release.sh minor    # force minor
#   ./scripts/release.sh major    # force major

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

die() { echo -e "${RED}Erreur: $1${NC}" >&2; exit 1; }

# Must be in repo root
cd "$(git rev-parse --show-toplevel)"

# Working tree must be clean
[[ -z "$(git status --porcelain)" ]] || die "Working tree pas propre. Commit ou stash d'abord."

# Determine last tag (or initial commit if no tags)
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [[ -n "$LAST_TAG" ]]; then
  RANGE="${LAST_TAG}..dev"
  echo -e "Dernier tag: ${GREEN}${LAST_TAG}${NC}"
else
  RANGE="dev"
  echo -e "${YELLOW}Aucun tag existant — première release.${NC}"
fi

# Auto-detect bump from conventional commits
if [[ -n "${1:-}" ]]; then
  BUMP="$1"
  echo -e "Bump forcé: ${GREEN}${BUMP}${NC}"
else
  FEAT_COUNT=$(git log "$RANGE" --oneline --grep="^feat" | wc -l | tr -d ' ')
  FIX_COUNT=$(git log "$RANGE" --oneline --grep="^fix" | wc -l | tr -d ' ')
  BREAKING=$(git log "$RANGE" --oneline --grep="BREAKING CHANGE" | wc -l | tr -d ' ')

  if [[ "$BREAKING" -gt 0 ]]; then
    BUMP="major"
  elif [[ "$FEAT_COUNT" -gt 0 ]]; then
    BUMP="minor"
  else
    BUMP="patch"
  fi

  echo -e "Commits depuis ${LAST_TAG:-début}: ${GREEN}${FEAT_COUNT} feat${NC}, ${GREEN}${FIX_COUNT} fix${NC}"
  echo -e "Bump auto-détecté: ${GREEN}${BUMP}${NC}"
fi

# Show what will be released
echo ""
echo -e "${YELLOW}Commits à inclure:${NC}"
git log "$RANGE" --oneline
echo ""

# Confirm
read -rp "Continuer avec npm version ${BUMP}? [o/N] " REPLY
[[ "$REPLY" =~ ^[oOyY]$ ]] || { echo "Annulé."; exit 0; }

# Merge dev into main
echo -e "\n${GREEN}Merge dev → main...${NC}"
git checkout main
git merge dev --no-edit

# Bump version (updates package.json, creates commit + tag)
echo -e "${GREEN}npm version ${BUMP}...${NC}"
npm version "$BUMP" --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")

# Stamp version into docs HTML + regenerate PDFs
echo -e "${GREEN}Docs: stamp v${NEW_VERSION} + PDFs...${NC}"
node docs/generate-pdfs.mjs

git add package.json package-lock.json public/docs/
git commit -m "release: v${NEW_VERSION}"
git tag "v${NEW_VERSION}"

# Push (explicit tag push — --follow-tags only pushes annotated tags)
echo -e "${GREEN}Push main + tags...${NC}"
git push origin main
git push origin "v${NEW_VERSION}"

# Back to dev, sync version
echo -e "${GREEN}Sync version sur dev...${NC}"
git checkout dev
git merge main --no-edit
git push origin dev

echo -e "\n${GREEN}Release v${NEW_VERSION} terminée.${NC}"
