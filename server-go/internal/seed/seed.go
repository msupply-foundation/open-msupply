// Package seed inserts a minimal demo dataset so the frontend can log in and select a store on a
// fresh database. It is idempotent (ON CONFLICT(id) DO NOTHING) and dialect-neutral (values valid
// on both SQLite and Postgres — e.g. store_mode 'STORE', name.type 'FACILITY'). The fuller demo
// dataset (items, stock, invoices for the dashboard) layers on top in cmd/seeddemo.
package seed

import (
	"database/sql"
	"fmt"

	"github.com/msupply-foundation/open-msupply/server-go/internal/auth"
	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
)

// Credentials of the seeded admin user.
const (
	AdminUsername = "admin"
	AdminPassword = "password"
	DemoStoreID   = "store-1"
	DemoSiteID    = 1
)

// Seed inserts the login/bootstrap rows. Safe to call repeatedly.
func Seed(conn *sql.DB, dialect db.Dialect) error {
	hash, err := auth.HashPassword(AdminPassword)
	if err != nil {
		return fmt.Errorf("hash admin password: %w", err)
	}

	stmts := []struct {
		sql  string
		args []any
	}{
		{`INSERT INTO name (id, name, code, is_customer, is_supplier, type) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
			[]any{"name-store-1", "Demo Store", "DS", false, false, "FACILITY"}},
		{`INSERT INTO name_link (id, name_id) VALUES (?,?) ON CONFLICT(id) DO NOTHING`,
			[]any{"namelink-store-1", "name-store-1"}},
		{`INSERT INTO store (id, name_link_id, code, site_id, store_mode, created_date, is_disabled) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
			[]any{DemoStoreID, "namelink-store-1", "DS", DemoSiteID, "STORE", "2024-01-01", false}},
		{`INSERT INTO store_preference (id) VALUES (?) ON CONFLICT(id) DO NOTHING`,
			[]any{DemoStoreID}},
		{`INSERT INTO user_account (id, username, hashed_password, email, language, first_name, last_name) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
			[]any{"user-1", AdminUsername, hash, "admin@example.com", "ENGLISH", "Admin", "User"}},
		{`INSERT INTO user_store_join (id, user_id, store_id, is_default) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING`,
			[]any{"usj-1", "user-1", DemoStoreID, true}},
		{`INSERT INTO user_permission (id, user_id, store_id, permission) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING`,
			[]any{"perm-store-access", "user-1", DemoStoreID, "STORE_ACCESS"}},
		{`INSERT INTO key_value_store (id, value_int) VALUES (?,?) ON CONFLICT(id) DO NOTHING`,
			[]any{"SETTINGS_SYNC_SITE_ID", DemoSiteID}},
		{`INSERT INTO key_value_store (id, value_string) VALUES (?,?) ON CONFLICT(id) DO NOTHING`,
			[]any{"SETTINGS_SYNC_USERNAME", "Demo Site"}},
		// A completed sync_log row makes initialisationStatus report Initialised (the real path).
		{`INSERT INTO sync_log (id, started_datetime, finished_datetime, duration_in_seconds) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING`,
			[]any{"synclog-1", "2024-01-01 00:00:00", "2024-01-01 00:01:00", 60}},
	}

	for _, s := range stmts {
		if _, err := conn.Exec(dialect.Rebind(s.sql), s.args...); err != nil {
			return fmt.Errorf("seed (%.40s…): %w", s.sql, err)
		}
	}
	return nil
}
