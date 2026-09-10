#!/usr/bin/env bash
set -euo pipefail

target="${1:-data/raw/matraix-persona-1m}"
if command -v hf >/dev/null 2>&1; then
  hf download MatrAIx2026/MatrAIx_Persona_1M_Public_Release --repo-type dataset --local-dir "$target"
elif command -v huggingface-cli >/dev/null 2>&1; then
  huggingface-cli download MatrAIx2026/MatrAIx_Persona_1M_Public_Release --repo-type dataset --local-dir "$target"
else
  echo "Install the official Hugging Face CLI, authenticate if requested, then rerun this script." >&2
  exit 1
fi

