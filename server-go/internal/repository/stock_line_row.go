package repository

// Mirrors server/repository/src/db_diesel/stock_line_row.rs. Tracked in changelog
// (ChangelogTableName::StockLine): UpsertOne writes the row then an app-side changelog row
// (store_id recorded, name_link_id NULL) and returns the cursor. Note the Go base schema has
// no manufacturer_id / manufacture_date columns, so those Rust fields are omitted.

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

type StockLineRow struct {
	ID                     string
	ItemLinkID             string
	StoreID                string
	LocationID             sql.NullString
	Batch                  sql.NullString
	PackSize               float64
	CostPricePerPack       float64
	SellPricePerPack       float64
	AvailableNumberOfPacks float64
	TotalNumberOfPacks     float64
	ExpiryDate             sql.NullString
	OnHold                 bool
	Note                   sql.NullString
	BarcodeID              sql.NullString
	ItemVariantID          sql.NullString
	VVMStatusID            sql.NullString
	CampaignID             sql.NullString
	ProgramID              sql.NullString
	TotalVolume            float64
	VolumePerPack          float64
	SupplierLinkID         sql.NullString
	DonorLinkID            sql.NullString
}

type StockLineRowRepository struct {
	exec    synctypes.Exec
	dialect db.Dialect
}

func NewStockLineRowRepository(exec synctypes.Exec, d db.Dialect) *StockLineRowRepository {
	return &StockLineRowRepository{exec: exec, dialect: d}
}

var stockLineColumns = []string{
	"id", "item_link_id", "store_id", "location_id", "batch", "pack_size",
	"cost_price_per_pack", "sell_price_per_pack", "available_number_of_packs",
	"total_number_of_packs", "expiry_date", "on_hold", "note", "barcode_id",
	"item_variant_id", "vvm_status_id", "campaign_id", "program_id", "total_volume",
	"volume_per_pack", "supplier_link_id", "donor_link_id",
}

func (r *StockLineRowRepository) values(row *StockLineRow) []any {
	return []any{
		row.ID, row.ItemLinkID, row.StoreID, row.LocationID, row.Batch, row.PackSize,
		row.CostPricePerPack, row.SellPricePerPack, row.AvailableNumberOfPacks,
		row.TotalNumberOfPacks, row.ExpiryDate, row.OnHold, row.Note, row.BarcodeID,
		row.ItemVariantID, row.VVMStatusID, row.CampaignID, row.ProgramID, row.TotalVolume,
		row.VolumePerPack, row.SupplierLinkID, row.DonorLinkID,
	}
}

// UpsertOne writes the row + an app-side changelog row, returning the changelog cursor.
func (r *StockLineRowRepository) UpsertOne(row *StockLineRow) (int64, error) {
	q := sq.Insert("stock_line").
		Columns(stockLineColumns...).
		Values(r.values(row)...).
		Suffix(`ON CONFLICT(id) DO UPDATE SET ` +
			`item_link_id = excluded.item_link_id, store_id = excluded.store_id, ` +
			`location_id = excluded.location_id, batch = excluded.batch, pack_size = excluded.pack_size, ` +
			`cost_price_per_pack = excluded.cost_price_per_pack, sell_price_per_pack = excluded.sell_price_per_pack, ` +
			`available_number_of_packs = excluded.available_number_of_packs, ` +
			`total_number_of_packs = excluded.total_number_of_packs, expiry_date = excluded.expiry_date, ` +
			`on_hold = excluded.on_hold, note = excluded.note, barcode_id = excluded.barcode_id, ` +
			`item_variant_id = excluded.item_variant_id, vvm_status_id = excluded.vvm_status_id, ` +
			`campaign_id = excluded.campaign_id, program_id = excluded.program_id, ` +
			`total_volume = excluded.total_volume, volume_per_pack = excluded.volume_per_pack, ` +
			`supplier_link_id = excluded.supplier_link_id, donor_link_id = excluded.donor_link_id`).
		PlaceholderFormat(syncPlaceholder(r.dialect))
	if _, err := q.RunWith(r.exec).Exec(); err != nil {
		return 0, err
	}
	return insertChangelog(r.exec, r.dialect, synctypes.ChangelogStockLine, row.ID,
		synctypes.RowActionUpsert, row.StoreID, "")
}

func (r *StockLineRowRepository) Delete(id string) (int64, bool, error) {
	row, err := r.FindOneByID(id)
	if err != nil {
		return 0, false, err
	}
	if row == nil {
		return 0, false, nil
	}
	cursor, err := insertChangelog(r.exec, r.dialect, synctypes.ChangelogStockLine, id,
		synctypes.RowActionDelete, row.StoreID, "")
	if err != nil {
		return 0, false, err
	}
	q := sq.Delete("stock_line").Where(sq.Eq{"id": id}).PlaceholderFormat(syncPlaceholder(r.dialect))
	if _, err := q.RunWith(r.exec).Exec(); err != nil {
		return 0, false, err
	}
	return cursor, true, nil
}

func (r *StockLineRowRepository) FindOneByID(id string) (*StockLineRow, error) {
	q := sq.Select(stockLineColumns...).From("stock_line").Where(sq.Eq{"id": id}).
		PlaceholderFormat(syncPlaceholder(r.dialect))
	var row StockLineRow
	err := q.RunWith(r.exec).QueryRow().Scan(
		&row.ID, &row.ItemLinkID, &row.StoreID, &row.LocationID, &row.Batch, &row.PackSize,
		&row.CostPricePerPack, &row.SellPricePerPack, &row.AvailableNumberOfPacks,
		&row.TotalNumberOfPacks, &row.ExpiryDate, &row.OnHold, &row.Note, &row.BarcodeID,
		&row.ItemVariantID, &row.VVMStatusID, &row.CampaignID, &row.ProgramID, &row.TotalVolume,
		&row.VolumePerPack, &row.SupplierLinkID, &row.DonorLinkID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (row StockLineRow) Upsert(tx synctypes.Exec, d db.Dialect) (int64, bool, error) {
	cursor, err := NewStockLineRowRepository(tx, d).UpsertOne(&row)
	return cursor, true, err
}

type StockLineRowDelete struct{ ID string }

func (del StockLineRowDelete) Delete(tx synctypes.Exec, d db.Dialect) (int64, bool, error) {
	return NewStockLineRowRepository(tx, d).Delete(del.ID)
}
