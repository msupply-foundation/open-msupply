package migrations

import (
	"database/sql"
	"path/filepath"
	"strings"
	"testing"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	_ "modernc.org/sqlite"
)

// Demonstrates the full runner mechanism on the REAL production base schema (v2.15.0):
//   - empty-DB bootstrap from the embedded latest base dump
//   - reads the DATABASE_VERSION the Rust base dump wrote ("2.15.0")
//   - applies a real ported migration (v2.19.0 / add_ancillary_item_table)
//   - byte-exact version tracking + migration_fragment_log key parity with Rust
//   - idempotency: a second run is a no-op
func TestRunner_BootstrapAndMigrate(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "go-migrated.sqlite")
	conn, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()

	res, err := Migrate(conn, db.SQLite, Registry(), nil)
	if err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	t.Logf("runner log: %v", res.Log)

	// 1. Base dump's DATABASE_VERSION was read, then advanced to target 2.19.0.
	if got := getDatabaseVersion(conn, db.SQLite).String(); got != "2.19.0" {
		t.Errorf("DATABASE_VERSION = %q, want 2.19.0", got)
	}

	// 2. The real migration created ancillary_item with SQLite types (REAL, not DOUBLE PRECISION).
	var ddl string
	if err := conn.QueryRow(
		`SELECT sql FROM sqlite_master WHERE type='table' AND name='ancillary_item'`).Scan(&ddl); err != nil {
		t.Fatalf("ancillary_item not created: %v", err)
	}
	if !strings.Contains(ddl, "item_quantity REAL") {
		t.Errorf("expected {DOUBLE}->REAL substitution in SQLite DDL, got:\n%s", ddl)
	}
	t.Logf("created table DDL:\n%s", ddl)

	// 3. Fragment-log key matches the Rust format exactly: "{version}-{identifier}".
	// (The v2.15.0 base dump already carries the historical fragment log forward — exactly
	// as Rust does — so we assert the SPECIFIC new key was appended, not the only row.)
	want := "2.19.0-add_ancillary_item_table"
	var n int
	if err := conn.QueryRow(
		`SELECT COUNT(*) FROM migration_fragment_log WHERE version_and_identifier = ?`,
		want).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Errorf("expected exactly one fragment-log row for %q, got %d", want, n)
	}
	t.Logf("migration_fragment_log contains %q (Rust-format key); base carried %d prior rows forward",
		want, fragmentRowCount(t, conn)-1)

	// 4. Idempotency: re-running applies nothing new.
	before := fragmentRowCount(t, conn)
	if _, err := Migrate(conn, db.SQLite, Registry(), nil); err != nil {
		t.Fatalf("second Migrate: %v", err)
	}
	if after := fragmentRowCount(t, conn); after != before {
		t.Errorf("re-run was not idempotent: fragment rows %d -> %d", before, after)
	} else {
		t.Logf("idempotent: fragment-log row count stable at %d", after)
	}
}

func fragmentRowCount(t *testing.T, conn *sql.DB) int {
	t.Helper()
	var n int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM migration_fragment_log`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}
