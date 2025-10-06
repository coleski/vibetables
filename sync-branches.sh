#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Git Branch Sync Tool ===${NC}\n"

# Function to sync main with upstream
sync_main() {
  echo -e "${GREEN}→ Syncing main with upstream...${NC}"
  git checkout main
  git pull upstream main
  git push origin main
  echo -e "${GREEN}✓ Main synced${NC}\n"
}

# Function to update a single feature branch
update_feature_branch() {
  local branch=$1
  echo -e "${BLUE}→ Updating $branch...${NC}"
  git checkout "$branch"

  if git rebase main; then
    echo -e "${GREEN}✓ $branch rebased successfully${NC}"
    read -p "Push with force? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      git push -f origin "$branch"
      echo -e "${GREEN}✓ $branch pushed${NC}\n"
    fi
  else
    echo -e "${YELLOW}⚠ Conflicts in $branch - resolve and run 'git rebase --continue'${NC}\n"
    return 1
  fi
}

# Function to update cole_main by rebasing
update_cole_main() {
  echo -e "${GREEN}→ Updating cole_main (preserving history)...${NC}"
  git checkout cole_main

  if git rebase main; then
    echo -e "${GREEN}✓ cole_main rebased successfully${NC}"
    read -p "Force push cole_main? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      git push -f origin cole_main
      echo -e "${GREEN}✓ cole_main pushed${NC}\n"
    fi
  else
    echo -e "${YELLOW}⚠ Conflicts in cole_main - resolve and run 'git rebase --continue'${NC}\n"
    return 1
  fi
}

# Main menu
echo "What would you like to do?"
echo "1) Sync main with upstream"
echo "2) Update all feature branches (rebase on main)"
echo "3) Update cole_main (rebase on main)"
echo "4) Full sync (all of the above)"
echo "5) Exit"
echo
read -p "Choose (1-5): " choice

case $choice in
  1)
    sync_main
    ;;
  2)
    sync_main

    # Your feature branches (edit this list as needed)
    FEATURE_BRANCHES=(
      "mysql_support"
      "mssql_support"
      "private_mode"
      "feat/visualizer-enhancements"
      "feat/table-context-menu"
    )

    for branch in "${FEATURE_BRANCHES[@]}"; do
      # Check if branch exists
      if git show-ref --verify --quiet refs/heads/"$branch"; then
        update_feature_branch "$branch" || break
      else
        echo -e "${YELLOW}⚠ Branch $branch doesn't exist locally, skipping${NC}"
      fi
    done
    ;;
  3)
    sync_main
    update_cole_main
    ;;
  4)
    sync_main
    echo -e "${YELLOW}Update feature branches first, then cole_main${NC}"
    ;;
  5)
    echo "Bye!"
    exit 0
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo -e "\n${GREEN}=== Done! ===${NC}"
