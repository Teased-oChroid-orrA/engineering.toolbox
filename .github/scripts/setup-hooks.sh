#!/bin/bash
# Setup git hooks for CI protection

echo "Setting up git hooks for CI protection..."

# Check if husky is installed
if ! command -v npx &> /dev/null; then
    echo "Error: npx not found. Please install Node.js first."
    exit 1
fi

# Install husky if not already installed
if [ ! -d ".husky" ]; then
    echo "Installing husky..."
    npm install --save-dev husky
    npx husky init
fi

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
echo "Running pre-commit checks..."
npm run check || exit 1
EOF

chmod +x .husky/pre-commit

# Create pre-push hook
cat > .husky/pre-push << 'EOF'
#!/usr/bin/env sh
echo "Running pre-push checks..."
npm run build || exit 1
if [ -f "playwright.unit.config.ts" ]; then
  npm run test:unit || exit 1
fi
EOF

chmod +x .husky/pre-push

echo "✅ Git hooks setup complete!"
echo ""
echo "Hooks installed:"
echo "  - pre-commit: runs 'npm run check'"
echo "  - pre-push: runs 'npm run build' and 'npm run test:unit'"
echo ""
echo "To bypass hooks in emergencies, use: git commit --no-verify"
