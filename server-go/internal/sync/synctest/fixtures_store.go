package synctest

import (
	"database/sql"

	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// Ported from server/service/src/sync/test/test_data/store.rs. STORE_1 integrates (two ops:
// lean row + logo); STORE_2/3/4 are system stores that get Ignored. JSON is embedded because
// STORE_1's "tags" field contains a backtick.

const storeTable = "store"

const storeGenName = "1FB32324AF8049248D929CFB35F255BA"

// SeedStoreName inserts the name + name_link that STORE_1 depends on (the FK guard the store
// translator runs). Placeholder-free so it runs on both SQLite and Postgres.
func SeedStoreName(exec synctypes.Exec) error {
	// name.type has a DEFAULT on SQLite but not on Postgres, so set it explicitly (FACILITY).
	if _, err := exec.Exec(`INSERT INTO name (id, name, code, is_customer, is_supplier, type) ` +
		`VALUES ('` + storeGenName + `', 'General', 'GEN', FALSE, FALSE, 'FACILITY')`); err != nil {
		return err
	}
	_, err := exec.Exec(`INSERT INTO name_link (id, name_id) ` +
		`VALUES ('` + storeGenName + `', '` + storeGenName + `')`)
	return err
}

func StorePullUpsert() []IncomingRecord {
	const ignoredSystem = "System names not implemented for store translation"
	return []IncomingRecord{
		IncomingUpsert(storeTable, "4E27CEB263354EB7B1B33CEA8F7884D8", LoadJSON("store/store_1.json"),
			synctypes.PullOps(
				synctypes.UpsertOp(repository.StoreRow{
					ID: "4E27CEB263354EB7B1B33CEA8F7884D8", NameLinkID: storeGenName,
					Code: "GEN", SiteID: 1, StoreMode: repository.StoreModeStore,
					CreatedDate: sql.NullString{String: "2021-09-03", Valid: true}, IsDisabled: false,
				}),
				synctypes.UpsertOp(repository.StoreLogoRow{
					ID:   "4E27CEB263354EB7B1B33CEA8F7884D8",
					Logo: sql.NullString{String: "No logo", Valid: true},
				}),
			)).WithExtraData(SeedStoreName),
		IncomingUpsert(storeTable, "9EDD3F83C3D64C22A3CC9C98CF4967C5", LoadJSON("store/store_2.json"),
			synctypes.PullIgnoredMsg(ignoredSystem)),
		IncomingUpsert(storeTable, "9A3F71AA4C6D48649ADBC4B2966C5B9D", LoadJSON("store/store_3.json"),
			synctypes.PullIgnoredMsg(ignoredSystem)),
		IncomingUpsert(storeTable, "2CD38EF518764ED79258961101100C3D", LoadJSON("store/store_4.json"),
			synctypes.PullIgnoredMsg(ignoredSystem)),
	}
}

func StorePullDelete() []IncomingRecord {
	return []IncomingRecord{
		IncomingDelete(storeTable, "2CD38EF518764ED79258961101100C3D",
			synctypes.PullDelete(repository.StoreRowDelete{ID: "2CD38EF518764ED79258961101100C3D"})),
	}
}
