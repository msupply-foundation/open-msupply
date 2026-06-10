package repository

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/migrations"
	_ "modernc.org/sqlite"
)

// setup bootstraps a real-schema DB via the migration runner (which also creates
// invoice_view), then seeds names, name_links (incl. a MERGE: two links -> one name) and
// invoices.
func setup(t *testing.T) *sql.DB {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "repo.sqlite")
	conn, err := db.OpenSQLite(dbPath) // foreign_keys ON, like the Rust app
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })

	if _, err := migrations.Migrate(conn, db.SQLite, migrations.Registry(), nil); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	exec := func(q string, args ...any) {
		if _, err := conn.Exec(q, args...); err != nil {
			t.Fatalf("seed %q: %v", q, err)
		}
	}
	// names ("alpha" lowercase, "Bravo" uppercase -> distinguishes case-insensitive ops)
	exec(`INSERT INTO name (id, name, code, is_customer, is_supplier) VALUES (?,?,?,?,?)`,
		"name-a", "alpha pharmacy", "ALPHA", true, false)
	exec(`INSERT INTO name (id, name, code, is_customer, is_supplier) VALUES (?,?,?,?,?)`,
		"name-b", "Bravo Clinic", "BRAVO", true, false)
	// name_links: L1 and L1b BOTH resolve to name-a (a record merge); L2 -> name-b
	exec(`INSERT INTO name_link (id, name_id) VALUES (?,?)`, "link-1", "name-a")
	exec(`INSERT INTO name_link (id, name_id) VALUES (?,?)`, "link-1b", "name-a")
	exec(`INSERT INTO name_link (id, name_id) VALUES (?,?)`, "link-2", "name-b")
	// stores (invoice.store_id FK, enforced with foreign_keys ON; name_link_id is NOT NULL in SQLite)
	exec(`INSERT INTO store (id, code, site_id, name_link_id) VALUES (?,?,?,?)`, "store-1", "S1", 1, "link-1")
	exec(`INSERT INTO store (id, code, site_id, name_link_id) VALUES (?,?,?,?)`, "store-2", "S2", 1, "link-2")

	ins := func(id, link, store string, num int, status, typ, created string) {
		exec(`INSERT INTO invoice (id, store_id, invoice_number, on_hold, created_datetime, name_link_id, status, type)
		      VALUES (?,?,?,?,?,?,?,?)`, id, store, num, false, created, link, status, typ)
	}
	ins("inv-1", "link-1", "store-1", 1, "NEW", "OUTBOUND_SHIPMENT", "2024-01-01T00:00:00")
	ins("inv-2", "link-1b", "store-1", 2, "PICKED", "OUTBOUND_SHIPMENT", "2024-02-01T00:00:00")
	ins("inv-3", "link-2", "store-2", 3, "NEW", "INBOUND_SHIPMENT", "2024-03-01T00:00:00")
	return conn
}

func strp(s string) *string { return &s }

func TestInvoice_LinkedTableMergeResolution(t *testing.T) {
	r := NewInvoiceRepository(setup(t), db.SQLite)

	got, err := r.Query(nil, &InvoiceSort{Key: SortInvoiceNumber}, Pagination{})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 3 {
		t.Fatalf("want 3 invoices, got %d", len(got))
	}
	// inv-1 (link-1) and inv-2 (link-1b) must BOTH resolve through the view to name-a.
	// This is the whole reason for the core/view define_linked_tables! pattern.
	for _, inv := range got[:2] {
		if inv.NameID != "name-a" || inv.OtherPartyName != "alpha pharmacy" {
			t.Errorf("%s resolved to (%q,%q), want (name-a, alpha pharmacy)", inv.ID, inv.NameID, inv.OtherPartyName)
		}
	}
	t.Logf("merged links link-1 & link-1b both resolve to name-a via invoice_view ✓")
}

func TestInvoice_DynamicFilters(t *testing.T) {
	r := NewInvoiceRepository(setup(t), db.SQLite)

	// equal_any on status
	got, _ := r.Query(&InvoiceFilter{Status: &EqualFilter[string]{EqualTo: strp("NEW")}}, nil, Pagination{})
	if len(got) != 2 {
		t.Errorf("status=NEW: want 2, got %d", len(got))
	}
	// equal on store
	got, _ = r.Query(&InvoiceFilter{StoreID: &EqualFilter[string]{EqualTo: strp("store-1")}}, nil, Pagination{})
	if len(got) != 2 {
		t.Errorf("store=store-1: want 2, got %d", len(got))
	}
	// case-INSENSITIVE LIKE on resolved name (search "ALPHA" matches "alpha pharmacy")
	got, _ = r.Query(&InvoiceFilter{OtherPartyName: &StringFilter{Like: strp("ALPHA")}}, nil, Pagination{})
	if len(got) != 2 {
		t.Errorf("name LIKE 'ALPHA' (case-insensitive): want 2, got %d", len(got))
	}
	t.Logf("dynamic equal/equal_any/string filters + SQLite case-insensitive LIKE ✓")
}

func TestInvoice_NoCaseSortAndPagination(t *testing.T) {
	r := NewInvoiceRepository(setup(t), db.SQLite)

	// Case-insensitive sort: "alpha" must precede "Bravo" (case-sensitive ASCII would flip it).
	got, _ := r.Query(nil, &InvoiceSort{Key: SortOtherPartyName, Desc: false}, Pagination{})
	if got[0].OtherPartyName != "alpha pharmacy" {
		t.Errorf("no-case sort: first = %q, want 'alpha pharmacy'", got[0].OtherPartyName)
	}

	// Pagination: first=2
	two := uint64(2)
	got, _ = r.Query(nil, &InvoiceSort{Key: SortInvoiceNumber}, Pagination{First: &two})
	if len(got) != 2 || got[0].ID != "inv-1" {
		t.Errorf("page first=2: got %d rows starting %v", len(got), firstID(got))
	}
	// offset=2
	got, _ = r.Query(nil, &InvoiceSort{Key: SortInvoiceNumber}, Pagination{First: &two, Offset: 2})
	if len(got) != 1 || got[0].ID != "inv-3" {
		t.Errorf("page offset=2: got %d rows %v", len(got), firstID(got))
	}

	n, _ := r.Count(&InvoiceFilter{Status: &EqualFilter[string]{EqualTo: strp("NEW")}})
	if n != 2 {
		t.Errorf("count status=NEW: want 2, got %d", n)
	}
	t.Logf("no-case sort + limit/offset pagination + filtered count ✓")
}

func firstID(in []Invoice) string {
	if len(in) == 0 {
		return "(none)"
	}
	return in[0].ID
}
