package repository

// Mirrors server/repository/src/db_diesel/store_row.rs. Untracked. The lean StoreRow upsert
// writes every column except logo; StoreLogoRow is a separate partial UPDATE of store.logo
// (there is no store_logo table — logo is a column on store). Delete is a hard delete.

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// StoreMode mirrors repository::StoreMode (SCREAMING_SNAKE_CASE).
type StoreMode string

const (
	StoreModeStore      StoreMode = "STORE"
	StoreModeDispensary StoreMode = "DISPENSARY"
)

type StoreRow struct {
	ID          string
	NameLinkID  string // resolved from name_id; stored in the name_link_id column
	Code        string
	SiteID      int32
	StoreMode   StoreMode
	CreatedDate sql.NullString
	IsDisabled  bool
}

// StoreLogoRow is the (id, logo) projection written separately after the lean StoreRow.
type StoreLogoRow struct {
	ID   string
	Logo sql.NullString
}

type StoreRowRepository struct {
	exec    synctypes.Exec
	dialect db.Dialect
}

func NewStoreRowRepository(exec synctypes.Exec, d db.Dialect) *StoreRowRepository {
	return &StoreRowRepository{exec: exec, dialect: d}
}

func (r *StoreRowRepository) UpsertOne(row *StoreRow) error {
	q := sq.Insert("store").
		Columns("id", "name_link_id", "code", "site_id", "store_mode", "created_date", "is_disabled").
		Values(row.ID, row.NameLinkID, row.Code, row.SiteID, string(row.StoreMode), row.CreatedDate, row.IsDisabled).
		Suffix(`ON CONFLICT(id) DO UPDATE SET ` +
			`name_link_id = excluded.name_link_id, code = excluded.code, site_id = excluded.site_id, ` +
			`store_mode = excluded.store_mode, created_date = excluded.created_date, ` +
			`is_disabled = excluded.is_disabled`).
		PlaceholderFormat(syncPlaceholder(r.dialect))
	_, err := q.RunWith(r.exec).Exec()
	return err
}

// UpdateLogo is a no-op when logo is NULL, mirroring StoreRowRepository::update_logo.
func (r *StoreRowRepository) UpdateLogo(id string, logo sql.NullString) error {
	if !logo.Valid {
		return nil
	}
	q := sq.Update("store").Set("logo", logo.String).Where(sq.Eq{"id": id}).
		PlaceholderFormat(syncPlaceholder(r.dialect))
	_, err := q.RunWith(r.exec).Exec()
	return err
}

func (r *StoreRowRepository) Delete(id string) error {
	q := sq.Delete("store").Where(sq.Eq{"id": id}).PlaceholderFormat(syncPlaceholder(r.dialect))
	_, err := q.RunWith(r.exec).Exec()
	return err
}

func (r *StoreRowRepository) FindOneByID(id string) (*StoreRow, error) {
	q := sq.Select("id", "name_link_id", "code", "site_id", "store_mode", "created_date", "is_disabled").
		From("store").Where(sq.Eq{"id": id}).PlaceholderFormat(syncPlaceholder(r.dialect))
	var row StoreRow
	var mode string
	err := q.RunWith(r.exec).QueryRow().Scan(&row.ID, &row.NameLinkID, &row.Code, &row.SiteID,
		&mode, &row.CreatedDate, &row.IsDisabled)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	row.StoreMode = StoreMode(mode)
	return &row, nil
}

func (r *StoreRowRepository) Logo(id string) (sql.NullString, error) {
	q := sq.Select("logo").From("store").Where(sq.Eq{"id": id}).PlaceholderFormat(syncPlaceholder(r.dialect))
	var logo sql.NullString
	err := q.RunWith(r.exec).QueryRow().Scan(&logo)
	if err == sql.ErrNoRows {
		return sql.NullString{}, nil
	}
	return logo, err
}

func (row StoreRow) Upsert(tx synctypes.Exec, d db.Dialect) (int64, bool, error) {
	return 0, false, NewStoreRowRepository(tx, d).UpsertOne(&row)
}

func (row StoreLogoRow) Upsert(tx synctypes.Exec, d db.Dialect) (int64, bool, error) {
	return 0, false, NewStoreRowRepository(tx, d).UpdateLogo(row.ID, row.Logo)
}

type StoreRowDelete struct{ ID string }

func (del StoreRowDelete) Delete(tx synctypes.Exec, d db.Dialect) (int64, bool, error) {
	return 0, false, NewStoreRowRepository(tx, d).Delete(del.ID)
}
