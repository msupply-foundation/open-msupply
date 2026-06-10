// Package db holds the dual-backend (SQLite/Postgres) abstraction for the Go port spike.
package db

import (
	"strconv"
	"strings"
)

// Dialect selects the SQL backend. Mirrors the Rust `#[cfg(feature = "postgres")]` split.
type Dialect int

const (
	SQLite Dialect = iota
	Postgres
)

func (d Dialect) String() string {
	if d == Postgres {
		return "postgres"
	}
	return "sqlite"
}

// TypeConstants mirrors server/repository/src/migrations/types.rs. Migration SQL strings in
// the Rust code interpolate these (e.g. `{DOUBLE}`, `{DATETIME}`); the Go port substitutes
// the same per-dialect tokens so the resulting DDL is identical.
type TypeConstants struct {
	Date             string
	DateTime         string
	Double           string
	DefaultTimestamp string
	JSON             string
	Binary           string
}

// Rebind converts `?` placeholders to the dialect's parameter style. Postgres uses $1, $2…;
// SQLite keeps `?`. (Assumes no literal `?` inside string literals — true for our internal
// queries.) squirrel handles this for the repository layer; this is for the hand-written
// runner SQL.
func (d Dialect) Rebind(query string) string {
	if d != Postgres {
		return query
	}
	var b strings.Builder
	n := 0
	for i := 0; i < len(query); i++ {
		if query[i] == '?' {
			n++
			b.WriteByte('$')
			b.WriteString(strconv.Itoa(n))
		} else {
			b.WriteByte(query[i])
		}
	}
	return b.String()
}

func (d Dialect) Types() TypeConstants {
	if d == Postgres {
		return TypeConstants{
			Date:             "DATE",
			DateTime:         "TIMESTAMP",
			Double:           "DOUBLE PRECISION",
			DefaultTimestamp: "'epoch'",
			JSON:             "TEXT",
			Binary:           "BYTEA",
		}
	}
	return TypeConstants{
		Date:             "TEXT",
		DateTime:         "TEXT",
		Double:           "REAL",
		DefaultTimestamp: "0",
		JSON:             "TEXT",
		Binary:           "BLOB",
	}
}
