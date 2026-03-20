#!/bin/bash

# Post-edit color guard — checks for forbidden Tailwind colors after file edits
# Forbidden: emerald-*, green-*, blue-*, amber-*, slate-*
# See Constitution.md Article 2 and docs/decisions/001-zinc-coral-theme.md

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check .ts/.tsx files
if [[ -z "$FILE_PATH" ]] || [[ ! "$FILE_PATH" =~ \.(tsx?|css)$ ]]; then
  exit 0
fi

# Skip non-src files
if [[ ! "$FILE_PATH" =~ /src/ ]] && [[ ! "$FILE_PATH" =~ globals\.css$ ]]; then
  exit 0
fi

# Check for forbidden colors
VIOLATIONS=$(grep -nE "(emerald-|green-[0-9]|blue-[0-9]|amber-|slate-)" "$FILE_PATH" 2>/dev/null | head -5)

if [[ -n "$VIOLATIONS" ]]; then
  echo "FORBIDDEN COLORS DETECTED in $FILE_PATH:" >&2
  echo "$VIOLATIONS" >&2
  echo "" >&2
  echo "Only zinc scale + coral #DC2626 allowed. See Constitution.md Article 2." >&2
  exit 2
fi

exit 0
