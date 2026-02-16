# W&B Toolbox Quick Reference

## Quick Access Guide

### Main Features

| Feature | Button Location | Description |
|---------|----------------|-------------|
| **Unit Toggle** | Header (right) | 🇺🇸 lbs/in ⇄ 🌍 kg/cm |
| **Save Config** | Header (right) | 💾 Save current configuration |
| **Load Config** | Header (right) | 📁 Load saved configuration |
| **Change Aircraft** | Aircraft Profile card | ✈️ Select from 6 aircraft types |
| **Edit Envelope** | Aircraft Profile card | 📊 Modify W&B envelope |
| **Item Library** | Loading Configuration | 📚 30+ pre-configured items |
| **My Templates** | Loading Configuration | ⭐ Your saved templates |
| **Add Custom** | Loading Configuration | + Add custom item |
| **Save Template** | Item row | 💾 Save item as template |
| **Remove Item** | Item row | ✕ Delete item from loading |

### 6 Aircraft Profiles

1. **Cessna 172S Skyhawk** - 2,550 lbs MTOW
2. **Piper PA-28 Cherokee** - 2,400 lbs MTOW
3. **Cirrus SR22 G6** - 3,600 lbs MTOW (dual envelope)
4. **Beechcraft A36 Bonanza** - 3,650 lbs MTOW
5. **Beechcraft King Air 350** - 15,000 lbs MTOW
6. **Boeing C-17 Globemaster III** - 585,000 lbs MTOW

### Item Library Categories

- 👤 **Occupants** - Pilot, passengers (6 items)
- ⛽ **Fuel** - Full/partial fuel loads (5 items)
- 🧳 **Baggage** - Various baggage locations (5 items)
- 🔧 **Equipment** - Survival, tools, avionics (6 items)
- 📦 **Cargo** - General cargo, vehicles (5 items)

### Keyboard Shortcuts

- `Ctrl+S` (Cmd+S) - Save configuration
- `Ctrl+O` (Cmd+O) - Load configuration
- `Esc` - Close dialogs

### Status Indicators

- 🟢 **OK** - Within all limits
- 🟡 **WARNING** - Approaching limits
- 🔴 **ERROR** - Outside limits

### Unit Conversions

- Weight: 1 lb = 0.454 kg
- Length: 1 in = 2.54 cm
- Moment: 1 lb-in = 1.152 kg-cm

### Common Workflows

**Quick Check:**
1. Select aircraft
2. Add items from library
3. Check status

**Save Template:**
1. Configure item
2. Click 💾 on item
3. Name & save

**Switch Units:**
1. Click unit toggle (header)
2. All values auto-convert

**Edit Envelope:**
1. Click 📊 Edit Envelope
2. Modify parameters
3. Click ✓ Validate
4. Save changes

### Data Storage

- Auto-saves to localStorage
- Configurations saved as JSON
- Templates persistent
- Recent configs tracked

### Validation Types

**Envelope:**
- Polygon closure
- Vertex ordering
- Self-intersection
- Limit consistency

**Loading:**
- Weight limits
- CG limits
- Category verification

### Tips

✅ Always verify with official POH  
✅ Save before major changes  
✅ Use templates for common items  
✅ Check status after each change  
✅ Double-check CG position  

⚠️ Sample data for demo only  
⚠️ Verify with actual aircraft data  
⚠️ Follow proper procedures  
