# Toonly UI Registry

## Baseline — Established 2026-07-22

The interface uses a warm, creator-tool aesthetic inspired by quiet editorial workspaces. New components should use the existing CSS variables in `src/styles.css` rather than introducing one-off color, radius, or shadow values.

| Property | Correct pattern |
| --- | --- |
| App background | `var(--canvas)` / `#f3f3ee` |
| Panel background | `var(--surface)` or `#fbfbf8` |
| Soft control background | `var(--surface-soft)` / `#f7f7f3` |
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
| Background | `var(--ink)` |
| Border | `1px solid var(--ink)` |
| Border radius | 13–15px |
| Text — primary | White, 12px, weight 680 |
| Spacing | 42–50px height; 15–21px inline padding |
| Hover state | One-pixel lift, slightly lighter ink, stronger shadow |
| Shadow | Compact dark elevation shadow |
| Accent usage | Lime is not used for primary button fills |

**Pattern notes:** Primary actions are black and compact. Lime communicates state rather than competing with the action hierarchy.

### Preset Card

File: `src/App.tsx`, `src/styles.css` (`.preset-card`)
Last updated: 2026-07-22

| Property | Class or token |
| --- | --- |
| Background | White |
| Border | `var(--line)`; selected uses ink |
| Border radius | 15px |
| Text — primary | 10px, bold ink |
| Text — secondary | 8px, `#999b93` |
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
| Background | 93% white with backdrop blur |
| Border | Soft neutral translucent border |
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
