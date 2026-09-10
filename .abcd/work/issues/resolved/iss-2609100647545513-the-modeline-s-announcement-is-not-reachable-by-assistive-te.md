---
schema_version: 1
id: "iss-2609100647545513"
slug: "the-modeline-s-announcement-is-not-reachable-by-assistive-te"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "intent-audit"
origin: researcher-authored
production_mode: hand-written
found_at: "src/modeline.ts"
resolution: "The message cell alone becomes the live region: role=status with aria-live=polite and aria-atomic=true written out, because the role's implicit values are not honoured uniformly and this cell's behaviour is load-bearing. Nothing else in the footer is live — the pane, the chapter, the cursor position and the trail all change under a moving caret, so a wider region would recite the cursor's position on every keystroke, and a test asserts the message cell is the only live element and that the trail's own aria-label sits outside it. Polite because every message here answers a key the author has just pressed. The repeated-identical-message problem is solved with an announcement count that announce() moves and refresh() does not, and the cell is rewritten when the message differs or the count does, replacing the text node rather than assigning a string a cell already holds"
impact: fix
---

The modeline's announcement is not reachable by assistive technology: src/modeline.ts carries no aria-live region and no role=status anywhere, so Nowhere else to go, No region to change case, Table alignment on and every prose refusal are visible and silent, while the criteria that promise them claim assistive-technology reachability as inherited from itd-2609061324342715

## Grounds

- pursued: a chord claimed so the platform does not act on it owes every author the reason, and a refusal that is visible and silent keeps the claim while withholding the reason from exactly the readers who most need it; wrong if VoiceOver turns out to announce the region on a redraw the count did not move, which only the manual check M38-4 can settle
