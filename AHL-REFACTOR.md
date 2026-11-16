# AHL journal simplification (review branch)

The original Trade Journal and QSE logic remain in `Trade Journal.html`. PSX now opens with a compact AHL overview including cash running-balance checks; the existing advanced charts are inside a collapsible section. Existing localStorage keys (`tj.data`, `tj.prices`, `tj.fees`, `tj.log`) and JSON backup version 1 remain unchanged.

## Accounting
`ahl-journal.js` computes weighted-average cost from AHL ledger transactions. Buy amounts include broker costs, sell proceeds are net amounts, and same-day Difference records contribute realized cash P&L without changing holdings. An oversell is flagged rather than silently assigning zero cost. Identical ledger rows are retained because separate fills can legitimately have identical values; imports still replace their respective dataset rather than append.

Order/ledger reconciliation compares per-symbol net quantities by clearing/statement date. This is **not** a complete cash reconciliation, and AHL Difference netting or nonstandard settlement dates may require manual investigation. The legacy reports are intentionally unchanged pending verified broker fixtures.

## Run tests
Requires Node.js 18 or newer:
```sh
node --test tests/*.test.cjs
```

## Follow-up before merge
- Validate real AHL exports against broker balances and cash charges.
- Reconcile the parsed closing cash balance against deposits, fees, and every settlement; running-balance checks are included but do not replace complete cash reconciliation.
- Test partial fills, same-day round trips, corporate actions, and missing opening positions.
- Introduce incremental imports only after reliable broker transaction IDs are available; current replace semantics preserve existing user data and backups.
- Run browser regression tests for QSE and restore/export workflows.

No existing user data is migrated or deleted by this change.
