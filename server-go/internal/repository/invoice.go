// Package repository is the WS2 spike slice: prove the Rust repository patterns
// (define_linked_tables! core/view, macro-based dynamic filter/sort, dual-dialect) port to
// Go using database/sql + squirrel. Modelled on server/repository/src/db_diesel/invoice.rs.
package repository

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"
	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
)

// Invoice is the read model. NameID/OtherPartyName come from the invoice_view link
// resolution (invoice.name_link_id -> name_link.name_id -> name), exactly as the Rust
// invoice_view + name join produces.
type Invoice struct {
	ID             string
	NameID         string
	OtherPartyName string
	Type           string
	Status         string
	InvoiceNumber  int64
	StoreID        string
	Comment        sql.NullString
	CreatedDate    string
	OnHold         bool
}

// EqualFilter mirrors repository::EqualFilter<T>: any subset may be set.
type EqualFilter[T comparable] struct {
	EqualTo  *T
	EqualAny []T
	NotEqual *T
}

// StringFilter mirrors repository::StringFilter (the subset we use).
type StringFilter struct {
	EqualTo *string
	Like    *string
}

// InvoiceFilter is the subset of server/repository/src/db_diesel/invoice.rs InvoiceFilter
// needed to exercise the dynamic-query patterns.
type InvoiceFilter struct {
	ID             *EqualFilter[string]
	StoreID        *EqualFilter[string]
	Type           *EqualFilter[string]
	Status         *EqualFilter[string]
	OtherPartyName *StringFilter
	Comment        *StringFilter
}

// InvoiceSortField mirrors the Rust InvoiceSortField (subset).
type InvoiceSortField int

const (
	SortInvoiceNumber InvoiceSortField = iota
	SortCreatedDatetime
	SortStatus
	SortOtherPartyName // case-insensitive, like Rust's apply_sort_no_case
	SortInvoiceDatetime
)

type InvoiceSort struct {
	Key  InvoiceSortField
	Desc bool
}

// Pagination mirrors the Rust pagination defaults/caps.
type Pagination struct {
	First  *uint64
	Offset uint64
}

const (
	defaultPaginationLimit = 100  // mirrors repository DEFAULT_PAGINATION_LIMIT
	maxPaginationLimit     = 1000 // mirrors the repository cap
)

// InvoiceRepository reads through invoice_view, mirroring InvoiceRepository in Rust.
type InvoiceRepository struct {
	conn    *sql.DB
	dialect db.Dialect
}

func NewInvoiceRepository(conn *sql.DB, dialect db.Dialect) *InvoiceRepository {
	return &InvoiceRepository{conn: conn, dialect: dialect}
}

func (r *InvoiceRepository) placeholder() sq.PlaceholderFormat {
	if r.dialect == db.Postgres {
		return sq.Dollar
	}
	return sq.Question
}

// baseQuery builds the SELECT against the linked-table view + name join (the read path).
func (r *InvoiceRepository) baseQuery() sq.SelectBuilder {
	return sq.Select(
		"iv.id",
		"iv.name_id",
		"n.name AS other_party_name",
		"iv.type",
		"iv.status",
		"iv.invoice_number",
		"iv.store_id",
		"iv.comment",
		"iv.created_datetime",
		"iv.on_hold",
	).
		From("invoice_view iv").
		Join("name n ON iv.name_id = n.id").
		PlaceholderFormat(r.placeholder())
}

// applyEqual mirrors apply_equal_filter! (equal_to / equal_any / not_equal_to).
func applyEqual[T comparable](q sq.SelectBuilder, col string, f *EqualFilter[T]) sq.SelectBuilder {
	if f == nil {
		return q
	}
	if f.EqualTo != nil {
		q = q.Where(sq.Eq{col: *f.EqualTo})
	}
	if len(f.EqualAny) > 0 {
		q = q.Where(sq.Eq{col: f.EqualAny})
	}
	if f.NotEqual != nil {
		q = q.Where(sq.NotEq{col: *f.NotEqual})
	}
	return q
}

// applyString mirrors apply_string_filter!: SQLite LIKE is case-insensitive; Postgres needs
// ILIKE (matching the #[cfg(feature = "postgres")] branch in diesel_macros.rs).
func (r *InvoiceRepository) applyString(q sq.SelectBuilder, col string, f *StringFilter) sq.SelectBuilder {
	if f == nil {
		return q
	}
	if f.EqualTo != nil {
		q = q.Where(sq.Eq{col: *f.EqualTo})
	}
	if f.Like != nil {
		op := "LIKE"
		if r.dialect == db.Postgres {
			op = "ILIKE"
		}
		q = q.Where(col+" "+op+" ?", "%"+*f.Like+"%")
	}
	return q
}

func (r *InvoiceRepository) applyFilter(q sq.SelectBuilder, f *InvoiceFilter) sq.SelectBuilder {
	if f == nil {
		return q
	}
	q = applyEqual(q, "iv.id", f.ID)
	q = applyEqual(q, "iv.store_id", f.StoreID)
	q = applyEqual(q, "iv.type", f.Type)
	q = applyEqual(q, "iv.status", f.Status)
	q = r.applyString(q, "n.name", f.OtherPartyName)
	q = r.applyString(q, "iv.comment", f.Comment)
	return q
}

func (r *InvoiceRepository) applySort(q sq.SelectBuilder, s *InvoiceSort) sq.SelectBuilder {
	if s == nil {
		return q
	}
	dir := "ASC"
	if s.Desc {
		dir = "DESC"
	}
	var expr string
	switch s.Key {
	case SortInvoiceNumber:
		expr = "iv.invoice_number"
	case SortCreatedDatetime:
		expr = "iv.created_datetime"
	case SortStatus:
		expr = "iv.status"
	case SortOtherPartyName:
		// case-insensitive, mirroring apply_sort_no_case!
		expr = "n.name COLLATE NOCASE"
		if r.dialect == db.Postgres {
			expr = "LOWER(n.name)"
		}
	case SortInvoiceDatetime:
		// mirrors datetime_coalesce::coalesce(backdated_datetime, created_datetime)
		expr = "COALESCE(iv.backdated_datetime, iv.created_datetime)"
	}
	return q.OrderBy(expr + " " + dir)
}

// Query returns the filtered/sorted/paginated invoices.
func (r *InvoiceRepository) Query(filter *InvoiceFilter, sort *InvoiceSort, page Pagination) ([]Invoice, error) {
	q := r.baseQuery()
	q = r.applyFilter(q, filter)
	q = r.applySort(q, sort)

	limit := uint64(defaultPaginationLimit)
	if page.First != nil {
		limit = *page.First
		if limit > maxPaginationLimit {
			limit = maxPaginationLimit
		}
	}
	q = q.Limit(limit).Offset(page.Offset)

	rows, err := q.RunWith(r.conn).Query()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Invoice
	for rows.Next() {
		var inv Invoice
		if err := rows.Scan(
			&inv.ID, &inv.NameID, &inv.OtherPartyName, &inv.Type, &inv.Status,
			&inv.InvoiceNumber, &inv.StoreID, &inv.Comment, &inv.CreatedDate, &inv.OnHold,
		); err != nil {
			return nil, err
		}
		out = append(out, inv)
	}
	return out, rows.Err()
}

// Count returns the number of matching invoices (filter only), like InvoiceRepository::count.
func (r *InvoiceRepository) Count(filter *InvoiceFilter) (int64, error) {
	q := sq.Select("COUNT(*)").
		From("invoice_view iv").
		Join("name n ON iv.name_id = n.id").
		PlaceholderFormat(r.placeholder())
	q = r.applyFilter(q, filter)
	var n int64
	if err := q.RunWith(r.conn).QueryRow().Scan(&n); err != nil {
		return 0, err
	}
	return n, nil
}
