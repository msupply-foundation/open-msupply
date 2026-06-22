package translations

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// emptyStrAsOption maps "" to a NULL string, mirroring util::sync_serde::empty_str_as_option.
func emptyStrAsOption(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

// zeroDateAsOption maps "" / "0000-00-00" to NULL, mirroring util::sync_serde::zero_date_as_option.
// Other values pass through as the ISO date string.
func zeroDateAsOption(s string) sql.NullString {
	if s == "" || s == "0000-00-00" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

// rowExists reports whether a row with the given id exists in table, used for FK checks during
// translation (mirrors the *RowRepository::find_one_by_id().is_none() guards).
func rowExists(exec synctypes.Exec, d db.Dialect, table, id string) (bool, error) {
	q := sq.Select("1").From(table).Where(sq.Eq{"id": id}).Limit(1).
		PlaceholderFormat(placeholderFor(d))
	var one int
	err := q.RunWith(exec).QueryRow().Scan(&one)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func placeholderFor(d db.Dialect) sq.PlaceholderFormat {
	if d == db.Postgres {
		return sq.Dollar
	}
	return sq.Question
}

// clearFK nulls an optional FK whose referenced row is missing, mirroring
// utils::clear_invalid_fk (without the system_log write — a documented simplification for the
// slice). A NULL/empty value passes through untouched.
func clearFK(exec synctypes.Exec, d db.Dialect, table string, val sql.NullString) (sql.NullString, error) {
	if !val.Valid {
		return val, nil
	}
	exists, err := rowExists(exec, d, table, val.String)
	if err != nil {
		return val, err
	}
	if !exists {
		return sql.NullString{}, nil
	}
	return val, nil
}

// nsToPtr converts a sql.NullString to a *string (nil when NULL) for JSON marshalling on push.
func nsToPtr(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	s := ns.String
	return &s
}
