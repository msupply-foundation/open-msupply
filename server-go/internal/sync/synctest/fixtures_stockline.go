package synctest

import (
	"database/sql"

	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// A representative stock_line fixture (legacy table "item_line"). Adapted from
// server/service/src/sync/test/test_data/stock_line.rs but trimmed to the columns present in
// the Go base schema (no manufacturer_id / manufacture_date) and to the FK universe the slice
// seeds. Proves the tracked-changelog + push vertical.

const stockLineTable = "item_line"

// SeedStockLineDeps inserts the store + item (and their link rows) that the stock line FK-refs.
// Placeholder-free so it runs on both SQLite and Postgres.
func SeedStockLineDeps(exec synctypes.Exec) error {
	stmts := []string{
		// name.type has a DEFAULT on SQLite but not on Postgres, so set it explicitly.
		`INSERT INTO name (id, name, code, is_customer, is_supplier, type) VALUES ('name_sl','Supplier','SUP',FALSE,TRUE,'FACILITY')`,
		`INSERT INTO name_link (id, name_id) VALUES ('name_sl','name_sl')`,
		`INSERT INTO store (id, name_link_id, code, site_id) VALUES ('store_a','name_sl','STA',1)`,
		// item.type is an enum on Postgres (STOCK/SERVICE/NON_STOCK), plain TEXT on SQLite;
		// default_pack_size is NOT NULL without a Postgres default.
		`INSERT INTO item (id, name, code, type, legacy_record, default_pack_size) VALUES ('item_a','Item A','IA','STOCK','',0)`,
		`INSERT INTO item_link (id, item_id) VALUES ('item_a','item_a')`,
	}
	for _, s := range stmts {
		if _, err := exec.Exec(s); err != nil {
			return err
		}
	}
	return nil
}

func StockLinePullUpsert() []IncomingRecord {
	return []IncomingRecord{
		IncomingUpsert(stockLineTable, "stock_a",
			`{"ID":"stock_a","store_ID":"store_a","item_ID":"item_a","batch":"batch1",`+
				`"expiry_date":"2025-06-01","hold":false,"location_ID":"","pack_size":1,`+
				`"available":10,"quantity":10,"cost_price":2,"sell_price":3,"note":"a note",`+
				`"name_ID":"","barcodeID":"","vvm_status_id":"","total_volume":0,"volume_per_pack":0}`,
			synctypes.PullUpsert(repository.StockLineRow{
				ID: "stock_a", StoreID: "store_a", ItemLinkID: "item_a",
				Batch:      sql.NullString{String: "batch1", Valid: true},
				ExpiryDate: sql.NullString{String: "2025-06-01", Valid: true},
				PackSize:   1, AvailableNumberOfPacks: 10, TotalNumberOfPacks: 10,
				CostPricePerPack: 2, SellPricePerPack: 3, OnHold: false,
				Note: sql.NullString{String: "a note", Valid: true},
			})).WithExtraData(SeedStockLineDeps),
	}
}
