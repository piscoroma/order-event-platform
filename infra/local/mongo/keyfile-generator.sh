#!/usr/bin/env bash

set -euo pipefail

KEYFILE_PATH="$(dirname -- "${BASH_SOURCE[0]}")/mongo-keyfile"

if [[ -f "$KEYFILE_PATH" ]]; then
    echo "MongoDB keyfile already exists."
    exit 0
fi

echo "Generating MongoDB keyfile..."

openssl rand -base64 756 > "$KEYFILE_PATH"

sudo chown 999:999 "$KEYFILE_PATH"
sudo chmod 400 "$KEYFILE_PATH"

echo "MongoDB keyfile generated."
