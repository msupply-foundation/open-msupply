package repository

// Write-side invoice repo (tracked under ChangelogTableName::Invoice). Mirrors
// server/repository/src/db_diesel/invoice_row.rs: UpsertOne writes the row + an app-side
// changelog row (recording store_id + name_link_id) and returns the cursor. Completes the
// invoice sync entity deferred from the sync slice.

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

type InvoiceRow struct {
	ID                string
	NameLinkID        string
	StoreID           string
	InvoiceNumber     int64
	Type              string
	Status            string
	OnHold            bool
	Comment           sql.NullString
	TheirReference    sql.NullString
	Colour            sql.NullString
	CreatedDatetime   string
	AllocatedDatetime sql.NullString
	PickedDatetime    sql.NullString
	ShippedDatetime   sql.NullString
	DeliveredDatetime sql.NullString
	VerifiedDatetime  sql.NullString
	CurrencyRate      float64
}

type InvoiceRowRepository struct {
	exec    synctypes.Exec
	dialect db.Dialect
}

func NewInvoiceRowRepository(exec synctypes.Exec, d db.Dialect) *InvoiceRowRepository {
	return &InvoiceRowRepository{exec: exec, dialect: d}
}

func (r *InvoiceRowRepository) ph() sq.PlaceholderFormat { return syncPlaceholder(r.dialect) }

var invoiceCols = []string{
	"id", "name_link_id", "store_id", "invoice_number", "type", "status", "on_hold",
	"comment", "their_reference", "colour", "created_datetime", "allocated_datetime",
	"picked_datetime", "shipped_datetime", "delivered_datetime", "verified_datetime", "currency_rate",
}

func (r *InvoiceRowRepository) vals(row *InvoiceRow) []any {
	return []any{row.ID, row.NameLinkID, row.StoreID, row.InvoiceNumber, row.Type, row.Status,
		row.OnHold, row.Comment, row.TheirReference, row.Colour, row.CreatedDatetime,
		row.AllocatedDatetime, row.PickedDatetime, row.ShippedDatetime, row.DeliveredDatetime,
		row.VerifiedDatetime, row.CurrencyRate}
}

// UpsertOne writes the invoice and an app-side changelog row, returning the cursor.
func (r *InvoiceRowRepository) UpsertOne(row *InvoiceRow) (int64, error) {
	q := sq.Insert("invoice").Columns(invoiceCols...).Values(r.vals(row)...).
		Suffix(`ON CONFLICT(id) DO UPDATE SET ` +
			`name_link_id = excluded.name_link_id, store_id = excluded.store_id, ` +
			`invoice_number = excluded.invoice_number, type = excluded.type, status = excluded.status, ` +
			`on_hold = excluded.on_hold, comment = excluded.comment, their_reference = excluded.their_reference, ` +
			`colour = excluded.colour, created_datetime = excluded.created_datetime, ` +
			`allocated_datetime = excluded.allocated_datetime, picked_datetime = excluded.picked_datetime, ` +
			`shipped_datetime = excluded.shipped_datetime, delivered_datetime = excluded.delivered_datetime, ` +
			`verified_datetime = excluded.verified_datetime, currency_rate = excluded.currency_rate`).
		PlaceholderFormat(r.ph())
	if _, err := q.RunWith(r.exec).Exec(); err != nil {
		return 0, err
	}
	return insertChangelog(r.exec, r.dialect, synctypes.ChangelogInvoice, row.ID,
		synctypes.RowActionUpsert, row.StoreID, row.NameLinkID)
}

func (r *InvoiceRowRepository) FindOneByID(id string) (*InvoiceRow, error) {
	q := sq.Select(invoiceCols...).From("invoice").Where(sq.Eq{"id": id}).PlaceholderFormat(r.ph())
	var row InvoiceRow
	err := q.RunWith(r.exec).QueryRow().Scan(&row.ID, &row.NameLinkID, &row.StoreID, &row.InvoiceNumber,
		&row.Type, &row.Status, &row.OnHold, &row.Comment, &row.TheirReference, &row.Colour,
		&row.CreatedDatetime, &row.AllocatedDatetime, &row.PickedDatetime, &row.ShippedDatetime,
		&row.DeliveredDatetime, &row.VerifiedDatetime, &row.CurrencyRate)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

// NextInvoiceNumber returns max(invoice_number)+1 for the store + type.
func (r *InvoiceRowRepository) NextInvoiceNumber(storeID, invoiceType string) (int64, error) {
	q := sq.Select("COALESCE(MAX(invoice_number), 0) + 1").From("invoice").
		Where(sq.Eq{"store_id": storeID, "type": invoiceType}).PlaceholderFormat(r.ph())
	var n int64
	if err := q.RunWith(r.exec).QueryRow().Scan(&n); err != nil {
		return 0, err
	}
	return n, nil
}

// Delete writes a delete changelog row and removes the invoice, returning the cursor.
func (r *InvoiceRowRepository) Delete(id string) (int64, bool, error) {
	row, err := r.FindOneByID(id)
	if err != nil {
		return 0, false, err
	}
	if row == nil {
		return 0, false, nil
	}
	cursor, err := insertChangelog(r.exec, r.dialect, synctypes.ChangelogInvoice, id,
		synctypes.RowActionDelete, row.StoreID, row.NameLinkID)
	if err != nil {
		return 0, false, err
	}
	if _, err := sq.Delete("invoice").Where(sq.Eq{"id": id}).PlaceholderFormat(r.ph()).RunWith(r.exec).Exec(); err != nil {
		return 0, false, err
	}
	return cursor, true, nil
}

func (row InvoiceRow) Upsert(tx synctypes.Exec, d db.Dialect) (int64, bool, error) {
	cursor, err := NewInvoiceRowRepository(tx, d).UpsertOne(&row)
	return cursor, true, err
}

type InvoiceRowDelete struct{ ID string }

func (del InvoiceRowDelete) Delete(tx synctypes.Exec, d db.Dialect) (int64, bool, error) {
	return NewInvoiceRowRepository(tx, d).Delete(del.ID)
}
