package resolvers

import (
	"context"
	"time"

	"github.com/msupply-foundation/open-msupply/server-go/internal/graphql/loaders"
	"github.com/msupply-foundation/open-msupply/server-go/internal/graphql/model"
	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
)

// otherParty resolves InvoiceNode.otherParty via the request-scoped DataLoader, batching all
// the invoices' name lookups in a query into ONE `name WHERE id IN (...)` round-trip.
// (The storeId arg is ignored in the spike; Rust uses it for store-context name visibility.)
func (r *invoiceNodeResolver) otherParty(ctx context.Context, obj *model.InvoiceNode, _ string) (*model.NameNode, error) {
	return loaders.For(ctx).NameByID.Load(ctx, obj.OtherPartyID)
}

// graphqlDateTime mirrors the Rust DateTime scalar on the wire:
//
//	DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc).to_rfc3339()
//
// async-graphql serializes DateTime<Utc> with chrono's to_rfc3339(), which uses a numeric
// "+00:00" offset (NOT "Z") and AutoSi fractional seconds. Go's time.RFC3339 would emit "Z"
// for UTC, so we use an explicit numeric-offset layout to match byte-for-byte.
//
// NOTE: AutoSi fractional-second grouping (3/6/9 digits) is not yet replicated; current
// production datetimes are whole-second, so this matches today. Tracked as a refinement.
func graphqlDateTime(dbVal string) string {
	t, ok := parseNaiveUTC(dbVal)
	if !ok {
		return dbVal // leave untouched if it isn't a datetime we recognise
	}
	return t.Format("2006-01-02T15:04:05-07:00")
}

func parseNaiveUTC(s string) (time.Time, bool) {
	for _, layout := range []string{
		"2006-01-02T15:04:05.999999999",
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05.999999999",
		"2006-01-02 15:04:05",
		time.RFC3339,
	} {
		if t, err := time.ParseInLocation(layout, s, time.UTC); err == nil {
			return t.UTC(), true
		}
	}
	return time.Time{}, false
}

// invoices is the hand-written implementation behind the generated Invoices stub. Kept in a
// non-generated file so `gqlgen generate` never clobbers it. It maps the GraphQL inputs to
// the repository layer (WS2) and returns the InvoiceConnector union member.
func (r *queriesResolver) invoices(
	ctx context.Context,
	storeID string,
	page *model.PaginationInput,
	filter *model.InvoiceFilterInput,
	sort []*model.InvoiceSortInput,
	typeArg []model.InvoiceTypeInput,
) (model.InvoicesResponse, error) {
	repo := repository.NewInvoiceRepository(r.DB, r.Dialect)

	repoFilter := mapInvoiceFilter(storeID, filter, typeArg)
	repoSort := mapInvoiceSort(sort)
	repoPage := mapPagination(page)

	rows, err := repo.Query(repoFilter, repoSort, repoPage)
	if err != nil {
		return nil, err
	}
	count, err := repo.Count(repoFilter)
	if err != nil {
		return nil, err
	}

	nodes := make([]*model.InvoiceNode, 0, len(rows))
	for _, inv := range rows {
		node := &model.InvoiceNode{
			ID:              inv.ID,
			OtherPartyName:  inv.OtherPartyName,
			OtherPartyID:    inv.NameID,
			Type:            model.InvoiceNodeType(inv.Type),
			Status:          model.InvoiceNodeStatus(inv.Status),
			InvoiceNumber:   int(inv.InvoiceNumber),
			OnHold:          inv.OnHold,
			CreatedDatetime: graphqlDateTime(inv.CreatedDate),
		}
		if inv.Comment.Valid {
			c := inv.Comment.String
			node.Comment = &c
		}
		nodes = append(nodes, node)
	}

	return model.InvoiceConnector{TotalCount: int(count), Nodes: nodes}, nil
}

// mapInvoiceFilter mirrors the storeId scoping + filter inputs handled by the Rust resolver.
func mapInvoiceFilter(storeID string, f *model.InvoiceFilterInput, typeArg []model.InvoiceTypeInput) *repository.InvoiceFilter {
	out := &repository.InvoiceFilter{
		// invoices are scoped to the requesting store, matching the Rust query.
		StoreID: &repository.EqualFilter[string]{EqualTo: &storeID},
	}
	if len(typeArg) > 0 {
		vals := make([]string, len(typeArg))
		for i, t := range typeArg {
			vals[i] = string(t)
		}
		out.Type = &repository.EqualFilter[string]{EqualAny: vals}
	}
	if f == nil {
		return out
	}
	if f.ID != nil {
		out.ID = mapEqualString(f.ID)
	}
	if f.Status != nil {
		out.Status = mapEqualEnum(f.Status.EqualTo, f.Status.EqualAny)
	}
	if f.Type != nil {
		out.Type = mapEqualEnum(f.Type.EqualTo, f.Type.EqualAny)
	}
	if f.OtherPartyName != nil {
		out.OtherPartyName = &repository.StringFilter{EqualTo: f.OtherPartyName.EqualTo, Like: f.OtherPartyName.Like}
	}
	if f.Comment != nil {
		out.Comment = &repository.StringFilter{EqualTo: f.Comment.EqualTo, Like: f.Comment.Like}
	}
	return out
}

func mapEqualString(in *model.EqualFilterStringInput) *repository.EqualFilter[string] {
	return &repository.EqualFilter[string]{EqualTo: in.EqualTo, EqualAny: in.EqualAny, NotEqual: in.NotEqualTo}
}

// mapEqualEnum converts a GraphQL enum equal-filter (stringly-typed) to the repository filter.
func mapEqualEnum[T ~string](equalTo *T, equalAny []T) *repository.EqualFilter[string] {
	out := &repository.EqualFilter[string]{}
	if equalTo != nil {
		s := string(*equalTo)
		out.EqualTo = &s
	}
	for _, v := range equalAny {
		out.EqualAny = append(out.EqualAny, string(v))
	}
	return out
}

func mapInvoiceSort(sort []*model.InvoiceSortInput) *repository.InvoiceSort {
	if len(sort) == 0 {
		return nil
	}
	s := sort[0] // "only first sort input is evaluated for this endpoint" (per SDL comment)
	desc := s.Desc != nil && *s.Desc
	var key repository.InvoiceSortField
	switch s.Key {
	case model.InvoiceSortFieldInputInvoiceNumber:
		key = repository.SortInvoiceNumber
	case model.InvoiceSortFieldInputCreatedDatetime:
		key = repository.SortCreatedDatetime
	case model.InvoiceSortFieldInputStatus:
		key = repository.SortStatus
	case model.InvoiceSortFieldInputOtherPartyName:
		key = repository.SortOtherPartyName
	case model.InvoiceSortFieldInputInvoiceDatetime:
		key = repository.SortInvoiceDatetime
	default:
		key = repository.SortInvoiceNumber
	}
	return &repository.InvoiceSort{Key: key, Desc: desc}
}

func mapPagination(p *model.PaginationInput) repository.Pagination {
	out := repository.Pagination{}
	if p == nil {
		return out
	}
	if p.First != nil {
		f := uint64(*p.First)
		out.First = &f
	}
	if p.Offset != nil {
		out.Offset = uint64(*p.Offset)
	}
	return out
}
