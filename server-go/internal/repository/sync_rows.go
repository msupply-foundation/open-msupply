package repository

// Write-side row repositories for the sync engine. Each synced entity gets a row struct, an
// UpsertOne (INSERT ... ON CONFLICT(id) DO UPDATE) and a Delete (hard or soft, matching the
// Rust repo), plus implementations of synctypes.Upsert / synctypes.Delete. Tracked entities
// (in ChangelogTableName) additionally insert a changelog row and return its cursor; untracked
// entities return (0, false, ...) — the Rust Ok(None).
//
// Mirrors server/repository/src/db_diesel/*_row.rs. All changelog population is app-side (there
// are no DB triggers), so a tracked UpsertOne/Delete must call insertChangelog itself.

import (
	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// syncPlaceholder returns the squirrel placeholder format for the dialect (mirrors the
// InvoiceRepository.placeholder() helper on the read side).
func syncPlaceholder(d db.Dialect) sq.PlaceholderFormat {
	if d == db.Postgres {
		return sq.Dollar
	}
	return sq.Question
}

// insertChangelog inserts a changelog row and returns the new cursor. Mirrors the app-side
// insert_changelog in the Rust row repos (e.g. invoice_row.rs). RETURNING cursor works on both
// modernc.org/sqlite and Postgres. storeID / nameLinkID may be empty (stored as NULL).
func insertChangelog(exec synctypes.Exec, d db.Dialect, tableName synctypes.ChangelogTableName,
	recordID string, action synctypes.RowAction, storeID, nameLinkID string) (int64, error) {

	q := sq.Insert("changelog").
		Columns("table_name", "record_id", "row_action", "store_id", "name_link_id").
		Values(string(tableName), recordID, string(action), nullIfEmpty(storeID), nullIfEmpty(nameLinkID)).
		Suffix("RETURNING cursor").
		PlaceholderFormat(syncPlaceholder(d))

	var cursor int64
	if err := q.RunWith(exec).QueryRow().Scan(&cursor); err != nil {
		return 0, err
	}
	return cursor, nil
}

// nullIfEmpty maps "" to a SQL NULL so optional FK columns stay NULL (not empty string).
func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
