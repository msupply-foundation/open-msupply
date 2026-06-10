package graphql

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"path/filepath"
	"sync"
	"testing"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/graphql/generated"
	"github.com/msupply-foundation/open-msupply/server-go/internal/graphql/loaders"
	"github.com/msupply-foundation/open-msupply/server-go/internal/graphql/resolvers"
	"github.com/msupply-foundation/open-msupply/server-go/internal/migrations"
	_ "modernc.org/sqlite"
)

const otherPartyQuery = `query($storeId: String!) {
  invoices(storeId: $storeId, sort: [{ key: invoiceNumber }]) {
    ... on InvoiceConnector {
      nodes { id otherParty(storeId: $storeId) { id name code } }
    }
  }
}`

// seed three invoices in one store across TWO distinct names (one name reached via a merged
// link) so otherParty resolution has multiple distinct keys to batch.
func seedLoaderDB(t *testing.T) *sql.DB {
	t.Helper()
	conn, err := db.OpenSQLite(filepath.Join(t.TempDir(), "loader.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	if _, err := migrations.Migrate(conn, db.SQLite, migrations.Registry(), nil); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	ex := func(q string, a ...any) {
		if _, err := conn.Exec(q, a...); err != nil {
			t.Fatalf("seed: %v", err)
		}
	}
	ex(`INSERT INTO name (id,name,code,is_customer,is_supplier,type) VALUES (?,?,?,?,?,?)`, "name-a", "Alpha", "A", true, false, "FACILITY")
	ex(`INSERT INTO name (id,name,code,is_customer,is_supplier,type) VALUES (?,?,?,?,?,?)`, "name-b", "Bravo", "B", true, false, "FACILITY")
	ex(`INSERT INTO name_link (id,name_id) VALUES (?,?)`, "l1", "name-a")
	ex(`INSERT INTO name_link (id,name_id) VALUES (?,?)`, "l1b", "name-a") // merged link
	ex(`INSERT INTO name_link (id,name_id) VALUES (?,?)`, "l2", "name-b")
	ex(`INSERT INTO store (id,code,site_id,name_link_id) VALUES (?,?,?,?)`, "store-1", "S1", 1, "l1")
	in := func(id, link string, num int) {
		ex(`INSERT INTO invoice (id,store_id,invoice_number,on_hold,created_datetime,name_link_id,status,type)
		    VALUES (?,?,?,?,?,?,?,?)`, id, "store-1", num, false, "2024-01-0"+string(rune('0'+num))+"T00:00:00", link, "NEW", "OUTBOUND_SHIPMENT")
	}
	in("inv-1", "l1", 1)  // -> name-a
	in("inv-2", "l1b", 2) // -> name-a (via merged link)
	in("inv-3", "l2", 3)  // -> name-b
	return conn
}

func TestOtherPartyDataLoader_Batches(t *testing.T) {
	conn := seedLoaderDB(t)

	// Build the gqlgen handler with an OBSERVED loader so we can count batched DB round-trips.
	var mu sync.Mutex
	var batches [][]string
	es := generated.NewExecutableSchema(generated.Config{
		Resolvers: &resolvers.Resolver{DB: conn, Dialect: db.SQLite},
	})
	base := handler.NewDefaultServer(es)
	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		l := loaders.NewWithObserver(conn, db.SQLite, func(keys []string) {
			mu.Lock()
			batches = append(batches, append([]string(nil), keys...))
			mu.Unlock()
		})
		base.ServeHTTP(w, r.WithContext(loaders.WithLoaders(r.Context(), l)))
	})

	raw := postGraphQL(t, h, otherPartyQuery, map[string]any{"storeId": "store-1"})
	t.Logf("response: %s", raw)

	var resp struct {
		Data struct {
			Invoices struct {
				Nodes []struct {
					ID         string `json:"id"`
					OtherParty struct {
						ID   string `json:"id"`
						Name string `json:"name"`
					} `json:"otherParty"`
				} `json:"nodes"`
			} `json:"invoices"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	nodes := resp.Data.Invoices.Nodes
	if len(nodes) != 3 {
		t.Fatalf("want 3 invoices, got %d", len(nodes))
	}
	// Correct resolution incl. the merged-link case (inv-1 & inv-2 -> Alpha; inv-3 -> Bravo).
	want := map[string]string{"inv-1": "Alpha", "inv-2": "Alpha", "inv-3": "Bravo"}
	for _, n := range nodes {
		if n.OtherParty.Name != want[n.ID] {
			t.Errorf("%s otherParty = %q, want %q", n.ID, n.OtherParty.Name, want[n.ID])
		}
	}

	// The DataLoader must collapse the 3 per-invoice name lookups into ONE batched query.
	if len(batches) != 1 {
		t.Fatalf("expected exactly 1 batched name query, got %d: %v", len(batches), batches)
	}
	t.Logf("N+1 avoided: 3 invoices → 1 batched name query with keys %v ✓", batches[0])
}
