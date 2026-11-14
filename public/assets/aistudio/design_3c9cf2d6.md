# UI/UX Design Specification: Need for Speed: Most Wanted (2005) Style

## 1. Visual Identity & Aesthetic Direction
* **Core Theme:** Gritty, high-contrast mid-2000s urban street racing with a desaturated, industrial atmosphere.
* **Color Palette:**
  * **Primary Accent (Nitrous/Warning/Selection):** `#FF9900` (Amber Orange) & `#E65100` (Burnt Orange)
  * **Background Base:** `#0D0E10` (Asphalt Black) with `#1A1C20` (Carbon Gray) overlays
  * **Text Primary:** `#F4F4F4` (Off-White)
  * **Text Secondary / Muted:** `#8E9299` (Metallic Silver)
  * **Speed/RPM Redline:** `#D32F2F` (Crimson Red)
  * **NOS / Cooldown Blue:** `#00B0FF` (Electric Cyan)
* **Typography:**
  * **Headers & Numbers:** Condensed, bold, italicized sans-serif (e.g., *Impact*, *Eurostile*, *Rajdhani*, or *Orbitron* with `font-style: italic; font-weight: 800; text-transform: uppercase;`).
  * **Body & Sub-labels:** Clean geometric sans-serif (*Roboto Condensed* or *Inter*), tight letter-spacing.
* **UI Geometry:**
  * Sharp, aggressive **15-degree forward-slanted parallelograms** (`transform: skewX(-15deg)`). Avoid rounded corners (`border-radius: 0px`).
  * Subtle semi-transparent dark glass panels (`rgba(13, 14, 16, 0.85)`) with 1px metallic borders (`#3A3E45`).
  * **Post-Processing Vibe:** High contrast, warm sepia/amber sunlight tint, subtle vignette around screen edges.

---

## 2. Main Menu Design

### Layout & Background
* **Live 3D Backdrop:** The player's currently selected car sits idling in an industrial garage/warehouse or under an overcast highway overpass. A slow, cinematic orbital camera pans smoothly around the vehicle with subtle depth-of-field blur.
* **Screen Vignette:** Dark radial gradient around the edges (`box-shadow: inset 0 0 120px rgba(0,0,0,0.9)`) to ensure crisp UI readability.

### Menu Components
1. **Top-Left Header (Player Profile & Rap Sheet):**
   * Displays **Alias/Player Name**, **Current Bounty ($)**, and **Blacklist/Act Rank** (e.g., `RANK #10 — ACT I`).
   * Styled as a slanted dark bar with an amber accent stripe on the left edge.
2. **Left-Aligned Vertical Navigation Stack:**
   * Positioned on the lower-left third of the screen.
   * Slanted parallelogram buttons stacked vertically:
     * `CAREER / RACE SELECT` (Opens Act 1 / Act 2 & Boss progression)
     * `MY CARS / GARAGE` (Car selection & paint/tuning)
     * `QUICK RACE`
     * `OPTIONS`
   * **Hover/Active State:** Button expands slightly to the right, background shifts from dark translucent gray to solid `#FF9900` (Amber Orange), text turns `#0D0E10` (Black), accompanied by a sharp mechanical click SFX.
3. **Bottom Ticker Bar:**
   * A sleek, full-width horizontal bar pinned to the bottom edge displaying control hints (e.g., `[ENTER] SELECT   [ESC] BACK   [Q/E] ROTATE CAMERA`) and a scrolling "Police Scanner / Street News" ticker.

---

## 3. Career / Progression Select Screen (Act & Boss Menu)

* **Blacklist-Style Horizontal Cards:**
  * Races and Bosses are displayed as slanted vertical dossier cards arranged horizontally across the screen.
  * **Standard Race Card:** Displays Race Number (`01`–`04` in Act 1, `05`–`09` in Act 2), Track Name, Race Type (Circuit / Sprint), and a green/amber `COMPLETED` stamp when beaten.
  * **Boss Card (Boss 1 & Final Boss):** Visually distinct, wider card with a skull/crown emblem, Boss Silhouette, Boss Name, and Rival Car preview.
  * **Locked State:** Darkened card (`opacity: 0.5`), diagonal hazard stripes overlay, and a prominent padlock icon with text: `BEAT ALL SECTION RACES TO UNLOCK`.

---

## 4. In-Game Racing HUD

The HUD is minimal, anchored strictly to the four corners of the viewport to keep the center road completely unobstructed.

### Top-Left: Position & Lap Counter
* **Position Indicator:** Oversized italicized numeral (`1st`, `2nd`, etc.) in white with an amber drop shadow (`48px` font size).
* **Lap / Progress Counter:** Directly beneath position (`LAP 1/3` or `45%` for Sprint races) inside a small slanted dark badge.
* **Race Timer:** Clean monospace-aligned digital readout (`01:24.85`) tracking elapsed time.

### Top-Right: Rivals & Boss Indicator
* **Standard Race:** Compact list of top racers and time/distance gaps (`+0.42s`).
* **Boss Battle Overlay:** Replaces standard rival list with a high-contrast **"BOSS DUEL"** banner showing the Boss's name and a horizontal **Distance / Lead Bar** comparing player vs. boss progress.

### Bottom-Left: Minimap & Heat/Warning Status
* **Circular/Slanted Radar:** High-contrast dark radar showing the immediate track layout in light gray (`#CCCCCC`), the player as a bright amber arrow (`#FF9900`), and rivals/bosses as red dots (`#D32F2F`).
* **Speed Lines / Motion Feedback:** Subtle radial blur or white wind streaks around screen edges when exceeding 85% top speed or activating Nitrous.

### Bottom-Right: Analog-Digital Tachometer & NOS Gauge
* **Circular Tachometer:**
  * Semi-circular or 270-degree analog sweep dial with tick marks from `0` to `9` (x1000 RPM).
  * Needle sweeps smoothly in white/amber; numbers above `7` glow `#D32F2F` (Redline) and pulse when it is optimal to shift.
* **Digital Speedometer:**
  * Nested cleanly inside the center-right of the tachometer in large, bold, italicized numerals (`184` with a small `KM/H` or `MPH` label beneath).
* **Gear Indicator:**
  * Circular badge on the bottom-left of the dial displaying current gear (`R`, `N`, `1`–`6`), flashing amber on redline.
* **Curved Nitrous (NOS) & Speedbreaker Bars:**
  * **NOS Bar:** Curved cyan (`#00B0FF`) gauge hugging the outer left rim of the tachometer. Depletes smoothly when boosting and regenerates slowly over time.
  * **Secondary Gauge (Optional/Turbo):** Curved amber (`#FF9900`) bar hugging the outer right rim showing boost pressure or drift charge.

---

## 5. CSS / Implementation Guidelines for Web/Canvas
* Use `skewX(-15deg)` on container divs, and apply `skewX(15deg)` on inner text spans so typography remains readable while keeping slanted boxes.
* Use `tabular-nums` (`font-variant-numeric: tabular-nums;`) on speedometers, timers, and bounty counters to prevent layout jitter as numbers rapidly change.
* Keep all HUD elements inside a `pointer-events: none` overlay container during active gameplay.
