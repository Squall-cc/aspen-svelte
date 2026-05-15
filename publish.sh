#!/bin/bash

# 1. Source the .env file so the script reads your NPM_TOKEN variable
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# 2. Safety check to make sure the token actually exists
if [ -z "$NPM_TOKEN" ]; then
    echo "Error: NPM_TOKEN variable is completely empty!"
    exit 1
fi

# 3. Setup the build directory package settings
cp npm-package.json build/package.json

# 4. Inject the token directly into the build folder's .npmrc file
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > build/.npmrc

# 5. Switch to build folder, run publish, and scrub the token file immediately after
cd build && bun publish
rm -f .npmrc