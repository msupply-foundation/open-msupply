// Package syncbuffer is the sync_buffer repository: incoming sync records are buffered here,
// then fetched in dependency order for integration. Mirrors
// server/repository/src/db_diesel/sync_buffer.rs and the ordering/status logic in
// server/service/src/sync/sync_buffer.rs.
package syncbuffer

import (
	"database/sql"
	"time"

	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// SourceKind mirrors SyncBufferSource.
type SourceKind int

const (
	// Central includes all records with no source site id (OMS central) plus the given site.
	Central SourceKind = iota
	// Remote matches only the given source site id.
	Remote
)

type Source struct {
	Kind   SourceKind
	SiteID int32
}

func CentralSource(siteID int32) Source { return Source{Kind: Central, SiteID: siteID} }
func RemoteSource(siteID int32) Source  { return Source{Kind: Remote, SiteID: siteID} }

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

// Insert upserts buffer rows (ON CONFLICT(record_id) DO UPDATE), mirroring
// SyncBufferRowRepository::upsert_many. received_datetime defaults to now when blank.
func (r *Repository) Insert(rows []synctypes.SyncBufferRow) error {
	now := time.Now().UTC().Format("2006-01-02T15:04:05")
	for i := range rows {
		row := rows[i]
		if row.ReceivedDatetime == "" {
			row.ReceivedDatetime = now
		}
		q := sq.Insert("sync_buffer").
			Columns("record_id", "received_datetime", "integration_datetime", "integration_error",
				"table_name", "action", "data", "source_site_id").
			Values(row.RecordID, row.ReceivedDatetime, row.IntegrationDatetime, row.IntegrationError,
				row.TableName, string(row.Action), row.Data, row.SourceSiteID).
			Suffix(`ON CONFLICT(record_id) DO UPDATE SET ` +
				`received_datetime = excluded.received_datetime, ` +
				`integration_datetime = excluded.integration_datetime, ` +
				`integration_error = excluded.integration_error, ` +
				`table_name = excluded.table_name, action = excluded.action, ` +
				`data = excluded.data, source_site_id = excluded.source_site_id`).
			PlaceholderFormat(r.ph())
		if _, err := q.RunWith(r.exec).Exec(); err != nil {
			return err
		}
	}
	return nil
}

// GetOrdered returns un-integrated buffer rows for the action, ordered so that for upserts
// dependencies come first and for deletes they come last (reverse). Mirrors
// SyncBuffer::get_ordered_sync_buffer_records.
func (r *Repository) GetOrdered(action synctypes.SyncAction, orderedTables []string, src Source) ([]synctypes.SyncBufferRow, error) {
	order := orderedTables
	if action == synctypes.SyncActionDelete {
		order = make([]string, len(orderedTables))
		for i, t := range orderedTables {
			order[len(orderedTables)-1-i] = t
		}
	}

	var out []synctypes.SyncBufferRow
	for _, table := range order {
		q := sq.Select("record_id", "received_datetime", "integration_datetime", "integration_error",
			"table_name", "action", "data", "source_site_id").
			From("sync_buffer").
			Where(sq.Eq{"table_name": table, "action": string(action)}).
			Where("integration_datetime IS NULL").
			PlaceholderFormat(r.ph())

		switch src.Kind {
		case Central:
			q = q.Where(sq.Or{sq.Eq{"source_site_id": src.SiteID}, sq.Eq{"source_site_id": nil}})
		case Remote:
			q = q.Where(sq.Eq{"source_site_id": src.SiteID})
		}

		rows, err := q.RunWith(r.exec).Query()
		if err != nil {
			return nil, err
		}
		for rows.Next() {
			var row synctypes.SyncBufferRow
			var action string
			if err := rows.Scan(&row.RecordID, &row.ReceivedDatetime, &row.IntegrationDatetime,
				&row.IntegrationError, &row.TableName, &action, &row.Data, &row.SourceSiteID); err != nil {
				rows.Close()
				return nil, err
			}
			row.Action = synctypes.SyncAction(action)
			out = append(out, row)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return nil, err
		}
		rows.Close()
	}
	return out, nil
}

// RecordSuccess marks a buffer row integrated (integration_datetime = now, error cleared).
func (r *Repository) RecordSuccess(row *synctypes.SyncBufferRow) error {
	return r.recordStatus(row.RecordID, sql.NullString{})
}

// RecordError marks a buffer row as errored (integration_datetime = now, error set).
func (r *Repository) RecordError(row *synctypes.SyncBufferRow, msg string) error {
	return r.recordStatus(row.RecordID, sql.NullString{String: msg, Valid: true})
}

func (r *Repository) recordStatus(recordID string, errMsg sql.NullString) error {
	now := time.Now().UTC().Format("2006-01-02T15:04:05")
	q := sq.Update("sync_buffer").
		Set("integration_datetime", now).
		Set("integration_error", errMsg).
		Where(sq.Eq{"record_id": recordID}).
		PlaceholderFormat(r.ph())
	_, err := q.RunWith(r.exec).Exec()
	return err
}
