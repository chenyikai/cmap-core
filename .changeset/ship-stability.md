---
"cmap-core": patch
---

Keep ship management and interaction on one normalized ID index. Render new ships immediately, reuse duplicate IDs, cancel pending selection callbacks on removal/unselection, and clean hover/focus state only after committed map removal.

Generate real hulls in geographic coordinates independently of camera rotation/pitch. Skip unchanged AIS refreshes and duplicate geometry work; batch source updates with constant-time feature removal. Preserve public call patterns, Tooltip appearance, and heading-line calculations.
