#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-devespritThem/BTPGo-IA}"
BRANCH="${2:-main}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required: https://cli.github.com/" >&2
  exit 1
fi

read -r -d '' BODY <<'JSON'
{
  "required_status_checks": {"strict": true, "contexts": []},
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "allow_deletions": false,
  "allow_force_pushes": false,
  "required_linear_history": true,
  "required_conversation_resolution": true
}
JSON

gh api \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  repos/$REPO/branches/$BRANCH/protection \
  -d "$BODY"

echo "Branch protection applied on $REPO:$BRANCH"

