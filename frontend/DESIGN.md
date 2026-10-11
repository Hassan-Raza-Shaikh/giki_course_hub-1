# GIKI Course Hub design guide

Read this before adding a page, modal or widget. The app ships ~30 themes
(`data-theme` on `<html>`), so **never hard-code a colour**: every colour must
come from a CSS variable, or the feature will look broken in dark and novelty
themes.

- Theme palettes: `src/styles/global.css` (one block per theme)
- Semantic tokens + component classes: `src/styles/ui.css`
- React components: `src/components/ui/` (`import { Card, Button, … } from '../components/ui'`)

## The look

In-page UI uses a **soft card** style:

| Element | Rule |
|---|---|
| Surfaces | `var(--bg-card)` fill, `1px solid var(--border)`, `24px` radius, soft shadow |
| Buttons, inputs, chips | pill shape (`100px` radius) |
| Text areas, selects in forms | `16px` radius |
| Page title | `2rem`, weight 900, `-0.02em` tracking, theme heading font |
| Secondary text | `var(--text-muted)`; hints `var(--text-light)` |
| Accent text / icons | `var(--primary)`; use `--secondary`, `--tertiary`, `--electric` for variety |
| Icons | `lucide-react`, `strokeWidth={2.5}` for headers, default elsewhere |

The marketing/landing parts and `.btn-primary` / `.btn-outline` keep the
"neo-brutalist" offset shadows; do not mix those into new in-page UI.

## Tokens

Theme palette (set per theme): `--primary`, `--primary-dark`, `--secondary`,
`--accent`, `--tertiary`, `--electric`, `--bg-hero`, `--bg-body`, `--bg-card`,
`--bg-white`, `--bg-subtle`, `--text`, `--text-muted`, `--text-light`, `--border`,
`--font-primary`.

Semantic (from `ui.css`, derived from the palette so they work everywhere):

| Token | Use |
|---|---|
| `--success` `--danger` `--warning` `--info` | status text, icons, borders |
| `--success-soft` … `--info-soft`, `--neutral-soft` | status backgrounds (pills, banners) |
| `--success-fill` `--danger-fill` `--warning-fill` | solid button fills (white text) |
| `--on-primary` | text on a `--primary` fill (**not** `white`) |
| `--on-status` | text on a `*-fill` |
| `--primary-soft` `--primary-line` | selected rows, primary pills |
| `--shadow-soft` `--shadow-card` `--shadow-pop` | small / card / modal elevation |
| `--radius-pill` `--radius-card` `--radius-tile` | 100px / 24px / 16px |
| `--space-1` … `--space-8` | 4, 8, 12, 16, 24, 32, 40, 64 px |
| `--z-nav` `--z-dropdown` `--z-modal` `--z-toast` | stacking |

Rules of thumb:
- Red means `--danger`, never `--accent` (accent is lime, brown or grey in some themes).
- Never put `white` text on `--primary`, `--tertiary` or `--electric`; several themes make those light.
- Hover backgrounds are `var(--bg-subtle)`, not a light hex like `#FAF5FF`.

## Components

```jsx
import { PageHeader, SectionHeader, Card, Button, Badge, StatusBadge, Alert, EmptyState, Modal } from '../components/ui';
```

**Page shell + header** (every top-level page)
```jsx
<div className="ui-page">
  <div className="page-container" style={{ maxWidth: 1000 }}>
    <PageHeader
      icon={<CalendarDays size={40} strokeWidth={2.5} />}
      title="GIKI Calendar"
      subtitle="Exams, deadlines and campus events."
      actions={<Button variant="primary">Add event</Button>}
    />
    …
  </div>
</div>
```

**Section header** (title row above a group; put "Download all" here)
```jsx
<SectionHeader icon={<Presentation size={20} />} title="Slides" count={files.length}
  action={<Button size="sm" icon={<Download size={14} />}>Download all</Button>} />
```

**Card**: `padding="md" | "lg" | "none"`, `interactive` for clickable cards.
```jsx
<Card padding="none">
  <Card.Header><strong>Upcoming</strong></Card.Header>
  <Card.Body>…</Card.Body>
</Card>
```

**Button**: `variant="default" | "primary" | "success" | "danger" | "warning" | "ghost" | "danger-outline"`,
`size="sm" | "md" | "lg"`, `block`, `icon`, `as={Link}` for links. `IconButton label="Close"` for icon-only.

**Badge**: `tone="neutral" | "primary" | "success" | "danger" | "warning" | "info"`.
`<StatusBadge status="pending" />` maps approved/pending/rejected/resolved/dismissed.

**Alert**: inline banner, `tone="danger" | "warning" | "success" | "info"`.

**EmptyState**: `icon`, `title`, `text`, `action`. Wrap in `<Card>` when it stands alone.

**Modal**: portals to `<body>`, closes on Escape and backdrop click, locks scroll.
```jsx
<Modal open={!!target} onClose={close} title="Reject file" icon={<XCircle size={20} />}
  footer={<><Button onClick={close}>Cancel</Button><Button variant="danger" onClick={reject}>Reject</Button></>}>
  <label className="ui-label">Reason</label>
  <textarea className="ui-textarea" />
</Modal>
```

**Toasts**: use `useToast()` from `components/Toast` (`toast.success(msg)`), not a local toast.

**Loading**: `components/common/LoadingSpinner`.

## CSS-only helpers

`ui-input`, `ui-textarea`, `ui-select`, `ui-label`, `ui-field`, `ui-row` (+ `ui-row--hover`),
`ui-divider-label` (the "— SEMESTER 3 —" divider), `ui-progress` / `ui-progress__bar`,
`ui-icon-tile` (+ `--sm`).

Shared keyframes available globally: `fadeIn`, `fadeUp`, `scaleIn`, `slide`, `float`, `shimmer`, `spin`.

## Checklist for a new feature

1. Switch to at least `light`, `dark`, `batman` and `frozen` themes and check it.
2. No hex/rgb colours in JSX (except media such as code viewers).
3. Uses `PageHeader` / `Card` / `Button` / `Modal` rather than hand-rolled copies.
4. Works at 375px wide; the mobile dock covers the bottom 96px.
5. Interactive elements are real `<button>`/`<a>` so keyboard focus rings show.

## Navbar links

Desktop links live in `NAV_LINKS` in `src/components/NavLinks.jsx`. Add an entry
there instead of a new `<button>` in `Navbar.jsx`. Links without `primary: true`
fold into a "More" menu between 769px and 1399px, so a new page never needs its
own breakpoint hack. Mobile users reach pages via `MobileTabBar` and the user menu.
