package translations

import (
	"encoding/json"
	"fmt"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// legacyOptionsRow mirrors translations::reason::LegacyOptionsRow. The legacy sync table is
// "options"; the "type" field uses camelCase enum values.
type legacyOptionsRow struct {
	ID       string `json:"ID"`
	Type     string `json:"type"`
	IsActive bool   `json:"isActive"`
	Reason   string `json:"title"`
}

// legacyReasonType maps the legacy camelCase options type to the repository ReasonOptionType.
var legacyReasonType = map[string]repository.ReasonOptionType{
	"positiveInventoryAdjustment": repository.ReasonPositiveInventoryAdjustment,
	"negativeInventoryAdjustment": repository.ReasonNegativeInventoryAdjustment,
	"openVialWastage":             repository.ReasonOpenVialWastage,
	"returnReason":                repository.ReasonReturnReason,
	"requisitionLineVariance":     repository.ReasonRequisitionLineVariance,
	"closedVialWastage":           repository.ReasonClosedVialWastage,
}

// Reason is a trivial, dependency-free, untracked translator (legacy table "options").
type Reason struct{ synctypes.BaseTranslation }

func (Reason) TableNames() []string { return []string{"options"} }

func (Reason) TryTranslateFromUpsert(_ synctypes.Exec, _ db.Dialect, row *synctypes.SyncBufferRow) (synctypes.PullTranslateResult, error) {
	var data legacyOptionsRow
	if err := json.Unmarshal([]byte(row.Data), &data); err != nil {
		return synctypes.NotMatched(), err
	}
	rt, ok := legacyReasonType[data.Type]
	if !ok {
		return synctypes.NotMatched(), fmt.Errorf("unknown options type %q for reason %s", data.Type, data.ID)
	}
	return synctypes.PullUpsert(repository.ReasonOptionRow{
		ID:       data.ID,
		Type:     rt,
		IsActive: data.IsActive,
		Reason:   data.Reason,
	}), nil
}

func (Reason) TryTranslateFromDelete(_ synctypes.Exec, _ db.Dialect, row *synctypes.SyncBufferRow) (synctypes.PullTranslateResult, error) {
	return synctypes.PullDelete(repository.ReasonOptionRowDelete{ID: row.RecordID}), nil
}
