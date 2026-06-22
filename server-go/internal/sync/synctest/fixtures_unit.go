package synctest

import (
	"database/sql"

	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// Ported verbatim from server/service/src/sync/test/test_data/unit.rs.

const unitTable = "unit"

func UnitPullUpsert() []IncomingRecord {
	return []IncomingRecord{
		IncomingUpsert(unitTable, "A02C91EB6C77400BA783C4CD7C565F2A",
			`{"ID":"A02C91EB6C77400BA783C4CD7C565F2A","units":"Units","comment":"","order_number":0}`,
			synctypes.PullUpsert(repository.UnitRow{
				ID: "A02C91EB6C77400BA783C4CD7C565F2A", Name: "Units", Index: 0, IsActive: true,
			})),
		IncomingUpsert(unitTable, "EC87200254974C609293D88E470598C4",
			`{"ID":"EC87200254974C609293D88E470598C4","units":"Tab","comment":"","order_number":1}`,
			synctypes.PullUpsert(repository.UnitRow{
				ID: "EC87200254974C609293D88E470598C4", Name: "Tab", Index: 1, IsActive: true,
			})),
		IncomingUpsert(unitTable, "A02C91EB6C77400BA783C4CD7C565F29",
			`{"ID":"A02C91EB6C77400BA783C4CD7C565F29","units":"Bottle","comment":"This is a bottle unit type","order_number":2}`,
			synctypes.PullUpsert(repository.UnitRow{
				ID: "A02C91EB6C77400BA783C4CD7C565F29", Name: "Bottle",
				Description: sql.NullString{String: "This is a bottle unit type", Valid: true},
				Index:       2, IsActive: true,
			})),
		IncomingUpsert(unitTable, "97674EFD5DFD4D8CABCAF58AAB4ED054",
			`{"ID":"97674EFD5DFD4D8CABCAF58AAB4ED054","units":"Vial","comment":"This is a vial unit type","order_number":3}`,
			synctypes.PullUpsert(repository.UnitRow{
				ID: "97674EFD5DFD4D8CABCAF58AAB4ED054", Name: "Vial",
				Description: sql.NullString{String: "This is a vial unit type", Valid: true},
				Index:       3, IsActive: true,
			})),
	}
}

func UnitPullDelete() []IncomingRecord {
	return []IncomingRecord{
		IncomingDelete(unitTable, "A02C91EB6C77400BA783C4CD7C565F2A",
			synctypes.PullDelete(repository.UnitRowDelete{ID: "A02C91EB6C77400BA783C4CD7C565F2A"})),
	}
}
