# Weight & Balance Toolbox - Complete Feature Guide

## Date: February 16, 2026

## Overview
This document provides a comprehensive guide to all new features and enhancements made to the Weight & Balance Toolbox in this implementation phase.

---

## 🎯 New Features Summary

### 1. **Multiple Aircraft Profiles** ✈️
The W&B toolbox now supports 6 different aircraft types:

#### Light Aircraft
- **Cessna 172S Skyhawk** - Light single-engine (2,550 lbs MTOW)
- **Piper PA-28 Cherokee** - Light single-engine (2,400 lbs MTOW)
- **Cirrus SR22 G6** - High-performance single (3,600 lbs MTOW)
  - Features dual envelope (Normal & Utility categories)
  - CAPS parachute system equipped

#### High-Performance
- **Beechcraft A36 Bonanza** - High-performance single (3,650 lbs MTOW)
- **Beechcraft King Air 350** - Twin turboprop (15,000 lbs MTOW)
  - Corporate/commuter aircraft
  - Jet-A fuel system

#### Military/Cargo
- **Boeing C-17 Globemaster III** - Military cargo (585,000 lbs MTOW)
  - Sample mission with M1 Abrams tank
  - 22,000 gallon fuel capacity

**How to Use:**
1. Click the **"✈️ Change Aircraft"** button in the Aircraft Profile section
2. Select from the 6 aircraft profiles displayed in a 3-column grid
3. Aircraft data and sample loading automatically update

---

### 2. **W&B Envelope Editor** 📊

Edit and customize CG envelopes directly in the application.

**Features:**
- Edit envelope category (Normal/Utility/Acrobatic)
- Modify maximum weight limits
- Adjust forward and aft CG limits
- Add/remove/edit envelope vertices
- Real-time validation with error messages

**How to Use:**
1. Click **"📊 Edit Envelope"** button in Aircraft Profile section
2. Modify envelope parameters:
   - Category dropdown
   - Max Weight field
   - Forward/Aft Limit fields
3. Manage vertices:
   - Click **"+ Add Vertex"** to add new points
   - Enter Weight (lbs) and CG Position (inches)
   - Click **✕** to remove vertices
4. Click **"✓ Validate"** to check envelope geometry
5. Review validation errors if any
6. Click **"Save Envelope"** to apply changes

**Validation Checks:**
- ✅ Minimum 3 vertices required
- ✅ Closed polygon detection
- ✅ Vertex ordering validation
- ✅ Self-intersection detection
- ✅ Forward/aft limits consistency
- ✅ Negative weight detection
- ✅ Degenerate polygon detection

**Validation Error Display:**
- 🔴 **ERROR** - Critical issues (red)
- 🟡 **WARNING** - Minor issues (yellow)
- 🔵 **INFO** - Informational (blue)
- Each error includes a suggestion for resolution

---

### 3. **Item Template System** 💾

Save frequently used loading items as templates for quick reuse.

**Features:**
- Save any loading item as a reusable template
- Categorize templates (Occupant, Fuel, Baggage, Equipment, Cargo, Custom)
- Add descriptions to templates
- Persistent storage in browser localStorage
- Template management (view, add, delete)

**How to Use:**

**Saving a Template:**
1. Configure an item in the loading table with desired weight and arm
2. Click the **💾** button next to the item
3. Fill in the Save Template dialog:
   - Template Name (required)
   - Description (optional)
   - Category (select from dropdown)
4. Click **"Save Template"**

**Using Templates:**
1. Click **"⭐ My Templates"** button
2. Browse templates by category
3. Click **"+ Add to Loading"** to add template to current configuration
4. Template is added with default values (can be edited after)

**Managing Templates:**
- View all saved templates in My Templates dialog
- Delete unwanted templates with the **✕** button
- Templates persist across browser sessions

---

### 4. **Item Library** 📚

Pre-configured library of 30+ common loading items across 5 categories.

**Categories:**

**👤 Occupants** (6 items)
- Pilot, Co-Pilot, Passengers (Front, Rear, Child)
- Default weights: 80-180 lbs

**⛽ Fuel** (5 items)
- Main Fuel at 100%, 75%, 50%, 25%
- Auxiliary Fuel
- Pre-calculated for typical aircraft

**🧳 Baggage** (5 items)
- Front Baggage, Aft Baggage
- External Baggage Pod
- Cargo Bay 1 & 2

**🔧 Equipment** (6 items)
- Survival Kit (15 lbs)
- Life Raft (35 lbs)
- Tool Kit (20 lbs)
- Emergency Equipment (25 lbs)
- Camera Equipment (30 lbs)
- Avionics Package (50 lbs)

**📦 Cargo** (5 items)
- General Cargo, Cargo Pallet
- Military Equipment
- Vehicle (Light) - 3,000 lbs
- Vehicle (Heavy) - 8,000 lbs

**How to Use:**
1. Click **"📚 Item Library"** button
2. Select category tab
3. Click on any item to add it
4. Item opens in "Add Custom Item" dialog with pre-filled values
5. Modify if needed and click "Add Item"

---

### 5. **Metric System Support** 🌍

Toggle between Imperial (lbs/in) and Metric (kg/cm) units throughout the application.

**Features:**
- Real-time unit conversion
- Proper decimal precision for each unit system
- All values update dynamically
- Unit labels update throughout interface

**Conversion Factors:**
- Weight: 1 lb = 0.454 kg
- Distance: 1 inch = 2.54 cm
- Moment: 1 lb-in = 1.152 kg-cm

**How to Use:**
1. Click the unit toggle button in the header
   - Shows: **🇺🇸 lbs/in** (Imperial mode)
   - Shows: **🌍 kg/cm** (Metric mode)
2. All values automatically convert:
   - Aircraft info card
   - Loading table (Weight, Arm, Moment)
   - Results section (Total Weight, CG Position, Moments)
   - Input dialogs

**Note:** Internal storage remains in Imperial units for compatibility. Metric display is for user convenience.

---

## 📋 User Interface Enhancements

### Loading Table Improvements
- **Save as Template** button (💾) for each item
- **Remove** button (✕) for editable items
- Real-time weight editing
- Dynamic unit labels in headers
- Formatted values with appropriate precision

### Aircraft Profile Card
- **Change Aircraft** button with modal selector
- **Edit Envelope** button with full editor
- Dynamic unit display
- All limits and weights formatted

### Results Section
- Dynamic unit conversion
- Clear status indicators (OK/Warning/Error)
- Color-coded status (green/yellow/red)
- Total weight, CG position, moments
- Zero fuel weight and CG
- Category determination

### Dialog Improvements
- Modern dark theme consistent throughout
- Proper z-index layering
- Click outside to close
- Keyboard shortcuts (Ctrl+S to save, Ctrl+O to load)

---

## 🔧 Technical Details

### Module Structure

```
src/lib/core/weight-balance/
├── sampleData.ts      - Aircraft profiles & loading samples
├── solve.ts           - W&B calculation engine
├── storage.ts         - Save/load functionality
├── templates.ts       - Template management
├── types.ts           - TypeScript type definitions
├── units.ts           - Unit conversion utilities
└── validation.ts      - Envelope validation logic
```

### Data Storage

**localStorage Keys:**
- `wb.current` - Current configuration (auto-save)
- `wb.recent` - Recent configurations list
- `wb.item.templates.v1` - User templates

**File Format:**
- JSON v1.0 format for configurations
- Compatible with save/load functionality
- Templates use separate JSON schema

### Performance Optimizations
- Efficient re-render only on state changes
- Debounced input handlers
- Lazy loading of dialogs
- Minimal re-calculations

---

## 🎮 Keyboard Shortcuts

- **Ctrl+S** (Cmd+S on Mac) - Save configuration
- **Ctrl+O** (Cmd+O on Mac) - Load configuration
- **Escape** - Close open dialogs

---

## 🔒 Data Safety

### Auto-Save
- Configuration automatically saved to localStorage on every change
- Prevents data loss on browser refresh
- Restores last state on page load

### Validation
- Real-time input validation
- Envelope geometry validation
- Weight and balance limit checks
- Clear error messages with suggestions

---

## 🚀 Best Practices

### For Aircraft Maintenance Operations:

1. **Always verify with official POH**
   - Sample data is for demonstration only
   - Use actual aircraft weight and balance data
   - Verify envelope limits with documentation

2. **Save configurations frequently**
   - Use descriptive names
   - Save before/after scenarios
   - Keep configurations for common loadings

3. **Use templates for common items**
   - Standard crew weights
   - Typical fuel loads
   - Standard equipment packages

4. **Validate critical operations**
   - Check envelope after loading changes
   - Verify CG within limits before flight
   - Review all warnings and errors

5. **Switch units as needed**
   - Use metric for international operations
   - Use imperial for US operations
   - Double-check conversions

---

## 📊 Example Workflows

### Workflow 1: Quick Weight Check
1. Select appropriate aircraft
2. Add crew using item library
3. Add fuel (select appropriate quantity)
4. Add baggage as needed
5. Review results card
6. Check status indicator

### Workflow 2: Mission Planning with C-17
1. Select C-17 Globemaster III
2. Add flight crew (3 members)
3. Add cargo using cargo items
4. Add fuel for mission profile
5. Verify total weight < MTOW
6. Check CG within envelope
7. Save configuration for mission

### Workflow 3: Creating Custom Templates
1. Add and configure a custom item
2. Fine-tune weight and arm
3. Click 💾 to save as template
4. Add description and category
5. Use template for future loadings

### Workflow 4: Metric Operations
1. Toggle to metric mode (🌍 kg/cm)
2. All values convert automatically
3. Perform weight and balance as normal
4. Results display in metric units
5. Toggle back to imperial if needed

---

## 🐛 Troubleshooting

### Common Issues:

**Templates not saving:**
- Check browser localStorage is enabled
- Clear old data if storage is full
- Export templates to backup file

**Unit conversion seems wrong:**
- Verify correct mode (Imperial vs Metric)
- Check that calculations use internal imperial values
- Display values should auto-convert

**Envelope validation errors:**
- Review error messages and suggestions
- Check vertex ordering (clockwise/counter-clockwise)
- Ensure polygon is closed (first = last vertex)
- Verify no self-intersecting edges

**Configuration won't load:**
- Check file format is valid JSON
- Verify version compatibility
- Try creating new configuration

---

## 🔮 Future Enhancements

Potential future improvements:
- Export to PDF/Excel
- Multi-aircraft comparison
- Historical loading records
- Mobile app version
- Cloud synchronization
- Pre-flight checklist integration

---

## 📚 References

- **FAA-H-8083-1B** - Aircraft Weight and Balance Handbook
- **POH/AFM** - Pilot's Operating Handbook / Aircraft Flight Manual
- **AC 120-27E** - Aircraft Weight and Balance Control

---

## 🙏 Acknowledgments

This enhanced W&B toolbox implements professional-grade features suitable for aircraft maintenance and flight operations, while maintaining ease of use and safety.

**Always consult official aircraft documentation and follow proper procedures for all weight and balance operations.**

---

*Last Updated: February 16, 2026*
*Version: 2.0.0*
