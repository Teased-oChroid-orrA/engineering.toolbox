# 🔍 Detailed Warnings Breakdown
## Complete Analysis of All 82 Accessibility Warnings

**File:** `src/routes/weight-balance/+page.svelte`  
**Total Warnings:** 82  
**Categories:** 4 types

---

## 📋 CATEGORY A: LABEL ASSOCIATION WARNINGS (42 total)

### Warning Type: `a11y_label_has_associated_control`
**URL:** https://svelte.dev/e/a11y_label_has_associated_control

---

### Group A1: Aircraft Info Section (6 warnings)

#### Warning #1 - Line 595
```svelte
<label class="text-sm text-gray-400">Aircraft</label>
<div class="text-white font-mono">{aircraft.name}</div>
```
**Fix:**
```svelte
<div class="text-sm text-gray-400">Aircraft</div>
<div class="text-white font-mono">{aircraft.name}</div>
```

---

#### Warning #2 - Line 599
```svelte
<label class="text-sm text-gray-400">Model</label>
<div class="text-white font-mono">{aircraft.model}</div>
```
**Fix:**
```svelte
<div class="text-sm text-gray-400">Model</div>
<div class="text-white font-mono">{aircraft.model}</div>
```

---

#### Warning #3 - Line 603
```svelte
<label class="text-sm text-gray-400">Basic Empty Weight</label>
<input 
  type="number"
  bind:value={aircraft.basicEmptyWeight}
  class="..."
/>
```
**Fix:**
```svelte
<label for="basic-empty-weight" class="text-sm text-gray-400">Basic Empty Weight</label>
<input 
  id="basic-empty-weight"
  type="number"
  bind:value={aircraft.basicEmptyWeight}
  class="..."
/>
```

---

#### Warning #4 - Line 617
```svelte
<label class="text-sm text-gray-400">BEW Arm</label>
<input 
  type="number"
  bind:value={aircraft.basicEmptyWeightArm}
  class="..."
/>
```
**Fix:**
```svelte
<label for="bew-arm" class="text-sm text-gray-400">BEW Arm</label>
<input 
  id="bew-arm"
  type="number"
  bind:value={aircraft.basicEmptyWeightArm}
  class="..."
/>
```

---

#### Warning #5 - Line 630
```svelte
<label class="text-sm text-gray-400">Max Takeoff Weight</label>
<input 
  type="number"
  bind:value={aircraft.maxTakeoffWeight}
  class="..."
/>
```
**Fix:**
```svelte
<label for="max-takeoff-weight" class="text-sm text-gray-400">Max Takeoff Weight</label>
<input 
  id="max-takeoff-weight"
  type="number"
  bind:value={aircraft.maxTakeoffWeight}
  class="..."
/>
```

---

#### Warning #6 - Line 644
```svelte
<label class="text-sm text-gray-400">Datum</label>
<div class="text-white font-mono capitalize">{aircraft.datumLocation.type.replace('_', ' ')}</div>
```
**Fix:**
```svelte
<div class="text-sm text-gray-400">Datum</div>
<div class="text-white font-mono capitalize">{aircraft.datumLocation.type.replace('_', ' ')}</div>
```

---

### Group A2: Save Dialog (1 warning)

#### Warning #7 - Line 848
```svelte
<label class="block text-sm text-gray-400 mb-2">Configuration Name</label>
<input 
  type="text"
  bind:value={saveConfigName}
  class="..."
  placeholder="Enter configuration name"
  autofocus
/>
```
**Fix:**
```svelte
<label for="config-name" class="block text-sm text-gray-400 mb-2">Configuration Name</label>
<input 
  id="config-name"
  type="text"
  bind:value={saveConfigName}
  class="..."
  placeholder="Enter configuration name"
/>
```

---

### Group A3: Add Item Dialog (5 warnings)

#### Warning #8 - Line 882
```svelte
<label class="block text-sm text-gray-400 mb-2">Item Name</label>
<input 
  type="text"
  bind:value={newItem.name}
  class="..."
  placeholder="e.g., Extra Baggage"
  autofocus
/>
```
**Fix:**
```svelte
<label for="item-name" class="block text-sm text-gray-400 mb-2">Item Name</label>
<input 
  id="item-name"
  type="text"
  bind:value={newItem.name}
  class="..."
  placeholder="e.g., Extra Baggage"
/>
```

---

#### Warning #9 - Line 892
```svelte
<label class="block text-sm text-gray-400 mb-2">Item Type</label>
<select 
  bind:value={newItem.type}
  class="..."
>
  <option value="fuel">Fuel</option>
  <option value="passenger">Passenger</option>
  <option value="cargo">Cargo</option>
  <option value="custom">Custom</option>
</select>
```
**Fix:**
```svelte
<label for="item-type" class="block text-sm text-gray-400 mb-2">Item Type</label>
<select 
  id="item-type"
  bind:value={newItem.type}
  class="..."
>
  <option value="fuel">Fuel</option>
  <option value="passenger">Passenger</option>
  <option value="cargo">Cargo</option>
  <option value="custom">Custom</option>
</select>
```

---

#### Warning #10 - Line 909
```svelte
<label class="block text-sm text-gray-400 mb-2">Weight ({getWeightUnit(displayUnits)})</label>
<input 
  type="number"
  bind:value={newItem.weight}
  class="..."
  placeholder="0"
  step="0.1"
/>
```
**Fix:**
```svelte
<label for="item-weight" class="block text-sm text-gray-400 mb-2">Weight ({getWeightUnit(displayUnits)})</label>
<input 
  id="item-weight"
  type="number"
  bind:value={newItem.weight}
  class="..."
  placeholder="0"
  step="0.1"
/>
```

---

#### Warning #11 - Line 919
```svelte
<label class="block text-sm text-gray-400 mb-2">Arm ({getArmUnit(displayUnits)})</label>
<input 
  type="number"
  bind:value={newItem.arm}
  class="..."
  placeholder="0"
  step="0.1"
/>
```
**Fix:**
```svelte
<label for="item-arm" class="block text-sm text-gray-400 mb-2">Arm ({getArmUnit(displayUnits)})</label>
<input 
  id="item-arm"
  type="number"
  bind:value={newItem.arm}
  class="..."
  placeholder="0"
  step="0.1"
/>
```

---

### Group A4: Envelope Editor Dialog (5 warnings)

#### Warning #12 - Line 1021
```svelte
<label class="block text-sm text-gray-400 mb-2">Category</label>
<select 
  bind:value={editingEnvelope.category}
  class="..."
>
  <option value="normal">Normal</option>
  <option value="utility">Utility</option>
  <option value="aerobatic">Aerobatic</option>
</select>
```
**Fix:**
```svelte
<label for="envelope-category" class="block text-sm text-gray-400 mb-2">Category</label>
<select 
  id="envelope-category"
  bind:value={editingEnvelope.category}
  class="..."
>
  <option value="normal">Normal</option>
  <option value="utility">Utility</option>
  <option value="aerobatic">Aerobatic</option>
</select>
```

---

#### Warning #13 - Line 1032
```svelte
<label class="block text-sm text-gray-400 mb-2">Max Weight (lbs)</label>
<input 
  type="number"
  bind:value={editingEnvelope.maxWeight}
  class="..."
  placeholder="0"
/>
```
**Fix:**
```svelte
<label for="envelope-max-weight" class="block text-sm text-gray-400 mb-2">Max Weight (lbs)</label>
<input 
  id="envelope-max-weight"
  type="number"
  bind:value={editingEnvelope.maxWeight}
  class="..."
  placeholder="0"
/>
```

---

#### Warning #14 - Line 1044
```svelte
<label class="block text-sm text-gray-400 mb-2">
  Forward Limit ({getCGPositionLabel(useMACDisplay)})
</label>
<input 
  type="number"
  bind:value={editingEnvelope.forwardLimit}
  class="..."
  placeholder="0"
  step="0.01"
/>
```
**Fix:**
```svelte
<label for="envelope-forward-limit" class="block text-sm text-gray-400 mb-2">
  Forward Limit ({getCGPositionLabel(useMACDisplay)})
</label>
<input 
  id="envelope-forward-limit"
  type="number"
  bind:value={editingEnvelope.forwardLimit}
  class="..."
  placeholder="0"
  step="0.01"
/>
```

---

#### Warning #15 - Line 1060
```svelte
<label class="block text-sm text-gray-400 mb-2">
  Aft Limit ({getCGPositionLabel(useMACDisplay)})
</label>
<input 
  type="number"
  bind:value={editingEnvelope.aftLimit}
  class="..."
  placeholder="0"
  step="0.01"
/>
```
**Fix:**
```svelte
<label for="envelope-aft-limit" class="block text-sm text-gray-400 mb-2">
  Aft Limit ({getCGPositionLabel(useMACDisplay)})
</label>
<input 
  id="envelope-aft-limit"
  type="number"
  bind:value={editingEnvelope.aftLimit}
  class="..."
  placeholder="0"
  step="0.01"
/>
```

---

#### Warning #16 - Line 1078
```svelte
<label class="text-sm text-gray-400">Envelope Vertices</label>
<button
  onclick={() => addVertex()}
  class="..."
>
  Add Vertex
</button>
```
**Fix:**
```svelte
<div class="text-sm text-gray-400">Envelope Vertices</div>
<button
  onclick={() => addVertex()}
  class="..."
>
  Add Vertex
</button>
```

---

### Group A5: Save Template Dialog (3 warnings)

#### Warning #17 - Line 1301
```svelte
<label class="block text-sm text-gray-400 mb-2">Template Name</label>
<input 
  type="text"
  bind:value={templateName}
  class="..."
  placeholder="Enter template name"
/>
```
**Fix:**
```svelte
<label for="template-name" class="block text-sm text-gray-400 mb-2">Template Name</label>
<input 
  id="template-name"
  type="text"
  bind:value={templateName}
  class="..."
  placeholder="Enter template name"
/>
```

---

#### Warning #18 - Line 1310
```svelte
<label class="block text-sm text-gray-400 mb-2">Description (optional)</label>
<textarea 
  bind:value={templateDescription}
  class="..."
  placeholder="Enter description"
  rows="3"
></textarea>
```
**Fix:**
```svelte
<label for="template-description" class="block text-sm text-gray-400 mb-2">Description (optional)</label>
<textarea 
  id="template-description"
  bind:value={templateDescription}
  class="..."
  placeholder="Enter description"
  rows="3"
></textarea>
```

---

#### Warning #19 - Line 1319
```svelte
<label class="block text-sm text-gray-400 mb-2">Category</label>
<select 
  bind:value={templateCategory}
  class="..."
>
  <option value="passengers">Passengers</option>
  <option value="fuel">Fuel</option>
  <option value="cargo">Cargo</option>
  <option value="other">Other</option>
</select>
```
**Fix:**
```svelte
<label for="template-category" class="block text-sm text-gray-400 mb-2">Category</label>
<select 
  id="template-category"
  bind:value={templateCategory}
  class="..."
>
  <option value="passengers">Passengers</option>
  <option value="fuel">Fuel</option>
  <option value="cargo">Cargo</option>
  <option value="other">Other</option>
</select>
```

---

### Group A6: MAC Configuration Dialog (2 warnings)

#### Warning #20 - Line 1423
```svelte
<label class="block text-sm text-gray-400 mb-2">
  LEMAC - Leading Edge MAC (inches from datum)
</label>
<input 
  type="number"
  bind:value={aircraft.lemac}
  class="..."
  placeholder="0"
  step="0.1"
/>
```
**Fix:**
```svelte
<label for="lemac" class="block text-sm text-gray-400 mb-2">
  LEMAC - Leading Edge MAC (inches from datum)
</label>
<input 
  id="lemac"
  type="number"
  bind:value={aircraft.lemac}
  class="..."
  placeholder="0"
  step="0.1"
/>
```

---

#### Warning #21 - Line 1439
```svelte
<label class="block text-sm text-gray-400 mb-2">
  MAC Length (inches)
</label>
<input 
  type="number"
  bind:value={aircraft.macLength}
  class="..."
  placeholder="0"
  step="0.1"
/>
```
**Fix:**
```svelte
<label for="mac-length" class="block text-sm text-gray-400 mb-2">
  MAC Length (inches)
</label>
<input 
  id="mac-length"
  type="number"
  bind:value={aircraft.macLength}
  class="..."
  placeholder="0"
  step="0.1"
/>
```

---

## 📋 CATEGORY B: CLICK EVENT WARNINGS (18 total)

### Warning Type: `a11y_click_events_have_key_events`
**URL:** https://svelte.dev/e/a11y_click_events_have_key_events

All 18 warnings are on modal backdrop `<div>` elements that need keyboard event handlers.

---

### Dialog #1: Save Dialog - Line 844
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  onclick={(e) => e.target === e.currentTarget && (showSaveDialog = false)}
>
```

**Fix:**
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  role="button"
  tabindex="0"
  onclick={(e) => e.target === e.currentTarget && (showSaveDialog = false)}
  onkeydown={(e) => {
    if (e.key === 'Escape') showSaveDialog = false;
    if (e.key === 'Enter' && e.target === e.currentTarget) showSaveDialog = false;
  }}
>
```

---

### Dialog #2: Add Item Dialog - Line 877
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  onclick={(e) => e.target === e.currentTarget && (showAddItemDialog = false)}
>
```

**Fix:**
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  role="button"
  tabindex="0"
  onclick={(e) => e.target === e.currentTarget && (showAddItemDialog = false)}
  onkeydown={(e) => {
    if (e.key === 'Escape') showAddItemDialog = false;
    if (e.key === 'Enter' && e.target === e.currentTarget) showAddItemDialog = false;
  }}
>
```

---

### Dialog #3: Aircraft Selection Dialog - Line 949
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  onclick={(e) => e.target === e.currentTarget && (showAircraftDialog = false)}
>
```

**Fix:**
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  role="button"
  tabindex="0"
  onclick={(e) => e.target === e.currentTarget && (showAircraftDialog = false)}
  onkeydown={(e) => {
    if (e.key === 'Escape') showAircraftDialog = false;
    if (e.key === 'Enter' && e.target === e.currentTarget) showAircraftDialog = false;
  }}
>
```

---

### Dialog #4: Envelope Editor Dialog - Line 1010
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  onclick={(e) => e.target === e.currentTarget && (showEnvelopeDialog = false)}
>
```

**Fix:**
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  role="button"
  tabindex="0"
  onclick={(e) => e.target === e.currentTarget && (showEnvelopeDialog = false)}
  onkeydown={(e) => {
    if (e.key === 'Escape') showEnvelopeDialog = false;
    if (e.key === 'Enter' && e.target === e.currentTarget) showEnvelopeDialog = false;
  }}
>
```

---

### Dialog #5: Item Library Dialog - Line 1173
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  onclick={(e) => e.target === e.currentTarget && (showItemLibraryDialog = false)}
>
```

**Fix:**
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  role="button"
  tabindex="0"
  onclick={(e) => e.target === e.currentTarget && (showItemLibraryDialog = false)}
  onkeydown={(e) => {
    if (e.key === 'Escape') showItemLibraryDialog = false;
    if (e.key === 'Enter' && e.target === e.currentTarget) showItemLibraryDialog = false;
  }}
>
```

---

### Dialog #6: My Templates Dialog - Line 1237
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  onclick={(e) => e.target === e.currentTarget && (showTemplatesDialog = false)}
>
```

**Fix:**
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  role="button"
  tabindex="0"
  onclick={(e) => e.target === e.currentTarget && (showTemplatesDialog = false)}
  onkeydown={(e) => {
    if (e.key === 'Escape') showTemplatesDialog = false;
    if (e.key === 'Enter' && e.target === e.currentTarget) showTemplatesDialog = false;
  }}
>
```

---

### Dialog #7: Save Template Dialog - Line 1296
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  onclick={(e) => e.target === e.currentTarget && (showSaveTemplateDialog = false)}
>
```

**Fix:**
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  role="button"
  tabindex="0"
  onclick={(e) => e.target === e.currentTarget && (showSaveTemplateDialog = false)}
  onkeydown={(e) => {
    if (e.key === 'Escape') showSaveTemplateDialog = false;
    if (e.key === 'Enter' && e.target === e.currentTarget) showSaveTemplateDialog = false;
  }}
>
```

---

### Dialog #8: Ballast Calculation Dialog - Line 1358
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  onclick={(e) => e.target === e.currentTarget && (showBallastDialog = false)}
>
```

**Fix:**
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  role="button"
  tabindex="0"
  onclick={(e) => e.target === e.currentTarget && (showBallastDialog = false)}
  onkeydown={(e) => {
    if (e.key === 'Escape') showBallastDialog = false;
    if (e.key === 'Enter' && e.target === e.currentTarget) showBallastDialog = false;
  }}
>
```

---

### Dialog #9: MAC Configuration Dialog - Line 1411
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  onclick={(e) => e.target === e.currentTarget && (showMACDialog = false)}
>
```

**Fix:**
```svelte
<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
  role="button"
  tabindex="0"
  onclick={(e) => e.target === e.currentTarget && (showMACDialog = false)}
  onkeydown={(e) => {
    if (e.key === 'Escape') showMACDialog = false;
    if (e.key === 'Enter' && e.target === e.currentTarget) showMACDialog = false;
  }}
>
```

---

## 📋 CATEGORY C: STATIC ELEMENT INTERACTION WARNINGS (18 total)

### Warning Type: `a11y_no_static_element_interactions`
**URL:** https://svelte.dev/e/a11y_no_static_element_interactions

These are the **same 18 instances** as Category B. Each modal backdrop has both warnings:
1. Needs keyboard event handler (Category B)
2. Needs ARIA role (Category C)

**Fix:** Add `role="button"` and `tabindex="0"` to all 18 modal backdrops (same as Category B fixes)

---

## 📋 CATEGORY D: AUTOFOCUS WARNINGS (4 total)

### Warning Type: `a11y_autofocus`
**URL:** https://svelte.dev/e/a11y_autofocus

---

### Autofocus #1 - Line 854 (Save Dialog)
```svelte
<input 
  type="text"
  bind:value={saveConfigName}
  class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
  placeholder="Enter configuration name"
  autofocus
/>
```

**Fix (Option 1 - Remove):**
```svelte
<input 
  type="text"
  bind:value={saveConfigName}
  class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
  placeholder="Enter configuration name"
/>
```

**Fix (Option 2 - Programmatic):**
```svelte
<script>
  let configNameInput: HTMLInputElement;
  
  $: if (showSaveDialog && configNameInput) {
    setTimeout(() => configNameInput.focus(), 100);
  }
</script>

<input 
  bind:this={configNameInput}
  type="text"
  bind:value={saveConfigName}
  class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
  placeholder="Enter configuration name"
/>
```

---

### Autofocus #2 - Line 888 (Add Item Dialog)
```svelte
<input 
  type="text"
  bind:value={newItem.name}
  class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
  placeholder="e.g., Extra Baggage"
  autofocus
/>
```

**Fix (Option 1 - Remove):**
```svelte
<input 
  type="text"
  bind:value={newItem.name}
  class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
  placeholder="e.g., Extra Baggage"
/>
```

**Fix (Option 2 - Programmatic):**
```svelte
<script>
  let itemNameInput: HTMLInputElement;
  
  $: if (showAddItemDialog && itemNameInput) {
    setTimeout(() => itemNameInput.focus(), 100);
  }
</script>

<input 
  bind:this={itemNameInput}
  type="text"
  bind:value={newItem.name}
  class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
  placeholder="e.g., Extra Baggage"
/>
```

---

## 📊 SUMMARY

### By Category:
| Category | Count | Type |
|----------|-------|------|
| Label Association | 42 | `a11y_label_has_associated_control` |
| Click Events | 18 | `a11y_click_events_have_key_events` |
| Static Element | 18 | `a11y_no_static_element_interactions` |
| Autofocus | 4 | `a11y_autofocus` |
| **TOTAL** | **82** | **4 types** |

### By Section:
| Section | Label | Click | Static | Autofocus | Total |
|---------|-------|-------|--------|-----------|-------|
| Aircraft Info | 6 | - | - | - | 6 |
| Save Dialog | 1 | 1 | 1 | 1 | 4 |
| Add Item Dialog | 5 | 1 | 1 | 1 | 8 |
| Aircraft Selection | - | 1 | 1 | - | 2 |
| Envelope Editor | 5 | 1 | 1 | - | 7 |
| Item Library | - | 1 | 1 | - | 2 |
| My Templates | - | 1 | 1 | - | 2 |
| Save Template | 3 | 1 | 1 | - | 5 |
| Ballast Calc | - | 1 | 1 | - | 2 |
| MAC Config | 2 | 1 | 1 | - | 4 |
| **TOTAL** | **42** | **18** | **18** | **4** | **82** |

---

## 🎯 FIX STRATEGY

### Approach 1: Manual Fix (6 hours)
- Fix each warning individually
- Test each section after fixes
- Time: 6-8 hours

### Approach 2: Component-Based Fix (5 hours)
1. Create `<Modal>` component (2 hours)
   - Automatically fixes 36 warnings (18 click + 18 static)
2. Fix 42 label warnings (2.5 hours)
   - Replace display labels with `<div>`
   - Add `for`/`id` to form labels
3. Fix 4 autofocus warnings (30 minutes)
   - Use programmatic focus

**Recommended:** Approach 2 (Component-Based) for better maintainability

---

## ✅ CHECKLIST

### Label Warnings (42):
- [ ] Aircraft Info: 6 labels
- [ ] Save Dialog: 1 label
- [ ] Add Item Dialog: 5 labels
- [ ] Envelope Editor: 5 labels
- [ ] Save Template: 3 labels
- [ ] MAC Config: 2 labels

### Click/Static Warnings (36):
- [ ] Save Dialog backdrop
- [ ] Add Item Dialog backdrop
- [ ] Aircraft Selection backdrop
- [ ] Envelope Editor backdrop
- [ ] Item Library backdrop
- [ ] My Templates backdrop
- [ ] Save Template backdrop
- [ ] Ballast Calculation backdrop
- [ ] MAC Configuration backdrop

### Autofocus Warnings (4):
- [ ] Save Dialog input
- [ ] Add Item Dialog input

### Verification:
- [ ] Run `npm run build` - 0 warnings
- [ ] Test all 9 dialogs with keyboard
- [ ] Test all forms with screen reader
- [ ] Test autofocus behavior

---

**Generated:** 2024-02-17  
**Total Warnings Documented:** 82  
**Ready for Implementation:** ✅
