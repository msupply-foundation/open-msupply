// Package changelog is the changelog repository used by the push side: it reads outgoing
// changes from the changelog_deduped view and lets the integration engine stamp the
// source-site id / is_sync_update flag on a freshly-written changelog row. Mirrors
// server/repository/src/db_diesel/changelog/changelog.rs.
package changelog

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

type Repository struct {
	exec    synctypes.Exec
	dialect db.Dialect
}

func New(exec synctypes.Exec, d db.Dialect) *Repository {
	return &Repository{exec: exec, dialect: d}
}

func (r *Repository) ph() sq.PlaceholderFormat {
	if r.dialect == db.Postgres {
		return sq.Dollar
	}
	return sq.Question
}

// LatestCursor returns MAX(cursor) or 0, mirroring ChangelogRepository::latest_cursor.
func (r *Repository) LatestCursor() (int64, error) {
	q := sq.Select("COALESCE(MAX(cursor), 0)").From("changelog").PlaceholderFormat(r.ph())
	var cursor int64
	if err := q.RunWith(r.exec).QueryRow().Scan(&cursor); err != nil {
		return 0, err
	}
	return cursor, nil
}

// Changelogs returns deduped changelog rows with cursor >= earliest, ordered by cursor,
// limited. Mirrors ChangelogRepository::changelogs (reads changelog_deduped).
func (r *Repository) Changelogs(earliest int64, limit uint64) ([]synctypes.ChangelogRow, error) {
	q := sq.Select("cursor", "table_name", "record_id", "row_action", "name_link_id",
		"store_id", "is_sync_update", "source_site_id").
		From("changelog_deduped").
		Where(sq.GtOrEq{"cursor": earliest}).
		OrderBy("cursor ASC").
		Limit(limit).
		PlaceholderFormat(r.ph())

	rows, err := q.RunWith(r.exec).Query()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []synctypes.ChangelogRow
	for rows.Next() {
		var cl synctypes.ChangelogRow
		var tableName, rowAction string
		if err := rows.Scan(&cl.Cursor, &tableName, &cl.RecordID, &rowAction,
			&cl.NameLinkID, &cl.StoreID, &cl.IsSyncUpdate, &cl.SourceSiteID); err != nil {
			return nil, err
		}
		cl.TableName = synctypes.ChangelogTableName(tableName)
		cl.RowAction = synctypes.RowAction(rowAction)
		out = append(out, cl)
	}
	return out, rows.Err()
}

// SetSourceSiteIDAndIsSyncUpdate stamps a changelog row written during integration so it is
// not re-pushed back to its origin. Mirrors set_source_site_id_and_is_sync_update.
func (r *Repository) SetSourceSiteIDAndIsSyncUpdate(cursor int64, sourceSiteID sql.NullInt32) error {
	q := sq.Update("changelog").
		Set("source_site_id", sourceSiteID).
		Set("is_sync_update", true).
		Where(sq.Eq{"cursor": cursor}).
		PlaceholderFormat(r.ph())
	_, err := q.RunWith(r.exec).Exec()
	return err
}
