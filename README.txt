PARTYZRA PHOTOGRAPHY — 4-COLUMN GRID V1

Replace only:
  photography-content.html

CHANGE:
- Photography gallery uses 4 columns on screens wider than 1000px.
- Existing tablet/mobile breakpoints are untouched.
- No JavaScript changes.
- No changes to albums, Latest, viewer, deep links, share links, loading, or photo order.

The added rule is intentionally a tiny inline CSS override:

@media (min-width: 1001px) {
  .photo-page .photo-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

To revert, restore your previous photography-content.html or remove that rule.
