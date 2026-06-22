package resolvers

// Hand-written dashboard count resolvers (the home screen's 7 widgets), kept out of the
// generated schema.resolvers.go. Mirrors server/service/src/dashboard/*. Date windows are
// computed in UTC for the prototype (the widgets pass no timezone).

import (
	"context"
	"time"

	"github.com/msupply-foundation/open-msupply/server-go/internal/graphql/model"
	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
)

const dateFmt = "2006-01-02"

func startOfDayUTC(now time.Time) string {
	return now.UTC().Format(dateFmt) + "T00:00:00"
}

func startOfWeekUTC(now time.Time) string {
	d := now.UTC()
	// ISO week starts Monday; Go's Weekday() has Sunday=0.
	offset := (int(d.Weekday()) + 6) % 7
	return d.AddDate(0, 0, -offset).Format(dateFmt) + "T00:00:00"
}

func (r *queriesResolver) outboundShipmentCounts(_ context.Context, storeID string, _ *int) (*model.OutboundInvoiceCounts, error) {
	repo := repository.NewDashboardRepository(r.DB, r.Dialect)
	now := time.Now()
	today, week := startOfDayUTC(now), startOfWeekUTC(now)
	dayN, err := repo.CountInvoices(storeID, "OUTBOUND_SHIPMENT", nil, &today)
	if err != nil {
		return nil, err
	}
	weekN, err := repo.CountInvoices(storeID, "OUTBOUND_SHIPMENT", nil, &week)
	if err != nil {
		return nil, err
	}
	notShipped, err := repo.CountInvoices(storeID, "OUTBOUND_SHIPMENT", []string{"NEW", "ALLOCATED", "PICKED"}, nil)
	if err != nil {
		return nil, err
	}
	return &model.OutboundInvoiceCounts{
		Created:    &model.InvoiceCountsSummary{Today: dayN, ThisWeek: weekN},
		NotShipped: notShipped,
	}, nil
}

func (r *queriesResolver) inboundCounts(storeID string, externalSplit bool) (*model.InboundInvoiceCounts, error) {
	repo := repository.NewDashboardRepository(r.DB, r.Dialect)
	now := time.Now()
	today, week := startOfDayUTC(now), startOfWeekUTC(now)
	dayN, err := repo.CountInvoices(storeID, "INBOUND_SHIPMENT", nil, &today)
	if err != nil {
		return nil, err
	}
	weekN, err := repo.CountInvoices(storeID, "INBOUND_SHIPMENT", nil, &week)
	if err != nil {
		return nil, err
	}
	notDelivered, err := repo.CountInvoices(storeID, "INBOUND_SHIPMENT", []string{"SHIPPED"}, nil)
	if err != nil {
		return nil, err
	}
	return &model.InboundInvoiceCounts{
		Created:      &model.InvoiceCountsSummary{Today: dayN, ThisWeek: weekN},
		NotDelivered: notDelivered,
	}, nil
}

func (r *queriesResolver) stockCounts(_ context.Context, storeID string, _ *int, daysTillExpired *int) (*model.StockCounts, error) {
	repo := repository.NewDashboardRepository(r.DB, r.Dialect)
	now := time.Now().UTC()
	days := 30
	if daysTillExpired != nil {
		days = *daysTillExpired
	}
	today := now.Format(dateFmt)
	soonTo := now.AddDate(0, 0, days).Format(dateFmt)
	threeFrom := now.AddDate(0, 0, days+1).Format(dateFmt)
	threeTo := now.AddDate(0, 0, 90).Format(dateFmt)

	expired, err := repo.CountStockExpiredBefore(storeID, today)
	if err != nil {
		return nil, err
	}
	soon, err := repo.CountStockExpiringBetween(storeID, &today, &soonTo)
	if err != nil {
		return nil, err
	}
	threeMonths, err := repo.CountStockExpiringBetween(storeID, &threeFrom, &threeTo)
	if err != nil {
		return nil, err
	}
	return &model.StockCounts{
		Expired:                   expired,
		ExpiringSoon:              soon,
		ExpiringInNextThreeMonths: threeMonths,
		ExpiringBetweenThresholds: 0, // needs store preference thresholds; 0 for the prototype
	}, nil
}

func (r *queriesResolver) itemCounts(_ context.Context, storeID string, _ *float64, _ *float64) (*model.ItemCounts, error) {
	repo := repository.NewDashboardRepository(r.DB, r.Dialect)
	total, err := repo.CountActiveItems()
	if err != nil {
		return nil, err
	}
	noStock, err := repo.CountItemsNoStock(storeID)
	if err != nil {
		return nil, err
	}
	// Months-of-stock buckets need consumption (AMC) data; 0 without it (matches Rust's exclude).
	return &model.ItemCounts{ItemCounts: &model.ItemCountsResponse{Total: total, NoStock: noStock}}, nil
}

func (r *queriesResolver) requisitionCounts(_ context.Context, storeID string) (*model.RequisitionCounts, error) {
	repo := repository.NewDashboardRepository(r.DB, r.Dialect)
	responseNew, err := repo.CountRequisitions(storeID, "RESPONSE", "NEW", false)
	if err != nil {
		return nil, err
	}
	requestDraft, err := repo.CountRequisitions(storeID, "REQUEST", "DRAFT", false)
	if err != nil {
		return nil, err
	}
	emergencyNew, err := repo.CountRequisitions(storeID, "RESPONSE", "NEW", true)
	if err != nil {
		return nil, err
	}
	return &model.RequisitionCounts{
		Response:  &model.ResponseRequisitionCounts{New: responseNew},
		Request:   &model.RequestRequisitionCounts{Draft: requestDraft},
		Emergency: &model.EmergencyResponseRequisitionCounts{New: emergencyNew},
	}, nil
}
