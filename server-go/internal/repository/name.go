package repository

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"
	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
)

// Name is the minimal read model used by the DataLoader demo.
type Name struct {
	ID   string
	Name string
	Code string
}

type NameRepository struct {
	conn    *sql.DB
	dialect db.Dialect
}

func NewNameRepository(conn *sql.DB, dialect db.Dialect) *NameRepository {
	return &NameRepository{conn: conn, dialect: dialect}
}

// LoadByIDs fetches many names in ONE query (the batch behind the DataLoader). Returns a map
// keyed by id so the loader can line results up with its requested keys.
func (r *NameRepository) LoadByIDs(ids []string) (map[string]*Name, error) {
	var ph sq.PlaceholderFormat = sq.Question
	if r.dialect == db.Postgres {
		ph = sq.Dollar
	}
	rows, err := sq.Select("id", "name", "code").
		From("name").
		Where(sq.Eq{"id": ids}). // squirrel renders a slice as `id IN (?, ?, …)`
		PlaceholderFormat(ph).
		RunWith(r.conn).
		Query()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[string]*Name, len(ids))
	for rows.Next() {
		var n Name
		if err := rows.Scan(&n.ID, &n.Name, &n.Code); err != nil {
			return nil, err
		}
		out[n.ID] = &n
	}
	return out, rows.Err()
}
