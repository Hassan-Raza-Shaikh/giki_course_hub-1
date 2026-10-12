"""
Branded HTML layout for every GIKI Course Hub email.

Mirrors the app's look: Outfit type, hard #0F172A borders with offset shadows,
blue primary buttons and amber accents. Everything is table-based with inline
styles so it renders in Gmail, Outlook and mobile clients.

All user-supplied text is escaped here; callers pass plain strings.
"""
from html import escape

# Design tokens (kept in sync with frontend/src/styles/global.css, default theme)
INK = "#0F172A"
MUTED = "#334155"
LIGHT = "#64748B"
PRIMARY = "#2563EB"
AMBER = "#F59E0B"
BODY_BG = "#F5F0FF"
SUBTLE = "#F9FAFB"

TONES = {
    # name: (pill background, pill text, accent bar)
    "success": ("#DCFCE7", "#166534", "#16A34A"),
    "danger":  ("#FEE2E2", "#991B1B", "#DC2626"),
    "warning": ("#FEF3C7", "#92400E", AMBER),
    "info":    ("#DBEAFE", "#1E40AF", PRIMARY),
    "neutral": ("#F1F5F9", MUTED, LIGHT),
}

FONT = "'Outfit', 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif"


def _text(value):
    """Escape user text and keep their line breaks."""
    return escape(str(value or "")).replace("\n", "<br>")


def render_email(*, preheader, tone, badge, heading, greeting=None, paragraphs=(),
                 details=(), items=(), items_title=None, callout=None, callout_title=None,
                 outro=None, cta_label=None, cta_url=None, footer_reason="", manage_url=None,
                 unsubscribe_url=None):
    """
    Build (html, text) for one email.

    details: list of (label, value) rows shown in a bordered box.
    items:   list of strings shown as a numbered list (e.g. file titles).
    callout: highlighted note, e.g. the admin's rejection reason.
    outro:   closing paragraph shown after the boxes, before the button.
    """
    pill_bg, pill_fg, accent = TONES.get(tone, TONES["neutral"])

    blocks = []
    if greeting:
        blocks.append(f'<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:{INK};">{_text(greeting)}</p>')
    for p in paragraphs:
        blocks.append(f'<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:{MUTED};">{_text(p)}</p>')

    if details:
        rows = "".join(
            f'<tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:{LIGHT};text-transform:uppercase;'
            f'letter-spacing:0.04em;width:120px;vertical-align:top;">{_text(label)}</td>'
            f'<td style="padding:8px 0;font-size:15px;font-weight:600;color:{INK};vertical-align:top;">{_text(value)}</td></tr>'
            for label, value in details if value not in (None, "")
        )
        blocks.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;'
            f'background:{SUBTLE};border:2px solid {INK};border-radius:12px;"><tr><td style="padding:10px 18px;">'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table></td></tr></table>'
        )

    if items:
        lis = "".join(f'<li style="margin:0 0 6px;">{_text(i)}</li>' for i in items)
        title = f'<div style="font-size:13px;font-weight:700;color:{LIGHT};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">{_text(items_title)}</div>' if items_title else ""
        blocks.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;'
            f'background:{SUBTLE};border:2px solid {INK};border-radius:12px;"><tr><td style="padding:14px 18px;">'
            f'{title}<ol style="margin:0;padding-left:20px;font-size:15px;font-weight:600;color:{INK};line-height:1.5;">{lis}</ol>'
            f'</td></tr></table>'
        )

    if callout:
        title = f'<div style="font-weight:800;margin-bottom:6px;color:{pill_fg};">{_text(callout_title)}</div>' if callout_title else ""
        blocks.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;">'
            f'<tr><td style="background:{pill_bg};border-left:5px solid {accent};border-radius:8px;padding:14px 16px;'
            f'font-size:15px;line-height:1.55;color:{INK};">{title}{_text(callout)}</td></tr></table>'
        )

    if outro:
        blocks.append(f'<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:{MUTED};">{_text(outro)}</p>')

    if cta_label and cta_url:
        blocks.append(
            f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px 0 6px;"><tr>'
            f'<td style="background:{PRIMARY};border:2px solid {INK};border-radius:10px;box-shadow:3px 3px 0 {INK};">'
            f'<a href="{escape(cta_url, quote=True)}" style="display:inline-block;padding:12px 22px;font-family:{FONT};'
            f'font-size:15px;font-weight:800;color:#FFFFFF;text-decoration:none;">{_text(cta_label)} &rarr;</a>'
            f'</td></tr></table>'
        )

    footer_links = []
    if manage_url:
        footer_links.append(f'<a href="{escape(manage_url, quote=True)}" style="color:{MUTED};font-weight:700;">Email settings</a>')
    if unsubscribe_url:
        footer_links.append(f'<a href="{escape(unsubscribe_url, quote=True)}" style="color:{MUTED};font-weight:700;">Unsubscribe</a>')
    footer_links_html = " &nbsp;&middot;&nbsp; ".join(footer_links)

    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>{_text(heading)}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:{BODY_BG};font-family:{FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{_text(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BODY_BG};">
<tr><td align="center" style="padding:28px 14px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
    <tr><td style="padding:0 4px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="background:{INK};border-radius:10px;padding:8px 14px;font-family:{FONT};font-size:17px;font-weight:900;color:#FFFFFF;letter-spacing:-0.01em;">
          GIKI <span style="color:{AMBER};">Course Hub</span>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#FFFFFF;border:2px solid {INK};border-radius:20px;box-shadow:6px 6px 0 {AMBER};overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="height:8px;background:{accent};border-radius:18px 18px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:28px 30px 30px;font-family:{FONT};">
          <span style="display:inline-block;background:{pill_bg};color:{pill_fg};border:2px solid {INK};border-radius:100px;padding:4px 12px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">{_text(badge)}</span>
          <h1 style="margin:16px 0 18px;font-size:26px;line-height:1.2;font-weight:900;color:{INK};letter-spacing:-0.02em;">{_text(heading)}</h1>
          {''.join(blocks)}
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:20px 8px 0;font-family:{FONT};font-size:12px;line-height:1.6;color:{LIGHT};text-align:center;">
      {_text(footer_reason)}<br>
      {footer_links_html}
      <div style="margin-top:8px;">GIKI Course Hub &middot; Made by students, for students</div>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>"""

    # Plain-text alternative (better deliverability, and readable in any client)
    text_lines = [heading, ""]
    if greeting:
        text_lines += [greeting, ""]
    text_lines += [p + "\n" for p in paragraphs]
    for label, value in details:
        if value not in (None, ""):
            text_lines.append(f"{label}: {value}")
    if details:
        text_lines.append("")
    if items:
        if items_title:
            text_lines.append(items_title)
        text_lines += [f"{n}. {i}" for n, i in enumerate(items, 1)]
        text_lines.append("")
    if callout:
        text_lines += [f"{callout_title}: {callout}" if callout_title else callout, ""]
    if outro:
        text_lines += [outro, ""]
    if cta_label and cta_url:
        text_lines += [f"{cta_label}: {cta_url}", ""]
    text_lines.append("—")
    if footer_reason:
        text_lines.append(footer_reason)
    if manage_url:
        text_lines.append(f"Email settings: {manage_url}")
    if unsubscribe_url:
        text_lines.append(f"Unsubscribe: {unsubscribe_url}")

    return html, "\n".join(text_lines)
