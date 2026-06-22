package repository

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
)

// StoreRead is the read model for the top-level `stores`/`store` queries (distinct from the
// write-only StoreRow in store_row.go).
type StoreRead struct {
	ID          string
	Code        string
	NameID      string
	StoreName   string
	SiteID      int32
	StoreMode   string
	CreatedDate sql.NullString
	IsDisabled  bool
}

type StoreReadRepository struct {
	conn    *sql.DB
	dialect db.Dialect
}

func NewStoreReadRepository(conn *sql.DB, d db.Dialect) *StoreReadRepository {
	return &StoreReadRepository{conn: conn, dialect: d}
}

func (r *StoreReadRepository) base() sq.SelectBuilder {
	return sq.Select("s.id", "s.code", "nl.name_id", "n.name", "s.site_id", "s.store_mode",
		"s.created_date", "s.is_disabled").
		From("store s").
		Join("name_link nl ON s.name_link_id = nl.id").
		Join("name n ON nl.name_id = n.id").
		PlaceholderFormat(syncPlaceholder(r.dialect))
}

func (r *StoreReadRepository) scanRows(rows *sql.Rows) ([]StoreRead, error) {
	defer rows.Close()
	var out []StoreRead
	for rows.Next() {
		var s StoreRead
		if err := rows.Scan(&s.ID, &s.Code, &s.NameID, &s.StoreName, &s.SiteID, &s.StoreMode,
			&s.CreatedDate, &s.IsDisabled); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *StoreReadRepository) Query() ([]StoreRead, error) {
	rows, err := r.base().RunWith(r.conn).Query()
	if err != nil {
		return nil, err
	}
	return r.scanRows(rows)
}

func (r *StoreReadRepository) FindOneByID(id string) (*StoreRead, error) {
	rows, err := r.base().Where(sq.Eq{"s.id": id}).RunWith(r.conn).Query()
	if err != nil {
		return nil, err
	}
	list, err := r.scanRows(rows)
	if err != nil || len(list) == 0 {
		return nil, err
	}
	return &list[0], nil
}

// IsInitialised reports whether the site has a completed sync (a sync_log row with a non-null
// finished_datetime), mirroring the Rust InitialisationStatus::Initialised condition.
func (r *StoreReadRepository) IsInitialised() (bool, error) {
	q := sq.Select("COUNT(*)").From("sync_log").Where("finished_datetime IS NOT NULL").
		PlaceholderFormat(syncPlaceholder(r.dialect))
	var n int
	if err := q.RunWith(r.conn).QueryRow().Scan(&n); err != nil {
		return false, err
	}
	return n > 0, nil
}
