package repository

// Read helpers backing the dashboard count resolvers. Plain COUNT(*) queries over invoice /
// stock_line / requisition / item, scoped by store, mirroring server/service/src/dashboard/*.

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
)

type DashboardRepository struct {
	conn    *sql.DB
	dialect db.Dialect
}

func NewDashboardRepository(conn *sql.DB, d db.Dialect) *DashboardRepository {
	return &DashboardRepository{conn: conn, dialect: d}
}

func (r *DashboardRepository) count(q sq.SelectBuilder) (int, error) {
	var n int
	if err := q.PlaceholderFormat(syncPlaceholder(r.dialect)).RunWith(r.conn).QueryRow().Scan(&n); err != nil {
		return 0, err
	}
	return n, nil
}

// CountInvoices counts invoices of a type for a store, optionally filtered by statuses and a
// created_datetime lower bound (ISO string, inclusive).
func (r *DashboardRepository) CountInvoices(storeID, invoiceType string, statuses []string, createdFrom *string) (int, error) {
	q := sq.Select("COUNT(*)").From("invoice").
		Where(sq.Eq{"store_id": storeID, "type": invoiceType})
	if len(statuses) > 0 {
		q = q.Where(sq.Eq{"status": statuses})
	}
	if createdFrom != nil {
		q = q.Where(sq.GtOrEq{"created_datetime": *createdFrom})
	}
	return r.count(q)
}

// CountStockExpiringBetween counts in-stock (available > 0) stock lines whose expiry_date falls in
// [fromInclusive, toInclusive]. Either bound may be nil to leave it open.
func (r *DashboardRepository) CountStockExpiringBetween(storeID string, fromInclusive, toInclusive *string) (int, error) {
	q := sq.Select("COUNT(*)").From("stock_line").
		Where(sq.Eq{"store_id": storeID}).
		Where(sq.Gt{"available_number_of_packs": 0}).
		Where("expiry_date IS NOT NULL")
	if fromInclusive != nil {
		q = q.Where(sq.GtOrEq{"expiry_date": *fromInclusive})
	}
	if toInclusive != nil {
		q = q.Where(sq.LtOrEq{"expiry_date": *toInclusive})
	}
	return r.count(q)
}

// CountStockExpiredBefore counts in-stock lines with expiry_date strictly before the given date.
func (r *DashboardRepository) CountStockExpiredBefore(storeID, before string) (int, error) {
	q := sq.Select("COUNT(*)").From("stock_line").
		Where(sq.Eq{"store_id": storeID}).
		Where(sq.Gt{"available_number_of_packs": 0}).
		Where("expiry_date IS NOT NULL").
		Where(sq.Lt{"expiry_date": before})
	return r.count(q)
}

// CountActiveItems counts active items (visible in the catalogue).
func (r *DashboardRepository) CountActiveItems() (int, error) {
	return r.count(sq.Select("COUNT(*)").From("item").Where(sq.Eq{"is_active": true}))
}

// CountItemsNoStock counts active items that have no in-stock stock line in the store.
func (r *DashboardRepository) CountItemsNoStock(storeID string) (int, error) {
	// items whose item_link has no stock_line with available>0 in this store
	sub := "SELECT 1 FROM stock_line sl JOIN item_link il ON sl.item_link_id = il.id " +
		"WHERE il.item_id = item.id AND sl.store_id = ? AND sl.available_number_of_packs > 0"
	q := sq.Select("COUNT(*)").From("item").
		Where(sq.Eq{"is_active": true}).
		Where("NOT EXISTS ("+sub+")", storeID)
	return r.count(q)
}

// CountRequisitions counts requisitions of a type/status for a store, optionally emergency-only.
func (r *DashboardRepository) CountRequisitions(storeID, reqType, status string, emergencyOnly bool) (int, error) {
	q := sq.Select("COUNT(*)").From("requisition").
		Where(sq.Eq{"store_id": storeID, "type": reqType, "status": status})
	if emergencyOnly {
		q = q.Where(sq.Eq{"is_emergency": true})
	}
	return r.count(q)
}
