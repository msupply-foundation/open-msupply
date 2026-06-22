// Package translations holds the per-entity sync translators, mirroring
// server/service/src/sync/translations/*.rs. Each translator decodes a legacy mSupply (or
// OMS/V6) sync record into a repository row + integration operation (pull), and serializes a
// changelog row back into an outgoing sync record (push). AllTranslators() is the registry.
package translations

import (
	"database/sql"
	"encoding/json"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// legacyUnitRow mirrors translations::unit::LegacyUnitRow.
type legacyUnitRow struct {
	ID          string `json:"ID"`
	Units       string `json:"units"`
	Comment     string `json:"comment"`
	OrderNumber int32  `json:"order_number"`
}

// Unit is a trivial, dependency-free, untracked (central data, pull-only) translator.
type Unit struct{ synctypes.BaseTranslation }

func (Unit) TableNames() []string { return []string{"unit"} }

func (Unit) TryTranslateFromUpsert(_ synctypes.Exec, _ db.Dialect, row *synctypes.SyncBufferRow) (synctypes.PullTranslateResult, error) {
	var data legacyUnitRow
	if err := json.Unmarshal([]byte(row.Data), &data); err != nil {
		return synctypes.NotMatched(), err
	}
	u := repository.UnitRow{
		ID:       data.ID,
		Name:     data.Units,
		Index:    data.OrderNumber,
		IsActive: true,
	}
	if data.Comment != "" {
		u.Description = sql.NullString{String: data.Comment, Valid: true}
	}
	return synctypes.PullUpsert(u), nil
}

func (Unit) TryTranslateFromDelete(_ synctypes.Exec, _ db.Dialect, row *synctypes.SyncBufferRow) (synctypes.PullTranslateResult, error) {
	return synctypes.PullDelete(repository.UnitRowDelete{ID: row.RecordID}), nil
}
