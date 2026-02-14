#!/bin/bash
# Pre-flight checks before starting dev server

echo "🔍 Running pre-flight checks..."
echo ""

# Check 1: Port availability
echo "1️⃣ Checking if port 5173 is available..."
if lsof -ti:5173 > /dev/null 2>&1; then
  echo "   ⚠️  Port 5173 is in use. Killing processes..."
  kill $(lsof -ti:5173) 2>/dev/null
  sleep 2
  if lsof -ti:5173 > /dev/null 2>&1; then
    echo "   ❌ Failed to free port 5173"
    exit 1
  fi
  echo "   ✅ Port freed"
else
  echo "   ✅ Port 5173 available"
fi
echo ""

# Check 2: TypeScript errors
echo "2️⃣ Checking for TypeScript errors..."
npm run check > /tmp/check-output.txt 2>&1
ERROR_COUNT=$(grep "svelte-check found" /tmp/check-output.txt | grep -o "[0-9]* error" | grep -o "[0-9]*")
if [ "$ERROR_COUNT" != "0" ] && [ -n "$ERROR_COUNT" ]; then
  echo "   ❌ Found $ERROR_COUNT TypeScript errors"
  cat /tmp/check-output.txt
  exit 1
else
  echo "   ✅ No TypeScript errors"
fi
echo ""

# Check 3: Node modules
echo "3️⃣ Checking node_modules..."
if [ ! -d "node_modules" ]; then
  echo "   ⚠️  node_modules missing. Running npm install..."
  npm install
else
  echo "   ✅ node_modules present"
fi
echo ""

# Check 4: Build directories
echo "4️⃣ Checking build directories..."
if [ -d ".svelte-kit/output" ]; then
  echo "   ✅ .svelte-kit exists"
else
  echo "   ⚠️  Running svelte-kit sync..."
  npx svelte-kit sync
fi
echo ""

echo "✅ All pre-flight checks passed!"
echo ""
echo "Starting dev server..."
npm run dev
