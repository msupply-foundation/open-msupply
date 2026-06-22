package translations

import (
	"database/sql"
	"encoding/json"
	"fmt"

	sq "github.com/Masterminds/squirrel"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// legacyStockLineOmsFields mirrors translations::stock_line::StockLineRowOmsFields (the OMS
// extension fields carried inside the legacy record's "oms_fields" object).
type legacyStockLineOmsFields struct {
	CampaignID *string `json:"campaign_id"`
	ProgramID  *string `json:"program_id"`
}

// legacyStockLineRow mirrors translations::stock_line::LegacyStockLineRow (legacy table
// "item_line"). Optional strings are pointers so "" / absent become NULL.
type legacyStockLineRow struct {
	ID            string                    `json:"ID"`
	StoreID       string                    `json:"store_ID"`
	ItemID        string                    `json:"item_ID"`
	Batch         *string                   `json:"batch"`
	ExpiryDate    *string                   `json:"expiry_date"`
	Hold          bool                      `json:"hold"`
	LocationID    *string                   `json:"location_ID"`
	PackSize      float64                   `json:"pack_size"`
	Available     float64                   `json:"available"`
	Quantity      float64                   `json:"quantity"`
	CostPrice     float64                   `json:"cost_price"`
	SellPrice     float64                   `json:"sell_price"`
	Note          *string                   `json:"note"`
	SupplierID    *string                   `json:"name_ID"`
	BarcodeID     *string                   `json:"barcodeID"`
	ItemVariantID *string                   `json:"om_item_variant_id"`
	DonorID       *string                   `json:"donor_id"`
	VVMStatusID   *string                   `json:"vvm_status_id"`
	OmsFields     *legacyStockLineOmsFields `json:"oms_fields"`
	TotalVolume   float64                   `json:"total_volume"`
	VolumePerPack float64                   `json:"volume_per_pack"`
}

// StockLine is a tracked (changelog) remote-data entity. Legacy table "item_line".
type StockLine struct{ synctypes.BaseTranslation }

func (StockLine) TableNames() []string { return []string{"item_line"} }

func (StockLine) PullDependencies() []string {
	return []string{"item", "item_variant", "name", "store", "location", "barcode", "vvm_status", "campaign"}
}

func (StockLine) ChangelogType() (synctypes.ChangelogTableName, bool) {
	return synctypes.ChangelogStockLine, true
}

// ptrToNS maps a JSON optional string to a NullString, treating nil OR "" as NULL — mirroring
// util::sync_serde::empty_str_as_option_string used on every optional field of the legacy row.
func ptrToNS(p *string) sql.NullString {
	if p == nil || *p == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: *p, Valid: true}
}

func (StockLine) TryTranslateFromUpsert(exec synctypes.Exec, d db.Dialect, row *synctypes.SyncBufferRow) (synctypes.PullTranslateResult, error) {
	var data legacyStockLineRow
	if err := json.Unmarshal([]byte(row.Data), &data); err != nil {
		return synctypes.NotMatched(), err
	}

	// Clear optional FKs whose referenced rows are missing (mirrors clear_invalid_fk).
	barcodeID, err := clearFK(exec, d, "barcode", ptrToNS(data.BarcodeID))
	if err != nil {
		return synctypes.NotMatched(), err
	}
	locationID, err := clearFK(exec, d, "location", ptrToNS(data.LocationID))
	if err != nil {
		return synctypes.NotMatched(), err
	}
	itemVariantID, err := clearFK(exec, d, "item_variant", ptrToNS(data.ItemVariantID))
	if err != nil {
		return synctypes.NotMatched(), err
	}
	vvmStatusID, err := clearFK(exec, d, "vvm_status", ptrToNS(data.VVMStatusID))
	if err != nil {
		return synctypes.NotMatched(), err
	}

	var campaign, program *string
	if data.OmsFields != nil {
		campaign, program = data.OmsFields.CampaignID, data.OmsFields.ProgramID
	}
	campaignID, err := clearFK(exec, d, "campaign", ptrToNS(campaign))
	if err != nil {
		return synctypes.NotMatched(), err
	}
	programID, err := clearFK(exec, d, "program", ptrToNS(program))
	if err != nil {
		return synctypes.NotMatched(), err
	}

	return synctypes.PullUpsert(repository.StockLineRow{
		ID:                     data.ID,
		StoreID:                data.StoreID,
		ItemLinkID:             data.ItemID,
		LocationID:             locationID,
		Batch:                  ptrToNS(data.Batch),
		PackSize:               data.PackSize,
		CostPricePerPack:       data.CostPrice,
		SellPricePerPack:       data.SellPrice,
		AvailableNumberOfPacks: data.Available,
		TotalNumberOfPacks:     data.Quantity,
		ExpiryDate:             zeroDateAsOption(deref(data.ExpiryDate)),
		OnHold:                 data.Hold,
		Note:                   ptrToNS(data.Note),
		BarcodeID:              barcodeID,
		ItemVariantID:          itemVariantID,
		VVMStatusID:            vvmStatusID,
		CampaignID:             campaignID,
		ProgramID:              programID,
		TotalVolume:            data.TotalVolume,
		VolumePerPack:          data.VolumePerPack,
		SupplierLinkID:         ptrToNS(data.SupplierID),
		DonorLinkID:            ptrToNS(data.DonorID),
	}), nil
}

func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// TryTranslateToUpsert reads the stored stock line back (resolving item_link_id -> item_id and
// supplier_link_id -> name_id) and serializes it to the legacy "item_line" record.
func (s StockLine) TryTranslateToUpsert(exec synctypes.Exec, d db.Dialect, cl *synctypes.ChangelogRow) (synctypes.PushTranslateResult, error) {
	q := sq.Select(
		"sl.id", "sl.store_id", "il.item_id", "sl.batch", "sl.expiry_date", "sl.on_hold",
		"sl.location_id", "sl.pack_size", "sl.available_number_of_packs", "sl.total_number_of_packs",
		"sl.cost_price_per_pack", "sl.sell_price_per_pack", "sl.note", "snl.name_id",
		"sl.barcode_id", "sl.item_variant_id", "sl.donor_link_id", "sl.vvm_status_id",
		"sl.campaign_id", "sl.program_id", "sl.total_volume", "sl.volume_per_pack",
	).
		From("stock_line sl").
		Join("item_link il ON sl.item_link_id = il.id").
		LeftJoin("name_link snl ON sl.supplier_link_id = snl.id").
		Where(sq.Eq{"sl.id": cl.RecordID}).
		PlaceholderFormat(placeholderFor(d))

	var r legacyStockLineRow
	var batch, expiry, location, note, supplier, barcode, itemVariant, donor, vvm, campaign, program sql.NullString
	err := q.RunWith(exec).QueryRow().Scan(
		&r.ID, &r.StoreID, &r.ItemID, &batch, &expiry, &r.Hold, &location, &r.PackSize,
		&r.Available, &r.Quantity, &r.CostPrice, &r.SellPrice, &note, &supplier, &barcode,
		&itemVariant, &donor, &vvm, &campaign, &program, &r.TotalVolume, &r.VolumePerPack)
	if err == sql.ErrNoRows {
		return synctypes.PushNotMatchedResult(), fmt.Errorf("stock_line %s not found for push", cl.RecordID)
	}
	if err != nil {
		return synctypes.PushNotMatchedResult(), err
	}

	r.Batch, r.ExpiryDate, r.LocationID, r.Note = nsToPtr(batch), nsToPtr(expiry), nsToPtr(location), nsToPtr(note)
	r.SupplierID, r.BarcodeID, r.ItemVariantID, r.DonorID, r.VVMStatusID =
		nsToPtr(supplier), nsToPtr(barcode), nsToPtr(itemVariant), nsToPtr(donor), nsToPtr(vvm)
	r.OmsFields = &legacyStockLineOmsFields{CampaignID: nsToPtr(campaign), ProgramID: nsToPtr(program)}

	data, err := json.Marshal(r)
	if err != nil {
		return synctypes.PushNotMatchedResult(), err
	}
	return synctypes.PushUpsert(cl, s.TableNames()[0], data), nil
}

func (s StockLine) TryTranslateToDelete(_ synctypes.Exec, _ db.Dialect, cl *synctypes.ChangelogRow) (synctypes.PushTranslateResult, error) {
	return synctypes.PushDelete(cl, s.TableNames()[0]), nil
}
