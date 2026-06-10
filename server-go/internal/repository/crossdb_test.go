package repository

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/migrations"
	_ "modernc.org/sqlite"
)

// runInvoiceSuite runs the WS2 repository assertions against ANY backend, proving the same
// migration runner + repository code path works on both SQLite and Postgres.
func runInvoiceSuite(t *testing.T, conn *sql.DB, dialect db.Dialect) {
	if _, err := migrations.Migrate(conn, dialect, migrations.Registry(), nil); err != nil {
		t.Fatalf("[%s] migrate: %v", dialect, err)
	}
	exec := func(q string, a ...any) {
		if _, err := conn.Exec(dialect.Rebind(q), a...); err != nil {
			t.Fatalf("[%s] seed %q: %v", dialect, q, err)
		}
	}
	// `type` is explicit: SQLite's name.type has DEFAULT 'FACILITY' but the Postgres
	// name_type column has no default (a real base-schema divergence between the dumps).
	exec(`INSERT INTO name (id,name,code,is_customer,is_supplier,type) VALUES (?,?,?,?,?,?)`, "name-a", "alpha pharmacy", "ALPHA", true, false, "FACILITY")
	exec(`INSERT INTO name (id,name,code,is_customer,is_supplier,type) VALUES (?,?,?,?,?,?)`, "name-b", "Bravo Clinic", "BRAVO", true, false, "FACILITY")
	exec(`INSERT INTO name_link (id,name_id) VALUES (?,?)`, "link-1", "name-a")
	exec(`INSERT INTO name_link (id,name_id) VALUES (?,?)`, "link-1b", "name-a")
	exec(`INSERT INTO name_link (id,name_id) VALUES (?,?)`, "link-2", "name-b")
	// store rows are required because invoice.store_id is a FK — enforced on Postgres and
	// (with foreign_keys ON, as the Rust app sets) on SQLite too. name_link_id is supplied
	// because SQLite's store.name_link_id is NOT NULL while Postgres's is nullable (another
	// base-schema divergence).
	exec(`INSERT INTO store (id,code,site_id,name_link_id) VALUES (?,?,?,?)`, "store-1", "S1", 1, "link-1")
	exec(`INSERT INTO store (id,code,site_id,name_link_id) VALUES (?,?,?,?)`, "store-2", "S2", 1, "link-2")
	ins := func(id, link, store string, num int, status, typ, created string) {
		exec(`INSERT INTO invoice (id,store_id,invoice_number,on_hold,created_datetime,name_link_id,status,type)
		      VALUES (?,?,?,?,?,?,?,?)`, id, store, num, false, created, link, status, typ)
	}
	ins("inv-1", "link-1", "store-1", 1, "NEW", "OUTBOUND_SHIPMENT", "2024-01-01T00:00:00")
	ins("inv-2", "link-1b", "store-1", 2, "PICKED", "OUTBOUND_SHIPMENT", "2024-02-01T00:00:00")
	ins("inv-3", "link-2", "store-2", 3, "NEW", "INBOUND_SHIPMENT", "2024-03-01T00:00:00")

	r := NewInvoiceRepository(conn, dialect)

	// 1. linked-table merge: link-1 & link-1b both resolve to name-a.
	all, err := r.Query(nil, &InvoiceSort{Key: SortInvoiceNumber}, Pagination{})
	if err != nil {
		t.Fatalf("[%s] query: %v", dialect, err)
	}
	if len(all) != 3 {
		t.Fatalf("[%s] want 3 invoices, got %d", dialect, len(all))
	}
	for _, inv := range all[:2] {
		if inv.NameID != "name-a" || inv.OtherPartyName != "alpha pharmacy" {
			t.Errorf("[%s] %s resolved to (%q,%q)", dialect, inv.ID, inv.NameID, inv.OtherPartyName)
		}
	}

	// 2. case-insensitive search (LIKE on SQLite, ILIKE on Postgres) — same input, same result.
	got, _ := r.Query(&InvoiceFilter{OtherPartyName: &StringFilter{Like: strp("ALPHA")}}, nil, Pagination{})
	if len(got) != 2 {
		t.Errorf("[%s] name LIKE 'ALPHA' (case-insensitive): want 2, got %d", dialect, len(got))
	}

	// 3. case-insensitive sort: "alpha" before "Bravo" (case-sensitive ASCII would flip).
	got, _ = r.Query(nil, &InvoiceSort{Key: SortOtherPartyName}, Pagination{})
	if got[0].OtherPartyName != "alpha pharmacy" {
		t.Errorf("[%s] no-case sort first = %q", dialect, got[0].OtherPartyName)
	}

	// 4. filtered count + pagination.
	if n, _ := r.Count(&InvoiceFilter{Status: &EqualFilter[string]{EqualTo: strp("NEW")}}); n != 2 {
		t.Errorf("[%s] count status=NEW: want 2, got %d", dialect, n)
	}
	two := uint64(2)
	if page, _ := r.Query(nil, &InvoiceSort{Key: SortInvoiceNumber}, Pagination{First: &two, Offset: 2}); len(page) != 1 || page[0].ID != "inv-3" {
		t.Errorf("[%s] pagination offset=2 wrong: %v", dialect, firstID(page))
	}

	t.Logf("[%s] invoice suite passed: merge resolution, case-insensitive filter+sort, count, pagination ✓", dialect)
}

func TestInvoiceSuite_SQLite(t *testing.T) {
	conn, err := db.OpenSQLite(filepath.Join(t.TempDir(), "suite.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	runInvoiceSuite(t, conn, db.SQLite)
}

// TestInvoiceSuite_Postgres runs the identical suite against a real Postgres. Skipped unless
// PG_DSN is set. It resets the public schema first so the runner bootstraps from the pg base.
func TestInvoiceSuite_Postgres(t *testing.T) {
	dsn := os.Getenv("PG_DSN")
	if dsn == "" {
		t.Skip("set PG_DSN to run the Postgres parity suite")
	}
	conn, err := db.OpenPostgres(dsn)
	if err != nil {
		t.Fatalf("open postgres: %v", err)
	}
	defer conn.Close()
	if _, err := conn.Exec(`DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;`); err != nil {
		t.Fatalf("reset schema: %v", err)
	}
	runInvoiceSuite(t, conn, db.Postgres)
}
