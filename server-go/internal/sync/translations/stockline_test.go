package translations

import (
	"encoding/json"
	"testing"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctest"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// Pull: translate the legacy item_line record (no DB needed — all optional FKs are empty).
func TestStockLineTranslation(t *testing.T) {
	tr := StockLine{}
	for _, rec := range synctest.StockLinePullUpsert() {
		if !synctypes.ShouldTranslateFrom(tr, &rec.Buffer) {
			t.Fatalf("stock_line translator should match record %s", rec.Buffer.RecordID)
		}
		got, err := tr.TryTranslateFromUpsert(nil, db.SQLite, &rec.Buffer)
		if err != nil {
			t.Fatalf("translate upsert %s: %v", rec.Buffer.RecordID, err)
		}
		synctest.AssertPullEqual(t, got, rec.Expected)
	}
}

// Push (translate-to-sync): stock_line is tracked under PushToLegacyCentral; the changelog row
// for a stock line should produce an "item_line" record with the resolved item_ID.
func TestStockLinePush(t *testing.T) {
	conn := synctest.SetupSQLite(t)
	if err := synctest.SeedStockLineDeps(conn); err != nil {
		t.Fatalf("seed deps: %v", err)
	}
	// Integrate the stock line first so the row + changelog exist.
	for _, rec := range synctest.StockLinePullUpsert() {
		res, err := StockLine{}.TryTranslateFromUpsert(conn, db.SQLite, &rec.Buffer)
		if err != nil {
			t.Fatalf("translate: %v", err)
		}
		if _, _, err := res.Operations[0].Upsert.Upsert(conn, db.SQLite); err != nil {
			t.Fatalf("upsert stock line: %v", err)
		}
	}

	cl := &synctypes.ChangelogRow{TableName: synctypes.ChangelogStockLine, RecordID: "stock_a", RowAction: synctypes.RowActionUpsert}
	if !synctypes.ShouldTranslateTo(StockLine{}, cl, synctypes.PushToLegacyCentral) {
		t.Fatal("stock_line should translate to legacy central")
	}
	res, err := StockLine{}.TryTranslateToUpsert(conn, db.SQLite, cl)
	if err != nil {
		t.Fatalf("translate to upsert: %v", err)
	}
	if res.Kind != synctypes.PushRecords || len(res.Records) != 1 {
		t.Fatalf("expected one push record, got %+v", res)
	}
	rec := res.Records[0].Record
	if rec.TableName != "item_line" || rec.RecordID != "stock_a" || rec.Action != synctypes.TransportUpdate {
		t.Errorf("push record envelope mismatch: %+v", rec)
	}
	var data map[string]any
	if err := json.Unmarshal(rec.RecordData, &data); err != nil {
		t.Fatalf("unmarshal push data: %v", err)
	}
	if data["item_ID"] != "item_a" || data["store_ID"] != "store_a" {
		t.Errorf("push data item_ID/store_ID mismatch: %v", data)
	}
}
