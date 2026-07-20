#!/bin/sh
# PreToolUse hook — refuses any Bash invocation that pushes to `main`
# directly (any refspec, any force variant) or that bypasses required
# reviews via `gh pr merge --admin`.
#
# Receives the tool invocation as JSON on stdin. Exit 2 = block;
# stderr is shown to the agent so it knows why and can re-route.
#
# Customize the branch name by changing PROTECTED below if your repo's
# trunk isn't `main` (e.g., `master`, `trunk`).

set -eu

PROTECTED=main

input=$(cat)
tool_name=$(printf '%s' "$input" | jq -r '.tool_name // empty')

# Only inspect Bash tool calls; other tools pass through.
[ "$tool_name" = "Bash" ] || exit 0

cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

# Flatten line continuations + collapse whitespace so multi-line
# invocations match cleanly.
flat=$(printf '%s' "$cmd" | tr '\n' ' ' | tr -s ' \t')

block() {
  echo "BLOCKED by .claude/hooks/block-push-to-main.sh:" >&2
  echo "  $1" >&2
  echo "  Command: $flat" >&2
  echo
  echo "All changes to $PROTECTED land via PR + auto-merge. If you" >&2
  echo "genuinely need to push to $PROTECTED (rare), ask the user to" >&2
  echo "remove this hook or temporarily rename it." >&2
  exit 2
}

# 1. Any `git push` whose args mention the protected branch name.
#    Catches: git push origin main / git push -f origin main /
#             git push origin HEAD:main / git push origin :main (delete!) /
#             git push --force-with-lease origin main / etc.
case "$flat" in
  *"git push"*" $PROTECTED"*|*"git push"*":$PROTECTED"*|*"git push"*" $PROTECTED:"*)
    block "Direct push to $PROTECTED is prohibited."
    ;;
esac

# 2. `gh pr merge --admin` bypasses required reviews + checks.
case "$flat" in
  *"gh pr merge"*"--admin"*)
    block "gh pr merge --admin bypasses the review pipeline."
    ;;
esac

# 3. Force-push to the protected branch. Belt-and-suspenders for case 1.
case "$flat" in
  *"git push"*"--force"*"$PROTECTED"*|*"git push"*"-f"*"$PROTECTED"*)
    block "Force push targeting $PROTECTED is prohibited."
    ;;
esac

# 4. Arg-less / refspec-less `git push` while on the protected branch.
#    `git push` with no positional refspec defaults to pushing the
#    current branch — if the current branch is $PROTECTED, that's
#    `git push origin $PROTECTED` in disguise and bypasses case 1's
#    string match. This is the gap that allows a direct-to-main commit
#    when no explicit refspec is given.
case "$flat" in
  git\ push|git\ push\ *)
    # Extract everything after `git push` and look for a positional arg
    # (a word that doesn't start with `-`). If there isn't one, this
    # push will use the current branch as the refspec.
    args=${flat#git push}
    args=${args# }
    positional=0
    # shellcheck disable=SC2086
    set -- $args
    for word; do
      case $word in
        -*) ;;
        *) positional=1; break ;;
      esac
    done
    if [ "$positional" = "0" ]; then
      cur=$(git symbolic-ref --short -q HEAD 2>/dev/null || echo "")
      if [ "$cur" = "$PROTECTED" ]; then
        block "Refspec-less git push while HEAD is $PROTECTED would push to $PROTECTED."
      fi
    fi
    ;;
esac

exit 0
