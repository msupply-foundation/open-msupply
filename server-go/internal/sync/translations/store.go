package translations

import (
	"encoding/json"
	"fmt"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// legacyStoreRow mirrors translations::store::LegacyStoreRow.
type legacyStoreRow struct {
	ID          string `json:"ID"`
	NameID      string `json:"name_ID"`
	Code        string `json:"code"`
	SiteID      int32  `json:"sync_id_remote_site"`
	Logo        string `json:"logo"`
	StoreMode   string `json:"store_mode"`
	CreatedDate string `json:"created_date"`
	IsDisabled  bool   `json:"disabled"`
}

var legacyStoreMode = map[string]repository.StoreMode{
	"store":      repository.StoreModeStore,
	"dispensary": repository.StoreModeDispensary,
}

// Store is FK-dependent (depends on "name") and untracked. It fans out into two operations:
// the lean StoreRow upsert and a StoreLogoRow logo update.
type Store struct{ synctypes.BaseTranslation }

func (Store) TableNames() []string { return []string{"store"} }

func (Store) PullDependencies() []string { return []string{"name"} }

func (Store) TryTranslateFromUpsert(exec synctypes.Exec, d db.Dialect, row *synctypes.SyncBufferRow) (synctypes.PullTranslateResult, error) {
	var data legacyStoreRow
	if err := json.Unmarshal([]byte(row.Data), &data); err != nil {
		return synctypes.NotMatched(), err
	}

	// System stores (HIS/DRG/SM) have properties that prevent integration.
	switch data.Code {
	case "HIS", "DRG", "SM":
		return synctypes.PullIgnoredMsg("System names not implemented for store translation"), nil
	}

	if data.NameID == "" {
		return synctypes.PullIgnoredMsg("Store has no name"), nil
	}

	// FK guard: skip if the name_link wasn't integrated (a missing FK would otherwise cause a
	// costly savepoint rollback per store under Postgres).
	exists, err := rowExists(exec, d, "name_link", data.NameID)
	if err != nil {
		return synctypes.NotMatched(), err
	}
	if !exists {
		return synctypes.PullIgnoredMsg(fmt.Sprintf(
			"Name link not found for name_id %s linked to store_id %s (%s)",
			data.NameID, data.ID, data.Code)), nil
	}

	mode, ok := legacyStoreMode[data.StoreMode]
	if !ok {
		return synctypes.NotMatched(), fmt.Errorf("unknown store_mode %q for store %s", data.StoreMode, data.ID)
	}

	storeRow := repository.StoreRow{
		ID:          data.ID,
		NameLinkID:  data.NameID,
		Code:        data.Code,
		SiteID:      data.SiteID,
		StoreMode:   mode,
		CreatedDate: zeroDateAsOption(data.CreatedDate),
		IsDisabled:  data.IsDisabled,
	}
	logoRow := repository.StoreLogoRow{
		ID:   data.ID,
		Logo: emptyStrAsOption(data.Logo),
	}

	// Lean row first so it exists, then the logo UPDATE — ordering is load-bearing.
	return synctypes.PullOps(synctypes.UpsertOp(storeRow), synctypes.UpsertOp(logoRow)), nil
}

func (Store) TryTranslateFromDelete(_ synctypes.Exec, _ db.Dialect, row *synctypes.SyncBufferRow) (synctypes.PullTranslateResult, error) {
	return synctypes.PullDelete(repository.StoreRowDelete{ID: row.RecordID}), nil
}
