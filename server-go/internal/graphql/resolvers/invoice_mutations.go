package resolvers

// Hand-written outbound-shipment CRUD mutations (the Milestone-3 recipe), kept out of the
// generated schema.resolvers.go. Each opens a transaction, writes through the tracked write
// repos (which emit changelog rows), and returns the GraphQL union member. Validation is light
// for the prototype; otherPartyId is used directly as the name_link_id (in the demo data
// name_link.id == name.id).

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/msupply-foundation/open-msupply/server-go/internal/graphql/model"
	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

func nowDatetime() string { return time.Now().UTC().Format("2006-01-02T15:04:05") }

func nowNS() sql.NullString { return sql.NullString{String: nowDatetime(), Valid: true} }

func strNS(p *string) sql.NullString {
	if p == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *p, Valid: true}
}

func boolOr(p *bool) bool { return p != nil && *p }

// withTx runs fn inside a transaction (a *sql.Tx satisfies synctypes.Exec).
func (r *Resolver) withTx(fn func(tx synctypes.Exec) error) error {
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

func nsDateTimePtr(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	s := graphqlDateTime(ns.String)
	return &s
}

func invoiceNodeFromRow(row *repository.InvoiceRow) *model.InvoiceNode {
	return &model.InvoiceNode{
		ID:                row.ID,
		OtherPartyID:      row.NameLinkID,
		Type:              model.InvoiceNodeType(row.Type),
		Status:            model.InvoiceNodeStatus(row.Status),
		InvoiceNumber:     int(row.InvoiceNumber),
		OnHold:            row.OnHold,
		CreatedDatetime:   graphqlDateTime(row.CreatedDatetime),
		AllocatedDatetime: nsDateTimePtr(row.AllocatedDatetime),
		PickedDatetime:    nsDateTimePtr(row.PickedDatetime),
		ShippedDatetime:   nsDateTimePtr(row.ShippedDatetime),
		DeliveredDatetime: nsDateTimePtr(row.DeliveredDatetime),
		VerifiedDatetime:  nsDateTimePtr(row.VerifiedDatetime),
		Comment:           nsToPtr(row.Comment),
		TheirReference:    nsToPtr(row.TheirReference),
		Colour:            nsToPtr(row.Colour),
		CurrencyRate:      row.CurrencyRate,
	}
}

func invoiceLineNodeFromRow(row *repository.InvoiceLineRow) *model.InvoiceLineNode {
	return &model.InvoiceLineNode{
		ID:               row.ID,
		InvoiceID:        row.InvoiceID,
		Type:             model.InvoiceLineNodeType(row.Type),
		ItemID:           row.ItemLinkID,
		ItemName:         row.ItemName,
		ItemCode:         row.ItemCode,
		PackSize:         row.PackSize,
		NumberOfPacks:    row.NumberOfPacks,
		CostPricePerPack: row.CostPricePerPack,
		SellPricePerPack: row.SellPricePerPack,
		TotalBeforeTax:   row.TotalBeforeTax,
		TotalAfterTax:    row.TotalAfterTax,
		Batch:            nsToPtr(row.Batch),
		ExpiryDate:       nsToPtr(row.ExpiryDate),
		LocationID:       nsToPtr(row.LocationID),
		VolumePerPack:    row.VolumePerPack,
	}
}

// --- header CRUD ---

func (r *mutationsResolver) insertOutboundShipment(_ context.Context, storeID string, input model.InsertOutboundShipmentInput) (model.InsertOutboundShipmentResponse, error) {
	var node *model.InvoiceNode
	err := r.withTx(func(tx synctypes.Exec) error {
		repo := repository.NewInvoiceRowRepository(tx, r.Dialect)
		num, err := repo.NextInvoiceNumber(storeID, "OUTBOUND_SHIPMENT")
		if err != nil {
			return err
		}
		row := &repository.InvoiceRow{
			ID: input.ID, NameLinkID: input.OtherPartyID, StoreID: storeID,
			InvoiceNumber: num, Type: "OUTBOUND_SHIPMENT", Status: "NEW",
			OnHold: boolOr(input.OnHold), Comment: strNS(input.Comment),
			TheirReference: strNS(input.TheirReference), Colour: strNS(input.Colour),
			CreatedDatetime: nowDatetime(), CurrencyRate: 1,
		}
		if _, err := repo.UpsertOne(row); err != nil {
			return err
		}
		node = invoiceNodeFromRow(row)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return node, nil
}

func (r *mutationsResolver) updateOutboundShipment(_ context.Context, storeID string, input model.UpdateOutboundShipmentInput) (model.UpdateOutboundShipmentResponse, error) {
	var node *model.InvoiceNode
	err := r.withTx(func(tx synctypes.Exec) error {
		repo := repository.NewInvoiceRowRepository(tx, r.Dialect)
		row, err := repo.FindOneByID(input.ID)
		if err != nil {
			return err
		}
		if row == nil {
			return fmt.Errorf("invoice %s not found", input.ID)
		}
		if input.OnHold != nil {
			row.OnHold = *input.OnHold
		}
		if input.Comment != nil {
			row.Comment = sql.NullString{String: *input.Comment, Valid: true}
		}
		if input.TheirReference != nil {
			row.TheirReference = sql.NullString{String: *input.TheirReference, Valid: true}
		}
		if input.Colour != nil {
			row.Colour = sql.NullString{String: *input.Colour, Valid: true}
		}
		if input.Status != nil {
			applyOutboundStatus(row, *input.Status)
		}
		if _, err := repo.UpsertOne(row); err != nil {
			return err
		}
		node = invoiceNodeFromRow(row)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return node, nil
}

// applyOutboundStatus advances the invoice status and stamps the matching datetime.
func applyOutboundStatus(row *repository.InvoiceRow, status model.UpdateOutboundShipmentStatusInput) {
	switch status {
	case model.UpdateOutboundShipmentStatusInputAllocated:
		row.Status = "ALLOCATED"
		if !row.AllocatedDatetime.Valid {
			row.AllocatedDatetime = nowNS()
		}
	case model.UpdateOutboundShipmentStatusInputPicked:
		row.Status = "PICKED"
		if !row.PickedDatetime.Valid {
			row.PickedDatetime = nowNS()
		}
	case model.UpdateOutboundShipmentStatusInputShipped:
		row.Status = "SHIPPED"
		if !row.ShippedDatetime.Valid {
			row.ShippedDatetime = nowNS()
		}
	}
}

func (r *mutationsResolver) deleteOutboundShipment(_ context.Context, _ string, id string) (model.DeleteOutboundShipmentResponse, error) {
	err := r.withTx(func(tx synctypes.Exec) error {
		// Remove lines first (FK), then the invoice (which writes a delete changelog).
		if _, err := tx.Exec(r.Dialect.Rebind(`DELETE FROM invoice_line WHERE invoice_id = ?`), id); err != nil {
			return err
		}
		_, _, err := repository.NewInvoiceRowRepository(tx, r.Dialect).Delete(id)
		return err
	})
	if err != nil {
		return nil, err
	}
	return model.DeleteResponse{ID: id}, nil
}

// --- line CRUD ---

func (r *mutationsResolver) insertOutboundShipmentLine(_ context.Context, _ string, input model.InsertOutboundShipmentLineInput) (model.InsertOutboundShipmentLineResponse, error) {
	var node *model.InvoiceLineNode
	err := r.withTx(func(tx synctypes.Exec) error {
		lineRepo := repository.NewInvoiceLineRowRepository(tx, r.Dialect)
		sl, err := lineRepo.StockLineForLine(input.StockLineID)
		if err != nil {
			return err
		}
		if sl == nil {
			return fmt.Errorf("stock line %s not found", input.StockLineID)
		}
		row := &repository.InvoiceLineRow{
			ID: input.ID, InvoiceID: input.InvoiceID, ItemLinkID: sl.ItemLinkID,
			ItemName: sl.ItemName, ItemCode: sl.ItemCode, Type: "STOCK_OUT",
			StockLineID:      sql.NullString{String: input.StockLineID, Valid: true},
			LocationID:       sl.LocationID,
			Batch:            sl.Batch,
			ExpiryDate:       sl.ExpiryDate,
			NumberOfPacks:    input.NumberOfPacks,
			PackSize:         sl.PackSize,
			CostPricePerPack: sl.CostPricePerPack,
			SellPricePerPack: sl.SellPricePerPack,
			TotalBeforeTax:   input.NumberOfPacks * sl.SellPricePerPack,
			TotalAfterTax:    input.NumberOfPacks * sl.SellPricePerPack,
			VolumePerPack:    sl.VolumePerPack,
		}
		if input.TaxPercentage != nil {
			row.TaxPercentage = sql.NullFloat64{Float64: *input.TaxPercentage, Valid: true}
		}
		if _, err := lineRepo.UpsertOne(row); err != nil {
			return err
		}
		node = invoiceLineNodeFromRow(row)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return node, nil
}

func (r *mutationsResolver) deleteOutboundShipmentLine(_ context.Context, _ string, input model.DeleteOutboundShipmentLineInput) (model.DeleteOutboundShipmentLineResponse, error) {
	err := r.withTx(func(tx synctypes.Exec) error {
		_, _, err := repository.NewInvoiceLineRowRepository(tx, r.Dialect).Delete(input.ID)
		return err
	})
	if err != nil {
		return nil, err
	}
	return model.DeleteResponse{ID: input.ID}, nil
}
