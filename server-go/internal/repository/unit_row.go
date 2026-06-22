package repository

// Mirrors server/repository/src/db_diesel/unit_row.rs. Untracked (not in changelog); delete is
// a soft delete (is_active = false).

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

type UnitRow struct {
	ID          string
	Name        string
	Description sql.NullString
	Index       int32
	IsActive    bool
}

type UnitRowRepository struct {
	exec    synctypes.Exec
	dialect db.Dialect
}

func NewUnitRowRepository(exec synctypes.Exec, d db.Dialect) *UnitRowRepository {
	return &UnitRowRepository{exec: exec, dialect: d}
}

func (r *UnitRowRepository) UpsertOne(row *UnitRow) error {
	q := sq.Insert("unit").
		Columns("id", "name", "description", `"index"`, "is_active").
		Values(row.ID, row.Name, row.Description, row.Index, row.IsActive).
		Suffix(`ON CONFLICT(id) DO UPDATE SET ` +
			`name = excluded.name, description = excluded.description, ` +
			`"index" = excluded."index", is_active = excluded.is_active`).
		PlaceholderFormat(syncPlaceholder(r.dialect))
	_, err := q.RunWith(r.exec).Exec()
	return err
}

// Delete is a soft delete (is_active = false), mirroring UnitRowRepository::delete.
func (r *UnitRowRepository) Delete(id string) error {
	q := sq.Update("unit").Set("is_active", false).Where(sq.Eq{"id": id}).
		PlaceholderFormat(syncPlaceholder(r.dialect))
	_, err := q.RunWith(r.exec).Exec()
	return err
}

func (r *UnitRowRepository) FindOneByID(id string) (*UnitRow, error) {
	q := sq.Select("id", "name", "description", `"index"`, "is_active").
		From("unit").Where(sq.Eq{"id": id}).PlaceholderFormat(syncPlaceholder(r.dialect))
	var row UnitRow
	err := q.RunWith(r.exec).QueryRow().Scan(&row.ID, &row.Name, &row.Description, &row.Index, &row.IsActive)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

// --- synctypes.Upsert / synctypes.Delete (untracked -> (0, false, ...)) ---

func (row UnitRow) Upsert(tx synctypes.Exec, d db.Dialect) (int64, bool, error) {
	return 0, false, NewUnitRowRepository(tx, d).UpsertOne(&row)
}

type UnitRowDelete struct{ ID string }

func (del UnitRowDelete) Delete(tx synctypes.Exec, d db.Dialect) (int64, bool, error) {
	return 0, false, NewUnitRowRepository(tx, d).Delete(del.ID)
}
