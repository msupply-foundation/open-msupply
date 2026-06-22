// Package synctypes holds the dependency-free core types of the Go sync engine: the
// translator interface, the value types (sync_buffer / changelog rows, enums) and the
// pull/push result types. It mirrors server/service/src/sync/translations/mod.rs and the
// repository enums (SyncAction, RowActionType, ChangelogTableName). Keeping these in a leaf
// package (importing only internal/db) breaks the import cycle between the concrete
// translators, the row repositories that implement Upsert/Delete, and the engine.
package synctypes

import (
	"database/sql"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
)

// Exec is the minimal execution surface the sync layer needs, satisfied by *sql.DB and
// *sql.Tx (identical shape to migrations.Exec). Threading this — rather than *sql.DB — through
// Upsert/Delete is what lets the integration engine wrap each operation in a transaction.
type Exec interface {
	Exec(query string, args ...any) (sql.Result, error)
	Query(query string, args ...any) (*sql.Rows, error)
	QueryRow(query string, args ...any) *sql.Row
}

// SyncAction is the sync_buffer.action value. Mirrors repository::SyncAction
// (#[DbValueStyle = "SCREAMING_SNAKE_CASE"]).
type SyncAction string

const (
	SyncActionUpsert SyncAction = "UPSERT"
	SyncActionDelete SyncAction = "DELETE"
	SyncActionMerge  SyncAction = "MERGE"
)

// RowAction is the changelog.row_action value. Mirrors repository::RowActionType
// (#[DbValueStyle = "SCREAMING_SNAKE_CASE"]).
type RowAction string

const (
	RowActionUpsert RowAction = "UPSERT"
	RowActionDelete RowAction = "DELETE"
)

// TransportAction is the action on a sync record sent over the wire. Mirrors the transport
// SyncAction in service/src/sync/api/common_records.rs (serialized in PascalCase). Push
// upserts use Update; deletes use Delete.
type TransportAction string

const (
	TransportInsert TransportAction = "Insert"
	TransportUpdate TransportAction = "Update"
	TransportDelete TransportAction = "Delete"
	TransportMerge  TransportAction = "Merge"
)

// ToBufferAction maps a transport action onto the sync_buffer action, mirroring
// SyncAction::to_row_action (Insert/Update -> Upsert).
func (a TransportAction) ToBufferAction() SyncAction {
	switch a {
	case TransportDelete:
		return SyncActionDelete
	case TransportMerge:
		return SyncActionMerge
	default: // Insert, Update
		return SyncActionUpsert
	}
}

// ChangelogTableName is the changelog.table_name value (snake_case). Mirrors
// repository::ChangelogTableName. Only the slice entities are declared; add the rest during
// the mechanical rollout.
type ChangelogTableName string

const (
	ChangelogStockLine   ChangelogTableName = "stock_line"
	ChangelogInvoice     ChangelogTableName = "invoice"
	ChangelogInvoiceLine ChangelogTableName = "invoice_line"
)

// SyncBufferRow mirrors the sync_buffer table (PK record_id). received_datetime/
// integration_datetime are RFC3339 strings for dual-dialect parity (TEXT on SQLite,
// TIMESTAMP on Postgres both accept the format).
type SyncBufferRow struct {
	RecordID            string
	ReceivedDatetime    string
	IntegrationDatetime sql.NullString
	IntegrationError    sql.NullString
	TableName           string
	Action              SyncAction
	Data                string
	SourceSiteID        sql.NullInt32
}

// ChangelogRow mirrors the changelog table / changelog_deduped view. NameLinkID is the
// name_link_id column (the view exposes it under that name).
type ChangelogRow struct {
	Cursor       int64
	TableName    ChangelogTableName
	RecordID     string
	RowAction    RowAction
	NameLinkID   sql.NullString
	StoreID      sql.NullString
	IsSyncUpdate bool
	SourceSiteID sql.NullInt32
}

// Upsert mirrors repository::Upsert. Returns the changelog cursor and whether one was
// produced — tracked == false is the Rust Ok(None) (table not in changelog).
type Upsert interface {
	Upsert(tx Exec, d db.Dialect) (cursor int64, tracked bool, err error)
}

// Delete mirrors repository::Delete.
type Delete interface {
	Delete(tx Exec, d db.Dialect) (cursor int64, tracked bool, err error)
}
