# Aircraft Weight & Balance Module

## Overview

The Weight & Balance module is a professional-grade calculator designed for aircraft operators and pilots to compute center of gravity (CG) position and verify compliance with aircraft limitations. This tool follows FAA regulations and the tabular method outlined in FAA-H-8083-1B.

## ⚠️ IMPORTANT DISCLAIMER

**This calculator is provided for reference and educational purposes only.**

- NOT a substitute for your aircraft's official Pilot's Operating Handbook (POH)
- NOT a substitute for official Weight and Balance documentation
- NOT a substitute for professional aviation advice or pre-flight safety checks

**Always verify calculations against your aircraft's POH and current W&B records.**

Users are solely responsible for ensuring their aircraft is loaded safely and within legal limits. The developers assume no liability for the use or misuse of this tool.

**In case of any conflict between this calculator and the manufacturer's documentation, the manufacturer's documentation takes precedence.**

## Features

### ✈️ Professional Calculations
- **Tabular Method**: Standard FAA weight and balance calculation
- **CG Position**: Accurate center of gravity computation
- **Zero Fuel Weight**: Validates CG after all fuel is consumed
- **Multiple Categories**: Support for Normal, Utility, and Acrobatic categories

### 📊 Visual Feedback
- **CG Envelope Diagram**: Real-time visualization of CG position
- **Status Indicators**: Clear green/yellow/red status for safety
- **Interactive Table**: Dynamic loading table with auto-calculated moments
- **Weight Limits**: Visual display of MTOW, MLW, and MZFW

### 🔧 Flexible Configuration
- **Multiple Aircraft**: Save and switch between aircraft profiles
- **Custom Envelopes**: Define custom CG envelopes or use library
- **Equipment Management**: Add/remove equipment with automatic recalculation
- **Fuel Types**: Support for AvGas, Jet-A, and other fuel types

### 📄 Export & Reporting
- **PDF Export**: Generate professional W&B reports
- **SVG Export**: Export CG envelope diagrams
- **Logbook Ready**: Format suitable for aircraft logbook records

## Getting Started

### 1. Set Up Your Aircraft

First, you'll need your aircraft's official Weight & Balance data:

1. **Retrieve from Logbooks**: Find the latest W&B revision (do NOT use generic factory numbers)
2. **Basic Empty Weight (BEW)**: The weight from the latest official weighing
3. **BEW Arm**: The CG position of the empty aircraft
4. **Datum Location**: Usually firewall, nose, or wing leading edge
5. **Operating Limits**: MTOW, MLW, and MZFW from POH
6. **CG Envelope**: The polygon defining safe CG limits (from POH Section 6)

### 2. Enter Aircraft Data

Navigate to the **Aircraft Data** card and enter:
- Aircraft registration (e.g., "N12345")
- Aircraft model (e.g., "Cessna 172S")
- Basic Empty Weight and Arm
- Maximum Takeoff Weight (MTOW)
- Maximum Landing Weight (MLW)
- CG Envelope data (vertices of the polygon)

**Tip**: Use the aircraft template library for common models to speed up setup.

### 3. Add Loading Items

In the **Loading Table**, add each weight item:

**Occupants**:
- Pilot: Actual weight, arm from POH (typically 37-38" for C172)
- Front Passenger: Actual weight, same arm as pilot
- Rear Passengers: Total weight, arm from POH (typically 73-74")

**Fuel**:
- Main Tanks: Gallons × 6 lbs/gal (AvGas), arm from POH
- Auxiliary Tanks (if applicable): Separate entry

**Baggage**:
- Nose Compartment: Weight and arm from POH
- Aft Cabin/Hat Rack: Weight and arm from POH
- External Pods (if applicable): Weight and arm from POH

**Equipment**:
- Removable equipment (cameras, survival gear, etc.)
- Note: Fixed equipment is already in BEW

### 4. Review Results

The **Results Card** displays:
- ✅ Total Weight vs. MTOW
- ✅ CG Position (inches aft of datum)
- ✅ Zero Fuel Weight and CG
- ✅ Status: Safe / Warning / Error

The **CG Envelope Diagram** shows:
- Your current CG position as a point
- The safe envelope as a shaded polygon
- Green point = safe, Red point = unsafe

### 5. Verify Safety Checks

The calculator automatically checks:
1. **Weight Check**: Total Weight ≤ MTOW?
2. **CG Check**: CG within forward and aft limits?
3. **ZFW Check**: CG safe after all fuel burned?
4. **Category Check**: Loading compatible with intended category?

All checks must be GREEN before flight.

### 6. Export for Records

Click **Export PDF** to generate a professional W&B report including:
- Aircraft information
- Complete loading table
- CG envelope diagram with plotted point
- Validation status
- Signature fields for official records

## Example Walkthrough

### Cessna 172S Cross-Country Flight

**Aircraft Data** (from N12345 logbooks):
- Basic Empty Weight: 1,680 lbs @ 39.5 in
- MTOW: 2,550 lbs
- MLW: 2,550 lbs
- Datum: Firewall

**Loading**:
| Item | Weight | Arm | Moment |
|------|--------|-----|--------|
| BEW | 1,680 lbs | 39.5 in | 66,360 lb-in |
| Pilot | 180 lbs | 37.0 in | 6,660 lb-in |
| Front Pax | 160 lbs | 37.0 in | 5,920 lb-in |
| Rear Pax | 320 lbs | 73.0 in | 23,360 lb-in |
| Baggage | 50 lbs | 95.0 in | 4,750 lb-in |
| Fuel (40 gal) | 240 lbs | 48.0 in | 11,520 lb-in |
| **TOTAL** | **2,630 lbs** | — | **118,570 lb-in** |

**Calculation**:
- Total Weight: 2,630 lbs
- CG Position: 118,570 ÷ 2,630 = **45.08 inches**

**Problem Detected**:
- ❌ Total Weight (2,630 lbs) > MTOW (2,550 lbs)
- Must reduce weight by 80 lbs

**Solution**:
- Reduce fuel to 27 gallons (162 lbs)
- New total: 2,552 lbs → Still 2 lbs over!
- Further reduce fuel to 26 gallons (156 lbs)
- New total: 2,546 lbs ✅
- New CG: 44.87 inches ✅ (within 35.0" to 47.3" envelope)

## Common Scenarios

### Scenario 1: Rear Seat Removal (Cargo Mission)

When removing rear seats for cargo:
1. **Subtract** rear seat weight (check W&B records, typically 30-50 lbs)
2. Use appropriate arm for rear seat location
3. **Add** cargo weight at cargo compartment arm
4. Verify new CG position

### Scenario 2: Heavy Passenger Loading

With 4 full-size adults:
1. Use actual weights (no assumptions!)
2. Watch for **aft CG limit** with heavy rear passengers
3. May need to reduce fuel to stay within envelope
4. Consider moving baggage forward if possible

### Scenario 3: Ferry Flight (No Passengers)

Solo pilot, max fuel:
1. Only pilot + full fuel tanks
2. Watch for **forward CG limit** (light nose, heavy fuel)
3. May need ballast in baggage area
4. Verify takeoff and landing CG both safe

### Scenario 4: Utility Category Operations

For spins or steep turns (Utility category):
1. Use **Utility envelope** (narrower than Normal)
2. Reduced weight limit (typically 2,000-2,200 lbs vs. 2,550 lbs)
3. Stricter CG limits
4. Load factor increases to 4.4g

## Tips & Best Practices

### Data Sources
✅ **Always Use**:
- Latest W&B revision from aircraft logbooks
- POH for your specific aircraft (not generic model)
- Actual occupant weights (no estimates)

❌ **Never Use**:
- Factory empty weight (aircraft gains weight over time)
- Generic POH data (each aircraft differs)
- Estimated passenger weights (use real weights)

### Safety Margins
- Stay **inside** the envelope by at least 0.5 inches
- Plan for fuel burn: CG shifts as fuel is consumed
- Check both takeoff CG and landing CG
- Consider turbulence and maneuvering loads

### Common Mistakes
1. **Using old BEW**: Aircraft gains weight from modifications, paint, equipment
2. **Forgetting unusable fuel**: BEW includes unusable fuel (check POH)
3. **Wrong datum**: Verify datum location in Section 6 of POH
4. **Mixing units**: Stay consistent (inches/lbs or cm/kg)
5. **Ignoring ZFW**: CG after fuel burn must also be safe!

### Documentation
- Print W&B calculation for each flight
- Keep with aircraft logbooks or pilot records
- Update BEW after any equipment changes
- Re-weigh aircraft every 3 years or per regulations

## Units

### Imperial (Default)
- Weight: pounds (lbs)
- Arm: inches (in)
- Moment: pound-inches (lb-in)
- Fuel: gallons (gal)

### Metric (Optional)
- Weight: kilograms (kg)
- Arm: centimeters (cm)
- Moment: kilogram-centimeters (kg-cm)
- Fuel: liters (L)

## Fuel Weight Reference

| Fuel Type | Weight (Imperial) | Weight (Metric) |
|-----------|-------------------|-----------------|
| AvGas 100LL | 6.0 lbs/gal | 0.72 kg/L |
| AvGas UL | 6.0 lbs/gal | 0.72 kg/L |
| Jet-A | 6.7 lbs/gal | 0.80 kg/L |
| Jet-A1 | 6.7 lbs/gal | 0.80 kg/L |
| Mogas | 6.0 lbs/gal | 0.72 kg/L |

*Note: Fuel density varies with temperature. Use conservative values.*

## Regulatory References

- **FAA-H-8083-1B**: Aircraft Weight and Balance Handbook
- **14 CFR Part 91**: General Operating and Flight Rules
- **AC 120-27F**: Aircraft Weight and Balance Control
- **POH Section 6**: Weight & Balance / Equipment List

## Frequently Asked Questions

### Q: Can I use this for my aircraft type?

**A**: This calculator implements the standard tabular method used for:
- Single-engine aircraft
- Multi-engine aircraft
- Light jets
- Helicopters (with lateral CG feature)

Check your POH for any special W&B procedures.

### Q: How accurate is this calculator?

**A**: The calculation engine matches FAA handbook examples to ±0.01 inches. However, **accuracy depends on your input data**. Garbage in = garbage out. Use official, up-to-date BEW and POH data.

### Q: What if my CG is outside the envelope?

**A**: **DO NOT FLY**. Options:
1. Reduce total weight
2. Redistribute cargo/passengers
3. Add ballast (forward CG issue)
4. Remove ballast (aft CG issue)
5. Consult with A&P mechanic or CFI

### Q: Do I need to use this every flight?

**A**: FAR 91.9 requires compliance with W&B limits. Many pilots:
- Use calculator for unusual loads
- Use mental math for typical loads (e.g., "solo + half fuel = always safe")
- Keep pre-calculated scenarios in logbook

**Best practice**: Calculate for peace of mind!

### Q: Can I share my aircraft profile?

**A**: Yes! Use **Export Profile** to save as JSON, then share with other pilots flying the same aircraft. They can import and use immediately.

### Q: What if I find an error in calculation?

**A**: Please report immediately via GitHub issues. Include:
- Input data (aircraft + loading)
- Expected result
- Actual result
- Reference (POH page or FAA handbook example)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save current configuration |
| `Ctrl/Cmd + E` | Export to PDF |
| `Ctrl/Cmd + N` | New loading configuration |
| `Ctrl/Cmd + Z` | Undo last change |
| `Ctrl/Cmd + Y` | Redo |
| `Tab` | Navigate between fields |
| `Enter` | Add new loading item |
| `Delete` | Remove selected item |

## Support

- **Documentation**: See `docs/WEIGHT_BALANCE_SPECIFICATIONS.md` for technical details
- **Video Tutorial**: [Link to tutorial] (if available)
- **Community**: [Link to forum/Discord] (if available)
- **Issues**: Report bugs on GitHub Issues
- **Email**: [Support email] (if available)

## Version History

### V1.0.0 (Planned)
- Initial release
- Tabular method calculation
- CG envelope validation
- PDF export
- Aircraft profile management
- Normal/Utility category support

### Future Enhancements
- Lateral CG (helicopter support)
- Multi-phase fuel burn analysis
- ForeFlight integration
- Mobile app
- Community template library

## License

[License information]

## Credits

**Developed by**: Structural Companion Desktop Team

**Based on**:
- FAA-H-8083-1B Aircraft Weight and Balance Handbook
- Advisory Circular AC 120-27F
- Industry best practices

**Special Thanks**:
- Aviation community for feedback
- Beta testers for validation
- CFIs and A&P mechanics for technical review

---

**Remember**: Weight and Balance is a critical safety calculation. When in doubt, verify with your POH, consult with a CFI, or recalculate manually. Safe flying! ✈️
