package db

import (
	"database/sql"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	_ "modernc.org/sqlite"
)

// OpenSQLite opens a SQLite connection with the same pragmas the Rust app sets
// (server/repository/src/database_settings.rs): foreign_keys ON + WAL. Enabling foreign_keys
// is essential for behavioral parity — without it SQLite silently ignores FK constraints
// that Postgres enforces.
func OpenSQLite(path string) (*sql.DB, error) {
	return sql.Open("sqlite", path+"?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)")
}

// OpenPostgres opens a Postgres connection via pgx's database/sql adapter.
//
// It forces the SIMPLE query protocol so the multi-statement base-schema dump
// (postgres_latest.sql, ~312KB of CREATE TYPE/TABLE/VIEW + INSERT) can be executed in a
// single Exec — the default extended protocol rejects multiple statements per Exec.
func OpenPostgres(dsn string) (*sql.DB, error) {
	cfg, err := pgx.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}
	cfg.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	return sql.Open("pgx", stdlib.RegisterConnConfig(cfg))
}
