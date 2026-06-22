package repository

// Write-side invoice_line repo (tracked under ChangelogTableName::InvoiceLine). The changelog
// store_id is taken from the parent invoice. Completes the invoice_line sync entity.

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

type InvoiceLineRow struct {
	ID               string
	InvoiceID        string
	ItemLinkID       string
	ItemName         string
	ItemCode         string
	Type             string
	StockLineID      sql.NullString
	LocationID       sql.NullString
	Batch            sql.NullString
	ExpiryDate       sql.NullString
	NumberOfPacks    float64
	PackSize         float64
	CostPricePerPack float64
	SellPricePerPack float64
	TotalBeforeTax   float64
	TotalAfterTax    float64
	TaxPercentage    sql.NullFloat64
	Note             sql.NullString
	VolumePerPack    float64
}

type InvoiceLineRowRepository struct {
	exec    synctypes.Exec
	dialect db.Dialect
}

func NewInvoiceLineRowRepository(exec synctypes.Exec, d db.Dialect) *InvoiceLineRowRepository {
	return &InvoiceLineRowRepository{exec: exec, dialect: d}
}

func (r *InvoiceLineRowRepository) ph() sq.PlaceholderFormat { return syncPlaceholder(r.dialect) }

var invoiceLineCols = []string{
	"id", "invoice_id", "item_link_id", "item_name", "item_code", "type", "stock_line_id",
	"location_id", "batch", "expiry_date", "number_of_packs", "pack_size", "cost_price_per_pack",
	"sell_price_per_pack", "total_before_tax", "total_after_tax", "tax_percentage", "note", "volume_per_pack",
}

func (r *InvoiceLineRowRepository) vals(row *InvoiceLineRow) []any {
	return []any{row.ID, row.InvoiceID, row.ItemLinkID, row.ItemName, row.ItemCode, row.Type,
		row.StockLineID, row.LocationID, row.Batch, row.ExpiryDate, row.NumberOfPacks, row.PackSize,
		row.CostPricePerPack, row.SellPricePerPack, row.TotalBeforeTax, row.TotalAfterTax,
		row.TaxPercentage, row.Note, row.VolumePerPack}
}

// storeIDForInvoice fetches the parent invoice's store for the changelog row.
func (r *InvoiceLineRowRepository) storeIDForInvoice(invoiceID string) (string, error) {
	q := sq.Select("store_id").From("invoice").Where(sq.Eq{"id": invoiceID}).PlaceholderFormat(r.ph())
	var storeID string
	err := q.RunWith(r.exec).QueryRow().Scan(&storeID)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return storeID, err
}

func (r *InvoiceLineRowRepository) UpsertOne(row *InvoiceLineRow) (int64, error) {
	q := sq.Insert("invoice_line").Columns(invoiceLineCols...).Values(r.vals(row)...).
		Suffix(`ON CONFLICT(id) DO UPDATE SET ` +
			`invoice_id = excluded.invoice_id, item_link_id = excluded.item_link_id, ` +
			`item_name = excluded.item_name, item_code = excluded.item_code, type = excluded.type, ` +
			`stock_line_id = excluded.stock_line_id, location_id = excluded.location_id, ` +
			`batch = excluded.batch, expiry_date = excluded.expiry_date, ` +
			`number_of_packs = excluded.number_of_packs, pack_size = excluded.pack_size, ` +
			`cost_price_per_pack = excluded.cost_price_per_pack, sell_price_per_pack = excluded.sell_price_per_pack, ` +
			`total_before_tax = excluded.total_before_tax, total_after_tax = excluded.total_after_tax, ` +
			`tax_percentage = excluded.tax_percentage, note = excluded.note, volume_per_pack = excluded.volume_per_pack`).
		PlaceholderFormat(r.ph())
	if _, err := q.RunWith(r.exec).Exec(); err != nil {
		return 0, err
	}
	storeID, err := r.storeIDForInvoice(row.InvoiceID)
	if err != nil {
		return 0, err
	}
	return insertChangelog(r.exec, r.dialect, synctypes.ChangelogInvoiceLine, row.ID,
		synctypes.RowActionUpsert, storeID, "")
}

func (r *InvoiceLineRowRepository) Delete(id string) (int64, bool, error) {
	// Capture the parent invoice's store for the delete changelog before removing the row.
	var invoiceID string
	sel := sq.Select("invoice_id").From("invoice_line").Where(sq.Eq{"id": id}).PlaceholderFormat(r.ph())
	switch err := sel.RunWith(r.exec).QueryRow().Scan(&invoiceID); err {
	case sql.ErrNoRows:
		return 0, false, nil
	case nil:
	default:
		return 0, false, err
	}
	storeID, err := r.storeIDForInvoice(invoiceID)
	if err != nil {
		return 0, false, err
	}
	cursor, err := insertChangelog(r.exec, r.dialect, synctypes.ChangelogInvoiceLine, id,
		synctypes.RowActionDelete, storeID, "")
	if err != nil {
		return 0, false, err
	}
	if _, err := sq.Delete("invoice_line").Where(sq.Eq{"id": id}).PlaceholderFormat(r.ph()).RunWith(r.exec).Exec(); err != nil {
		return 0, false, err
	}
	return cursor, true, nil
}

func (row InvoiceLineRow) Upsert(tx synctypes.Exec, d db.Dialect) (int64, bool, error) {
	cursor, err := NewInvoiceLineRowRepository(tx, d).UpsertOne(&row)
	return cursor, true, err
}

type InvoiceLineRowDelete struct{ ID string }

func (del InvoiceLineRowDelete) Delete(tx synctypes.Exec, d db.Dialect) (int64, bool, error) {
	return NewInvoiceLineRowRepository(tx, d).Delete(del.ID)
}

// StockLineForLine fetches the item/pricing fields needed to build a new invoice line from a
// stock line (item_link_id, item name/code, pack_size, cost/sell price, batch, expiry, location).
type StockLineForLine struct {
	ItemLinkID       string
	ItemName         string
	ItemCode         string
	PackSize         float64
	CostPricePerPack float64
	SellPricePerPack float64
	Batch            sql.NullString
	ExpiryDate       sql.NullString
	LocationID       sql.NullString
	VolumePerPack    float64
}

func (r *InvoiceLineRowRepository) StockLineForLine(stockLineID string) (*StockLineForLine, error) {
	q := sq.Select("sl.item_link_id", "i.name", "i.code", "sl.pack_size", "sl.cost_price_per_pack",
		"sl.sell_price_per_pack", "sl.batch", "sl.expiry_date", "sl.location_id", "sl.volume_per_pack").
		From("stock_line sl").
		Join("item_link il ON sl.item_link_id = il.id").
		Join("item i ON il.item_id = i.id").
		Where(sq.Eq{"sl.id": stockLineID}).PlaceholderFormat(r.ph())
	var s StockLineForLine
	err := q.RunWith(r.exec).QueryRow().Scan(&s.ItemLinkID, &s.ItemName, &s.ItemCode, &s.PackSize,
		&s.CostPricePerPack, &s.SellPricePerPack, &s.Batch, &s.ExpiryDate, &s.LocationID, &s.VolumePerPack)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}
