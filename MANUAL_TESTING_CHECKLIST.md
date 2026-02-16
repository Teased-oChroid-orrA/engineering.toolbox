# Manual Testing Checklist for W&B and Inspector Fixes

## How to Test

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open browser to: `http://localhost:5173/#/weight-balance`

3. Follow the test steps below and check each item:

---

## Weight & Balance Toolbox Tests

### Test 1: Aircraft Selection ✈️

- [ ] Click the **"✈️ Change Aircraft"** button in the Aircraft Profile section
- [ ] Verify the Aircraft Selection Dialog appears
- [ ] Verify 4 aircraft options are displayed:
  - [ ] Cessna 172S Skyhawk (2,550 lbs MTOW)
  - [ ] Piper PA-28 Cherokee (2,400 lbs MTOW)
  - [ ] Beechcraft A36 Bonanza (3,650 lbs MTOW)
  - [ ] Boeing C-17 Globemaster III (585,000 lbs MTOW)
- [ ] Click on **Boeing C-17 Globemaster III**
- [ ] Verify the aircraft changes:
  - [ ] Aircraft name changes to "C-17 Globemaster III"
  - [ ] Basic Empty Weight shows: 282,000 lbs
  - [ ] BEW Arm shows: 1020"
  - [ ] Max Takeoff Weight shows: 585,000 lbs
- [ ] Verify loading items change to C-17 defaults:
  - [ ] Flight Crew (3) - 600 lbs
  - [ ] M1 Abrams Tank - 68,000 lbs
  - [ ] Support Vehicles - 12,000 lbs
  - [ ] Cargo Pallets - 18,000 lbs
  - [ ] Fuel - 147,400 lbs
- [ ] Click Cancel to close dialog

### Test 2: Item Library 📚

- [ ] Click the **"📚 Item Library"** button
- [ ] Verify Item Library Dialog appears
- [ ] Test category tabs:
  - [ ] Click **👤 Occupants** - should show 6 items (Pilot, Co-Pilot, etc.)
  - [ ] Click **⛽ Fuel** - should show 5 items (Full, 3/4, 1/2, 1/4 fuel, Auxiliary)
  - [ ] Click **🧳 Baggage** - should show 5 items (Front, Aft, External, Cargo Bays)
  - [ ] Click **🔧 Equipment** - should show 6 items (Survival Kit, Life Raft, Tools, etc.)
  - [ ] Click **📦 Cargo** - should show 5 items (General, Pallets, Military, Vehicles)
- [ ] Click on any item (e.g., "Pilot" from Occupants)
- [ ] Verify the Add Custom Item dialog opens with pre-filled values
- [ ] Click Cancel to close

### Test 3: W&B Envelope Editor 📊

- [ ] Click the **"📊 Edit Envelope"** button
- [ ] Verify Envelope Editor Dialog appears
- [ ] Verify current values are displayed:
  - [ ] Category dropdown (Normal/Utility/Acrobatic)
  - [ ] Max Weight field
  - [ ] Forward Limit field
  - [ ] Aft Limit field
  - [ ] Vertices list with Weight and CG Position columns
- [ ] Test vertex management:
  - [ ] Click **"+ Add Vertex"** button
  - [ ] Verify a new vertex row appears
  - [ ] Enter test values in the new vertex (e.g., Weight: 3000, CG: 50)
  - [ ] Click the **✕** button on the new vertex
  - [ ] Verify the vertex is removed
- [ ] Click Cancel to close dialog

### Test 4: Item Modification

- [ ] In the Loading Configuration table, locate an editable item (not "Basic Empty Weight")
- [ ] Modify the weight value (e.g., change "Pilot" from 180 to 200)
- [ ] Verify:
  - [ ] The Moment column updates automatically
  - [ ] The Results card updates with new totals
  - [ ] The CG Envelope Chart updates the current CG position
- [ ] Click the **✕** button on a removable item
- [ ] Verify:
  - [ ] Confirmation dialog appears
  - [ ] Item is removed from the table
  - [ ] Results recalculate

### Test 5: Add Custom Item

- [ ] Click the **"+ Add Custom"** button
- [ ] Fill in the form:
  - Item Name: "Test Cargo"
  - Item Type: Select "Cargo"
  - Weight: 500 lbs
  - Arm: 100 in
- [ ] Click **"Add Item"**
- [ ] Verify the item appears in the table
- [ ] Verify results recalculate

### Test 6: Save/Load Configuration

- [ ] Click the **"💾 Save"** button
- [ ] Enter a configuration name (e.g., "Test Config")
- [ ] Click **"Save"** in the dialog
- [ ] Verify a JSON file downloads
- [ ] Make changes to the current configuration
- [ ] Click the **"📁 Load"** button
- [ ] Select the saved JSON file
- [ ] Verify the configuration restores correctly

---

## Inspector Data Grid Tests

### Test 7: File Name Display

1. Open Inspector: `http://localhost:5173/#/inspector`

2. Load a CSV file:
   - [ ] Click the file upload or paste CSV data
   - [ ] Verify the loaded file appears in the "Loaded files" section
   - [ ] Verify the filename is displayed correctly (NOT [NONE])
   - [ ] For path-based files, verify only the filename is shown (not full path)
   - [ ] For text-based files, verify "CSV Data (N rows)" is shown

### Test 8: File Unloading

- [ ] With a file loaded, locate it in the "Loaded files" section
- [ ] Verify helper text shows: "Click filename to unload"
- [ ] Click directly on the filename button
- [ ] Verify:
  - [ ] File is unloaded from the grid
  - [ ] Filename badge disappears from the list
  - [ ] No leftover references to the file
- [ ] Verify there is NO separate "×" button

---

## Bushing Toolbox Test

### Test 9: Bushing Toolbox Load

1. Navigate to: `http://localhost:5173/#/bushing`

2. Verify:
   - [ ] Page loads without errors
   - [ ] No 504 errors in browser console
   - [ ] No "Failed to load resource" errors
   - [ ] No "Importing a module script failed" errors
   - [ ] All bushing toolbox cards display correctly
   - [ ] Input fields are interactive
   - [ ] "Compute" button works

---

## Browser Console Tests

For all pages tested above:

- [ ] Open Browser DevTools (F12)
- [ ] Check Console tab
- [ ] Verify:
  - [ ] No red errors
  - [ ] No unhandled promise rejections
  - [ ] No 504 errors
  - [ ] No module import failures

---

## Cross-Browser Testing (Optional)

Repeat the above tests in:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Edge

---

## Regression Testing

Verify existing features still work:

### W&B Toolbox:
- [ ] Default aircraft (Cessna 172S) loads correctly
- [ ] Results calculate correctly
- [ ] CG Envelope chart renders
- [ ] Validations show warnings/errors when appropriate
- [ ] Disclaimer can be dismissed

### Inspector:
- [ ] CSV data can be loaded
- [ ] Grid displays data correctly
- [ ] Filters work
- [ ] Sort works
- [ ] Schema modal opens

### Bushing Toolbox:
- [ ] Input fields accept values
- [ ] Compute button calculates results
- [ ] Export buttons work
- [ ] Visualization updates

---

## Test Results

**Date Tested**: __________________  
**Tester Name**: __________________  
**Browser**: __________________  
**OS**: __________________  

**Overall Result**:
- [ ] All tests passed
- [ ] Some tests failed (list below)

**Failed Tests** (if any):
```
List any failed tests here with description of the issue:

1. 
2. 
3. 
```

**Additional Notes**:
```
Any other observations or comments:


```

---

## Automated Testing (Optional)

If system dependencies are available, run:

```bash
# Install Playwright with dependencies
npx playwright install --with-deps

# Run W&B smoke test
node .github/skills/default-browser-dev-tools/runner.js smoke \
  --url http://localhost:5173/#/weight-balance \
  --engines webkit,chromium

# Run Inspector smoke test
node .github/skills/default-browser-dev-tools/runner.js smoke \
  --url http://localhost:5173/#/inspector \
  --engines webkit,chromium

# Run Bushing smoke test
node .github/skills/default-browser-dev-tools/runner.js smoke \
  --url http://localhost:5173/#/bushing \
  --engines webkit,chromium
```

---

## Success Criteria

✅ All checkboxes above are marked  
✅ No console errors  
✅ All new features work as expected  
✅ No regressions in existing features  
✅ File names display correctly in Inspector  
✅ No 504 errors in Bushing toolbox
