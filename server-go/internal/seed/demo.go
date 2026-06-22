package seed

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
)

// Demo seeds a richer dataset on top of Seed so the dashboard panels are non-zero and the
// outbound-shipment list/detail look populated. All store-scoped to DemoStoreID. Idempotent.
// Expiry dates are computed relative to now so the stock-expiry counts stay meaningful whenever
// the demo is run. Raw INSERTs (dialect-neutral) for simplicity.
func Demo(conn *sql.DB, dialect db.Dialect) error {
	now := time.Now().UTC()
	d := func(days int) string { return now.AddDate(0, 0, days).Format("2006-01-02") }
	dt := now.Format("2006-01-02T15:04:05")

	type stmt struct {
		sql  string
		args []any
	}
	var stmts []stmt
	add := func(s string, a ...any) { stmts = append(stmts, stmt{s, a}) }

	// Units + items (item-4, item-5 deliberately have NO stock -> itemCounts.noStock > 0).
	add(`INSERT INTO unit (id, name, "index", is_active) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING`, "unit-tab", "Tablet", 0, true)
	add(`INSERT INTO unit (id, name, "index", is_active) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING`, "unit-vial", "Vial", 1, true)
	items := []struct{ id, name, code string }{
		{"item-1", "Amoxicillin 500mg", "AMOX500"},
		{"item-2", "Paracetamol 500mg", "PARA500"},
		{"item-3", "BCG Vaccine", "BCG"},
		{"item-4", "Ibuprofen 200mg", "IBU200"},
		{"item-5", "ORS Sachet", "ORS"},
	}
	for _, it := range items {
		add(`INSERT INTO item (id, name, code, type, legacy_record, default_pack_size, unit_id) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
			it.id, it.name, it.code, "STOCK", "", 1, "unit-tab")
		add(`INSERT INTO item_link (id, item_id) VALUES (?,?) ON CONFLICT(id) DO NOTHING`, it.id, it.id)
	}

	// Customer + supplier names (visible in the demo store).
	names := []struct {
		id, name, code     string
		customer, supplier bool
	}{
		{"cust-1", "Aspen Medical Centre", "ASPEN", true, false},
		{"cust-2", "Northside Clinic", "NORTH", true, false},
		{"supp-1", "Central Medical Stores", "CMS", false, true},
	}
	for _, n := range names {
		add(`INSERT INTO name (id, name, code, is_customer, is_supplier, type) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
			n.id, n.name, n.code, n.customer, n.supplier, "FACILITY")
		add(`INSERT INTO name_link (id, name_id) VALUES (?,?) ON CONFLICT(id) DO NOTHING`, n.id, n.id)
		add(`INSERT INTO name_store_join (id, store_id, name_link_id, name_is_customer, name_is_supplier) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
			"nsj-"+n.id, DemoStoreID, n.id, n.customer, n.supplier)
	}

	// Stock lines across expiry windows (expired / soon / 3-months / healthy).
	stock := []struct {
		id, item string
		expiry   string
		packs    float64
	}{
		{"sl-1", "item-1", d(-10), 40},  // expired
		{"sl-2", "item-2", d(10), 60},   // expiring soon
		{"sl-3", "item-3", d(60), 25},   // next three months
		{"sl-4", "item-1", d(400), 100}, // healthy
	}
	for _, s := range stock {
		add(`INSERT INTO stock_line (id, item_link_id, store_id, batch, expiry_date, pack_size, cost_price_per_pack, sell_price_per_pack, available_number_of_packs, total_number_of_packs, on_hold) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
			s.id, s.item, DemoStoreID, "B"+s.id, s.expiry, 1.0, 2.0, 3.5, s.packs, s.packs, false)
	}

	// Invoices: 5 outbound (NEW/ALLOCATED/PICKED -> notShipped=3) + 2 inbound (SHIPPED -> notDelivered=1).
	invoices := []struct {
		id, nameLink, typ, status string
		number                    int
	}{
		{"inv-out-1", "cust-1", "OUTBOUND_SHIPMENT", "NEW", 1},
		{"inv-out-2", "cust-1", "OUTBOUND_SHIPMENT", "ALLOCATED", 2},
		{"inv-out-3", "cust-2", "OUTBOUND_SHIPMENT", "PICKED", 3},
		{"inv-out-4", "cust-1", "OUTBOUND_SHIPMENT", "SHIPPED", 4},
		{"inv-out-5", "cust-2", "OUTBOUND_SHIPMENT", "VERIFIED", 5},
		{"inv-in-1", "supp-1", "INBOUND_SHIPMENT", "SHIPPED", 6},
		{"inv-in-2", "supp-1", "INBOUND_SHIPMENT", "DELIVERED", 7},
	}
	for _, inv := range invoices {
		add(`INSERT INTO invoice (id, name_link_id, store_id, invoice_number, on_hold, created_datetime, status, type, currency_rate) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
			inv.id, inv.nameLink, DemoStoreID, inv.number, false, dt, inv.status, inv.typ, 1.0)
	}
	// A couple of priced lines on the first outbound shipment (for the detail screen + pricing).
	lines := []struct {
		id, invoice, item, itemName, itemCode string
		packs, before, after                  float64
	}{
		{"il-1", "inv-out-1", "item-1", "Amoxicillin 500mg", "AMOX500", 10, 35.0, 38.5},
		{"il-2", "inv-out-1", "item-2", "Paracetamol 500mg", "PARA500", 5, 12.5, 13.75},
	}
	for _, l := range lines {
		add(`INSERT INTO invoice_line (id, invoice_id, item_link_id, item_name, item_code, type, number_of_packs, pack_size, cost_price_per_pack, sell_price_per_pack, total_before_tax, total_after_tax) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
			l.id, l.invoice, l.item, l.itemName, l.itemCode, "STOCK_OUT", l.packs, 1.0, 2.0, 3.5, l.before, l.after)
	}

	// Requisitions: 1 REQUEST/DRAFT + 1 RESPONSE/NEW.
	reqs := []struct {
		id, nameLink, typ, status string
		number                    int
	}{
		{"req-1", "supp-1", "REQUEST", "DRAFT", 1},
		{"req-2", "cust-1", "RESPONSE", "NEW", 2},
	}
	for _, rq := range reqs {
		add(`INSERT INTO requisition (id, requisition_number, store_id, name_link_id, created_datetime, max_months_of_stock, min_months_of_stock, status, type) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
			rq.id, rq.number, DemoStoreID, rq.nameLink, dt, 3.0, 1.0, rq.status, rq.typ)
	}

	for _, s := range stmts {
		if _, err := conn.Exec(dialect.Rebind(s.sql), s.args...); err != nil {
			return fmt.Errorf("demo seed (%.50s…): %w", s.sql, err)
		}
	}
	return nil
}
