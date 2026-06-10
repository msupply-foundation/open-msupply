package migrations

import (
	"database/sql"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
)

// Link views (invoice_view, stock_line_view, …) resolve *_link_id columns back to their
// *_id via the name_link / item_link tables. They are NOT in the base dump — the Rust server
// drops & rebuilds them around migrations (server/repository/src/migrations/views/link_views.rs).
// The SQL below is lifted verbatim; reads in the repository layer go through these views,
// exactly as Diesel's `define_linked_tables! { view: invoice = "invoice_view", ... }` does.
//
// This is the subset needed for the WS2 repository slice; the remaining link views and the
// ~28 stat/ledger views port the same way (pure SQL).

// NOTE: only invoice_view is rebuilt here — it's all the WS2 repository slice reads. The
// full set in link_views.rs (stock_line_view, etc.) references columns added by migrations
// AFTER the v2.15.0 base (e.g. stock_line.manufacturer_link_id), so it can only be created
// once those migrations have run. Behavioral finding worth recording: SQLite validates view
// column references LAZILY (at query time) while Postgres validates EAGERLY (at CREATE VIEW),
// so a premature rebuild silently succeeds on SQLite but errors on Postgres.
const dropLinkViews = `
	DROP VIEW IF EXISTS invoice_view;
`

const rebuildLinkViews = `
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

// rebuildViews mirrors the Rust drop_views + rebuild_views step run after migrations.
func rebuildViews(conn *sql.DB, _ db.Dialect) error {
	if _, err := conn.Exec(dropLinkViews); err != nil {
		return err
	}
	_, err := conn.Exec(rebuildLinkViews)
	return err
}
