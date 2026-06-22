package migrations

import (
	"database/sql"
	"fmt"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
)

// Views are (re)created after migrations, mirroring the Rust server's drop_views + rebuild_views
// step (server/repository/src/migrations/views/mod.rs): the Rust server recreates ALL views on
// startup, in a hardcoded dependency order, so they never go stale. orderedViews() is the Go
// analogue of all_views() — views are dropped in REVERSE order and rebuilt in FORWARD order.
//
// This matters because the Go base dumps are inconsistent: sqlite_latest.sql bakes in the
// stat/ledger views, but postgres_latest.sql contains NO views at all. Recreating here is what
// gives a freshly-bootstrapped Postgres database its views (and idempotently refreshes SQLite's).
//
// Only the views the ported subsystems need are defined so far:
//   - changelog_deduped: required by the sync push path (reads the deduped changelog view).
//   - invoice_view: the linked-table read view for the WS2 repository slice.
//
// The remaining ~28 stat/ledger/report/link views in link_views.rs port the same way (pure SQL).
// Several reference columns added by post-v2.15.0 migrations, so they are deferred — and remain a
// known Postgres gap until added here (SQLite gets them from its base dump).
//
// Behavioural note: SQLite validates view column references lazily (at query time) while Postgres
// validates eagerly (at CREATE VIEW), so a premature rebuild silently succeeds on SQLite but
// errors on Postgres — which is why only fully-satisfiable views are listed.

type viewDef struct {
	name string
	sql  string
}

func orderedViews() []viewDef {
	return []viewDef{
		{name: "changelog_deduped", sql: changelogDedupedView},
		{name: "invoice_view", sql: invoiceView},
	}
}

// changelogDedupedView keeps only the latest change per (record_id, store_id). Identical SQL on
// both dialects (matches the definition in the SQLite base dump and the columns the sync
// changelog repository reads). Mirrors server/repository/src/migrations/views/changelog_deduped.rs.
const changelogDedupedView = `
	CREATE VIEW changelog_deduped AS
	SELECT c.cursor,
		c.table_name,
		c.record_id,
		c.row_action,
		c.name_link_id,
		c.store_id,
		c.is_sync_update,
		c.source_site_id
	FROM (
		SELECT record_id, store_id, MAX(cursor) AS max_cursor
		FROM changelog
		GROUP BY record_id, store_id
	) grouped
	INNER JOIN changelog c
		ON c.record_id = grouped.record_id
		AND (c.store_id = grouped.store_id OR (c.store_id IS NULL AND grouped.store_id IS NULL))
		AND c.cursor = grouped.max_cursor
	ORDER BY c.cursor;
`

// invoiceView resolves *_link_id columns back to *_id via name_link, exactly as Diesel's
// define_linked_tables! { view: invoice = "invoice_view", ... } does.
const invoiceView = `
	CREATE VIEW invoice_view AS
	SELECT
		invoice.*,
		name_link.name_id as name_id,
		default_donor_link.name_id as default_donor_id
	FROM
		invoice
	JOIN
		name_link ON invoice.name_link_id = name_link.id
	LEFT JOIN
		name_link AS default_donor_link ON invoice.default_donor_link_id = default_donor_link.id;
`

// rebuildViews drops (reverse order) and recreates (forward order) the views after migrations,
// mirroring the Rust drop_views + rebuild_views step.
func rebuildViews(conn *sql.DB, _ db.Dialect) error {
	views := orderedViews()
	for i := len(views) - 1; i >= 0; i-- {
		if _, err := conn.Exec("DROP VIEW IF EXISTS " + views[i].name); err != nil {
			return fmt.Errorf("drop view %s: %w", views[i].name, err)
		}
	}
	for _, v := range views {
		if _, err := conn.Exec(v.sql); err != nil {
			return fmt.Errorf("rebuild view %s: %w", v.name, err)
		}
	}
	return nil
}
