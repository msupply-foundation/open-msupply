package repository

// Mirrors server/repository/src/db_diesel/reason_option_row.rs. Untracked; delete is soft
// (is_active = false). The legacy sync table name is "options".

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// ReasonOptionType mirrors repository::ReasonOptionType (SCREAMING_SNAKE_CASE values).
type ReasonOptionType string

const (
	ReasonPositiveInventoryAdjustment ReasonOptionType = "POSITIVE_INVENTORY_ADJUSTMENT"
	ReasonNegativeInventoryAdjustment ReasonOptionType = "NEGATIVE_INVENTORY_ADJUSTMENT"
	ReasonOpenVialWastage             ReasonOptionType = "OPEN_VIAL_WASTAGE"
	ReasonClosedVialWastage           ReasonOptionType = "CLOSED_VIAL_WASTAGE"
	ReasonReturnReason                ReasonOptionType = "RETURN_REASON"
	ReasonRequisitionLineVariance     ReasonOptionType = "REQUISITION_LINE_VARIANCE"
)

type ReasonOptionRow struct {
	ID       string
	Type     ReasonOptionType
	IsActive bool
	Reason   string
}

type ReasonOptionRowRepository struct {
	exec    synctypes.Exec
	dialect db.Dialect
}

func NewReasonOptionRowRepository(exec synctypes.Exec, d db.Dialect) *ReasonOptionRowRepository {
	return &ReasonOptionRowRepository{exec: exec, dialect: d}
}

func (r *ReasonOptionRowRepository) UpsertOne(row *ReasonOptionRow) error {
	q := sq.Insert("reason_option").
		Columns("id", `"type"`, "is_active", "reason").
		Values(row.ID, string(row.Type), row.IsActive, row.Reason).
		Suffix(`ON CONFLICT(id) DO UPDATE SET ` +
			`"type" = excluded."type", is_active = excluded.is_active, reason = excluded.reason`).
		PlaceholderFormat(syncPlaceholder(r.dialect))
	_, err := q.RunWith(r.exec).Exec()
	return err
}

// Delete is a soft delete (is_active = false), mirroring ReasonOptionRowRepository::soft_delete.
func (r *ReasonOptionRowRepository) Delete(id string) error {
	q := sq.Update("reason_option").Set("is_active", false).Where(sq.Eq{"id": id}).
		PlaceholderFormat(syncPlaceholder(r.dialect))
	_, err := q.RunWith(r.exec).Exec()
	return err
}

func (r *ReasonOptionRowRepository) FindOneByID(id string) (*ReasonOptionRow, error) {
	q := sq.Select("id", `"type"`, "is_active", "reason").
		From("reason_option").Where(sq.Eq{"id": id}).PlaceholderFormat(syncPlaceholder(r.dialect))
	var row ReasonOptionRow
	var typ string
	err := q.RunWith(r.exec).QueryRow().Scan(&row.ID, &typ, &row.IsActive, &row.Reason)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	row.Type = ReasonOptionType(typ)
	return &row, nil
}

func (row ReasonOptionRow) Upsert(tx synctypes.Exec, d db.Dialect) (int64, bool, error) {
	return 0, false, NewReasonOptionRowRepository(tx, d).UpsertOne(&row)
}

type ReasonOptionRowDelete struct{ ID string }

func (del ReasonOptionRowDelete) Delete(tx synctypes.Exec, d db.Dialect) (int64, bool, error) {
	return 0, false, NewReasonOptionRowRepository(tx, d).Delete(del.ID)
}
