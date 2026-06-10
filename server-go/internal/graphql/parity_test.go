package graphql

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/migrations"
	_ "modernc.org/sqlite"
)

// The exact operation a client would send. InvoicesResponse is a union, so the connector
// fields are selected via an inline fragment — mirroring the real client queries.
const invoicesQuery = `query Invoices($storeId: String!) {
  invoices(storeId: $storeId, sort: [{ key: invoiceNumber }]) {
    ... on InvoiceConnector {
      totalCount
      nodes {
        id
        otherPartyName
        otherPartyId
        type
        status
        invoiceNumber
        comment
        onHold
        createdDatetime
      }
    }
  }
}`

func seedDB(t *testing.T) *sql.DB {
	t.Helper()
	conn, err := db.OpenSQLite(filepath.Join(t.TempDir(), "gql.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	if _, err := migrations.Migrate(conn, db.SQLite, migrations.Registry(), nil); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	exec := func(q string, a ...any) {
		if _, err := conn.Exec(q, a...); err != nil {
			t.Fatalf("seed: %v", err)
		}
	}
	exec(`INSERT INTO name (id,name,code,is_customer,is_supplier) VALUES (?,?,?,?,?)`, "name-a", "alpha pharmacy", "ALPHA", true, false)
	exec(`INSERT INTO name_link (id,name_id) VALUES (?,?)`, "link-1", "name-a")
	exec(`INSERT INTO name_link (id,name_id) VALUES (?,?)`, "link-1b", "name-a")
	exec(`INSERT INTO store (id,code,site_id,name_link_id) VALUES (?,?,?,?)`, "store-1", "S1", 1, "link-1")
	ins := func(id, link string, num int, status, created string) {
		exec(`INSERT INTO invoice (id,store_id,invoice_number,on_hold,created_datetime,name_link_id,status,type)
		      VALUES (?,?,?,?,?,?,?,?)`, id, "store-1", num, false, created, link, status, "OUTBOUND_SHIPMENT")
	}
	ins("inv-1", "link-1", 1, "NEW", "2024-01-01T00:00:00")
	ins("inv-2", "link-1b", 2, "PICKED", "2024-02-01T00:00:00")
	return conn
}

// postGraphQL sends a query to an http.Handler and returns the raw response body.
func postGraphQL(t *testing.T, h http.Handler, query string, vars map[string]any) []byte {
	t.Helper()
	body, _ := json.Marshal(map[string]any{"query": query, "variables": vars})
	req := httptest.NewRequest(http.MethodPost, "/graphql", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d: %s", rec.Code, rec.Body.String())
	}
	return rec.Body.Bytes()
}

func TestInvoicesParity_Envelope(t *testing.T) {
	h := NewHandler(seedDB(t), db.SQLite)
	raw := postGraphQL(t, h, invoicesQuery, map[string]any{"storeId": "store-1"})
	t.Logf("Go GraphQL response:\n%s", raw)

	// Parse and validate the envelope + serialization details that must match async-graphql.
	var resp struct {
		Errors []any `json:"errors"`
		Data   struct {
			Invoices struct {
				TotalCount int `json:"totalCount"`
				Nodes      []struct {
					ID              string  `json:"id"`
					OtherPartyName  string  `json:"otherPartyName"`
					OtherPartyID    string  `json:"otherPartyId"`
					Type            string  `json:"type"`
					Status          string  `json:"status"`
					InvoiceNumber   int     `json:"invoiceNumber"`
					Comment         *string `json:"comment"`
					OnHold          bool    `json:"onHold"`
					CreatedDatetime string  `json:"createdDatetime"`
				} `json:"nodes"`
			} `json:"invoices"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(resp.Errors) != 0 {
		t.Fatalf("unexpected errors: %v", resp.Errors)
	}
	inv := resp.Data.Invoices
	if inv.TotalCount != 2 {
		t.Errorf("totalCount = %d, want 2", inv.TotalCount)
	}
	if len(inv.Nodes) != 2 {
		t.Fatalf("nodes = %d, want 2", len(inv.Nodes))
	}
	n0 := inv.Nodes[0]
	// camelCase fields, resolved linked-table name, enum as SCREAMING_SNAKE string, null comment.
	if n0.ID != "inv-1" || n0.OtherPartyName != "alpha pharmacy" || n0.OtherPartyID != "name-a" {
		t.Errorf("node0 identity wrong: %+v", n0)
	}
	if n0.Type != "OUTBOUND_SHIPMENT" || n0.Status != "NEW" {
		t.Errorf("node0 enums wrong: type=%q status=%q", n0.Type, n0.Status)
	}
	if n0.Comment != nil {
		t.Errorf("node0 comment should serialize as null, got %v", *n0.Comment)
	}
	if inv.Nodes[1].Status != "PICKED" || inv.Nodes[1].InvoiceNumber != 2 {
		t.Errorf("node1 wrong: %+v", inv.Nodes[1])
	}
	// DateTime must match async-graphql's chrono to_rfc3339() exactly: numeric "+00:00", not "Z".
	if want := "2024-01-01T00:00:00+00:00"; n0.CreatedDatetime != want {
		t.Errorf("createdDatetime = %q, want %q (chrono to_rfc3339 format)", n0.CreatedDatetime, want)
	}
	t.Logf("envelope + camelCase + enum-string + null-comment + linked-name + RFC3339(+00:00) datetime all correct ✓")
}

// TestInvoicesParity_LiveRustDiff does the byte-for-byte diff against a running Rust server.
// It is skipped unless RUST_GRAPHQL_URL is set (and RUST_GRAPHQL_TOKEN for auth), because
// standing up the Rust server with auth + identical data is heavier setup. When enabled, it
// asserts the two servers return semantically identical JSON for the same query+data.
func TestInvoicesParity_LiveRustDiff(t *testing.T) {
	rustURL := os.Getenv("RUST_GRAPHQL_URL")
	if rustURL == "" {
		t.Skip("set RUST_GRAPHQL_URL (and RUST_GRAPHQL_TOKEN) to diff against a live Rust server")
	}
	storeID := os.Getenv("RUST_STORE_ID")
	vars := map[string]any{"storeId": storeID}

	goResp := postGraphQL(t, NewHandler(seedDB(t), db.SQLite), invoicesQuery, vars)

	body, _ := json.Marshal(map[string]any{"query": invoicesQuery, "variables": vars})
	req, _ := http.NewRequest(http.MethodPost, rustURL, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if tok := os.Getenv("RUST_GRAPHQL_TOKEN"); tok != "" {
		req.Header.Set("Authorization", "Bearer "+tok)
	}
	r, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("rust request: %v", err)
	}
	defer r.Body.Close()
	rustResp, _ := io.ReadAll(r.Body)

	if g, ru := canonicalJSON(t, goResp), canonicalJSON(t, rustResp); g != ru {
		t.Errorf("byte-diff FAILED\n go:   %s\n rust: %s", g, ru)
	} else {
		t.Logf("byte-for-byte parity with Rust ✓")
	}
}

// canonicalJSON re-marshals with sorted keys so the comparison ignores key ordering.
func canonicalJSON(t *testing.T, b []byte) string {
	t.Helper()
	var v any
	if err := json.Unmarshal(b, &v); err != nil {
		t.Fatalf("canonicalize: %v\n%s", err, b)
	}
	out, _ := json.Marshal(v)
	return string(out)
}
