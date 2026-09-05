# Toonly UI Registry

## Baseline — Established 2026-07-22

The interface uses a warm, creator-tool aesthetic inspired by quiet editorial workspaces. New components should use the existing CSS variables in `src/styles.css` rather than introducing one-off color, radius, or shadow values.

| Property | Correct pattern |
| --- | --- |
| App background | `var(--canvas)`; light `#f3f3ee`, dark `#151612` |
| Panel background | `var(--panel)` or `var(--surface)` |
| Soft control background | `var(--surface-soft)` or `var(--surface-muted)` |
| Standard border | `1px solid var(--line)` |
| Card radius | `var(--radius-md)` / 18px family |
| Large workspace radius | `var(--radius-lg)` / 26px |
| Primary text | `var(--ink)` |
| Muted text | `var(--muted)` or `var(--soft-muted)` |
| Brand accent | `var(--lime)`; reserved for selection, progress, and positive readiness |
| Focus state | 3px green translucent outline with 2px offset |

### Primary Button

File: `src/styles.css` (`.button`, `.button-dark`)
Last updated: 2026-07-22

| Property | Class or token |
| --- | --- |
| Background | `var(--primary)` |
| Border | `1px solid var(--primary)` |
| Border radius | 13–15px |
| Text — primary | `var(--on-primary)`, 12px, weight 680 |
| Spacing | 42–50px height; 15–21px inline padding |
| Hover state | One-pixel lift, slightly lighter ink, stronger shadow |
| Shadow | Compact dark elevation shadow |
| Accent usage | Lime is not used for primary button fills |

**Pattern notes:** Primary actions use the highest-contrast neutral and stay compact. Lime communicates state rather than competing with the action hierarchy.

### Preset Card

File: `src/App.tsx`, `src/styles.css` (`.preset-card`)
Last updated: 2026-07-22

| Property | Class or token |
| --- | --- |
| Background | `var(--surface)` |
| Border | `var(--line)`; selected uses ink |
| Border radius | 15px |
| Text — primary | 10px, bold ink |
| Text — secondary | 8px, `var(--soft-muted)` |
| Spacing | 7px shell, 8px caption offset |
| Hover state | Two-pixel lift and `var(--shadow-sm)` |
| Shadow | None at rest; subtle on hover |
| Accent usage | Lime circular check only when selected |

**Pattern notes:** Artwork fills most of the card. Selection is communicated through border, check icon, and `aria-pressed`, not color alone.

### Floating Composer

File: `src/App.tsx`, `src/styles.css` (`.floating-composer`)
Last updated: 2026-07-22

| Property | Class or token |
| --- | --- |
| Background | `var(--composer)` with backdrop blur |
| Border | `var(--composer-border)` |
| Border radius | 19px desktop, 17px mobile |
| Text — primary | 10px, bold ink |
| Text — secondary | 8px muted labels |
| Spacing | 8px shell, 10px gap |
| Hover state | Generate button uses primary-button lift |
| Shadow | `var(--shadow-lg)` |
| Accent usage | Preset art only; action remains ink-black |

**Pattern notes:** Floating task controls should remain one visual unit. On mobile, fields wrap within the same surface instead of becoming separate cards.

### Status Badge

File: `src/App.tsx`, `src/styles.css` (`.status-badge`, `.result-mode`)
Last updated: 2026-07-22

| Property | Class or token |
| --- | --- |
| Background | Neutral by default; pale green for live state |
| Border | Semantic low-contrast border |
| Border radius | Full pill |
| Text — primary | 9–10px, weight 660–720 |
| Spacing | 7–8px block, 10–11px inline |
| Hover state | None; these are informational |
| Shadow | None |
| Accent usage | Small status dot, never a full saturated fill |

**Pattern notes:** Status indicators use text plus a dot so meaning is never color-only.

### Theme Toggle

File: `src/App.tsx`, `src/styles.css` (`.theme-toggle`)
Last updated: 2026-07-24

| Property | Class or token |
| --- | --- |
| Background | `var(--icon-surface)` |
| Border | `1px solid var(--line)` |
| Border radius | 12px |
| Text — primary | `var(--ink)` |
| Spacing | 38px square icon control |
| Hover state | `var(--icon-surface-hover)`, stronger border, one-pixel lift |
| Shadow | None |
| Accent usage | None; sun and moon icons communicate the available action |

**Pattern notes:** Theme-aware controls consume semantic tokens only. The root `data-theme` attribute defines the palette, the user choice is stored as `toonly-theme`, and first visits follow the operating-system preference. All future surfaces must define both light and dark values through shared tokens rather than component-specific dark overrides.

### Refinement Panel

File: `src/components/RefinementPanel.tsx`, `src/styles.css` (`.feature-panel`, `.refinement-chip`)
Last updated: 2026-09-05

| Property | Class or token |
| --- | --- |
| Background | Parent panel with `var(--surface)` refinement chips |
| Border | `var(--line)`; selected chips use `var(--ink)` |
| Border radius | 10â€“13px control family |
| Text â€” primary | `var(--ink)`, 9â€“12px, weight 680 |
| Text â€” secondary | `var(--muted)` / `var(--soft-muted)` |
| Spacing | 18px section offset, 7px chip grid, 9â€“11px control padding |
| Hover state | One-pixel lift with stronger semantic border |
| Shadow | None except the character-pack entry on hover |
| Accent usage | Lime is limited to selected/positive state inherited from shared tokens |

**Pattern notes:** Dense creative controls use compact two-column chips inside the inspector. Selection combines border, surface, and `aria-pressed`; feature availability is explained in text rather than only through disabled styling.

### Character Pack Gallery

File: `src/components/CharacterPackGallery.tsx`, `src/styles.css` (`.pack-gallery`, `.pack-card`)
Last updated: 2026-09-05

| Property | Class or token |
| --- | --- |
| Background | `var(--panel)` gallery and `var(--surface)` cards |
| Border | `var(--line)` with semantic success/error variants |
| Border radius | `var(--radius-md)` gallery, 14px cards |
| Text â€” primary | `var(--ink)`, 10â€“17px |
| Text â€” secondary | `var(--soft-muted)`, 8px captions |
| Spacing | 18px gallery shell, 10â€“14px grid rhythm |
| Hover state | Download controls strengthen their border |
| Shadow | None; the gallery stays visually secondary to the portrait canvas |
| Accent usage | Lime progress bar and muted green generating state |

**Pattern notes:** Multi-result creative output uses an outcome-first gallery below the main canvas. Loading, error, complete, retry, individual download, and ZIP-ready states share one stable card layout; mobile collapses the grid to two columns.
