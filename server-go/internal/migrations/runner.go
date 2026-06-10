package migrations

// Faithful Go port of the migration orchestration in
// server/repository/src/migrations/mod.rs. The goal is byte-compatibility: a database
// migrated by this runner records the same key_value_store DATABASE_VERSION and the same
// migration_fragment_log rows ("{version}-{identifier}") as the Rust server.

import (
	"database/sql"
	_ "embed"
	"fmt"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
)

//go:embed base_migrations/sqlite_earliest.sql
var sqliteEarliest string

//go:embed base_migrations/sqlite_latest.sql
var sqliteLatest string

//go:embed base_migrations/postgres_earliest.sql
var postgresEarliest string

//go:embed base_migrations/postgres_latest.sql
var postgresLatest string

// dbVersionKey is the key_value_store row id for the schema version. The Rust KeyType enum
// uses #[DbValueStyle = "SCREAMING_SNAKE_CASE"], so DatabaseVersion serializes to this.
const dbVersionKey = "DATABASE_VERSION"

// Rust migrations start at 1.0.3 (the implicit version of a DB with no DATABASE_VERSION key).
var earliestSupported = ParseVersion("1.0.3")

// Migration mirrors the Rust `Migration` trait: a one-time Migrate plus idempotent Fragments.
type Migration interface {
	Version() Version
	// Migrate runs once, only when DB version < this version. Default: no-op.
	Migrate(exec Exec, d db.Dialect) error
	// Fragments run when DB version <= this version, each at most once (tracked by identifier).
	Fragments() []Fragment
}

// Fragment mirrors the Rust `MigrationFragment` trait.
type Fragment interface {
	Identifier() string
	Migrate(exec Exec, d db.Dialect) error
}

// Exec is the minimal execution surface migrations need (satisfied by *sql.DB and *sql.Tx).
type Exec interface {
	Exec(query string, args ...any) (sql.Result, error)
	Query(query string, args ...any) (*sql.Rows, error)
	QueryRow(query string, args ...any) *sql.Row
}

// BaseMigration provides default no-op implementations so concrete migrations only override
// what they need (mirrors the Rust trait's default methods).
type BaseMigration struct{}

func (BaseMigration) Migrate(Exec, db.Dialect) error { return nil }
func (BaseMigration) Fragments() []Fragment          { return nil }

// Result records what the runner did, mirroring the Rust return value.
type Result struct {
	FinalVersion Version
	Log          []string
}

// Migrate runs the ordered migration list against conn.
//
// toVersion == nil  -> migrate to the app's latest (here: the last migration's version),
//
//	bootstrapping an empty DB from the LATEST base schema.
//
// toVersion != nil  -> migrate up to that version, bootstrapping an empty DB from the
//
//	EARLIEST base schema (mirrors the Rust test path).
func Migrate(conn *sql.DB, d db.Dialect, migs []Migration, toVersion *Version) (Result, error) {
	var res Result

	empty, err := isEmptyDB(conn, d)
	if err != nil {
		return res, fmt.Errorf("empty-db check: %w", err)
	}
	if empty {
		base := baseLatest(d)
		if toVersion != nil {
			base = baseEarliest(d)
		}
		if _, err := conn.Exec(base); err != nil {
			return res, fmt.Errorf("bootstrap base schema: %w", err)
		}
		res.Log = append(res.Log, "Base schema installed")
	}

	if len(migs) == 0 {
		return res, fmt.Errorf("no migrations registered")
	}
	target := migs[len(migs)-1].Version()
	if toVersion != nil {
		target = *toVersion
	}

	start := getDatabaseVersion(conn, d)
	if start.Less(migs[0].Version()) {
		return res, fmt.Errorf("database version %s is below earliest supported migration %s; cannot upgrade",
			start, migs[0].Version())
	}

	if err := createFragmentLogTable(conn); err != nil {
		return res, err
	}
	if start.Greater(target) {
		return res, fmt.Errorf("database version (%s) is newer than target (%s); refusing to run", start, target)
	}

	for _, m := range migs {
		mv := m.Version()
		if mv.Greater(target) {
			break // stop at target (mirrors the test-mode break in Rust)
		}
		cur := getDatabaseVersion(conn, d)

		// One-time migration: only when migration version > current DB version.
		if mv.Greater(cur) {
			if err := m.Migrate(conn, d); err != nil {
				return res, fmt.Errorf("one-time migration %s: %w", mv, err)
			}
			if err := setDatabaseVersion(conn, d, mv); err != nil {
				return res, err
			}
			res.Log = append(res.Log, "one-time migration "+mv.String())
		}

		// Fragments: when migration version >= current DB version, each once.
		if mv.Cmp(cur) >= 0 {
			for _, f := range m.Fragments() {
				run, err := fragmentHasRun(conn, d, mv, f.Identifier())
				if err != nil {
					return res, err
				}
				if run {
					continue
				}
				tx, err := conn.Begin()
				if err != nil {
					return res, err
				}
				if err := f.Migrate(tx, d); err != nil {
					_ = tx.Rollback()
					return res, fmt.Errorf("fragment %s (%s): %w", mv, f.Identifier(), err)
				}
				if err := tx.Commit(); err != nil {
					return res, err
				}
				if err := insertFragmentLog(conn, d, mv, f.Identifier()); err != nil {
					return res, err
				}
				res.Log = append(res.Log, fmt.Sprintf("fragment %s: %s", mv, f.Identifier()))
			}
		}
	}

	if err := setDatabaseVersion(conn, d, target); err != nil {
		return res, err
	}

	// Mirror Rust: drop & rebuild the link views after migrations so reads see resolved ids.
	if err := rebuildViews(conn, d); err != nil {
		return res, fmt.Errorf("rebuild views: %w", err)
	}

	res.FinalVersion = target
	res.Log = append(res.Log, "migrations finished to "+target.String())
	return res, nil
}

func baseLatest(d db.Dialect) string {
	if d == db.Postgres {
		return postgresLatest
	}
	return sqliteLatest
}
func baseEarliest(d db.Dialect) string {
	if d == db.Postgres {
		return postgresEarliest
	}
	return sqliteEarliest
}

func isEmptyDB(conn *sql.DB, d db.Dialect) (bool, error) {
	q := `SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
	if d == db.Postgres {
		q = `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'`
	}
	var n int
	if err := conn.QueryRow(q).Scan(&n); err != nil {
		return false, err
	}
	return n == 0, nil
}

func getDatabaseVersion(conn *sql.DB, d db.Dialect) Version {
	var s sql.NullString
	err := conn.QueryRow(d.Rebind(`SELECT value_string FROM key_value_store WHERE id = ?`), dbVersionKey).Scan(&s)
	if err != nil || !s.Valid {
		return earliestSupported // mirrors Rust default of "1.0.3"
	}
	return ParseVersion(s.String)
}

func setDatabaseVersion(conn *sql.DB, d db.Dialect, v Version) error {
	_, err := conn.Exec(d.Rebind(`
		INSERT INTO key_value_store (id, value_string) VALUES (?, ?)
		ON CONFLICT(id) DO UPDATE SET value_string = excluded.value_string`),
		dbVersionKey, v.String())
	return err
}

func createFragmentLogTable(conn *sql.DB) error {
	_, err := conn.Exec(`
		CREATE TABLE IF NOT EXISTS migration_fragment_log (
			version_and_identifier TEXT NOT NULL PRIMARY KEY,
			datetime TIMESTAMP
		)`)
	return err
}

// versionAndIdentifier mirrors MigrationFragmentLogRepository::version_and_identifier.
func versionAndIdentifier(v Version, identifier string) string {
	return v.String() + "-" + identifier
}

func fragmentHasRun(conn *sql.DB, d db.Dialect, v Version, identifier string) (bool, error) {
	var n int
	err := conn.QueryRow(
		d.Rebind(`SELECT COUNT(*) FROM migration_fragment_log WHERE version_and_identifier = ?`),
		versionAndIdentifier(v, identifier)).Scan(&n)
	return n > 0, err
}

func insertFragmentLog(conn *sql.DB, d db.Dialect, v Version, identifier string) error {
	// CURRENT_TIMESTAMP works on both SQLite and Postgres (vs SQLite-only datetime('now')).
	_, err := conn.Exec(
		d.Rebind(`INSERT INTO migration_fragment_log (version_and_identifier, datetime) VALUES (?, CURRENT_TIMESTAMP)`),
		versionAndIdentifier(v, identifier))
	return err
}
