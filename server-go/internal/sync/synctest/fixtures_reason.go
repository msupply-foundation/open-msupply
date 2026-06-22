package synctest

import (
	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// Ported verbatim from server/service/src/sync/test/test_data/reason.rs. Legacy sync table is
// "options".

const reasonTable = "options"

func ReasonPullUpsert() []IncomingRecord {
	return []IncomingRecord{
		IncomingUpsert(reasonTable, "positive_adjustment",
			`{"ID":"positive_adjustment","type":"positiveInventoryAdjustment","isActive":true,"title":"Found"}`,
			synctypes.PullUpsert(repository.ReasonOptionRow{
				ID: "positive_adjustment", Type: repository.ReasonPositiveInventoryAdjustment,
				IsActive: true, Reason: "Found",
			})),
		IncomingUpsert(reasonTable, "return_reason",
			`{"ID":"return_reason","type":"returnReason","isActive":true,"title":"Damaged"}`,
			synctypes.PullUpsert(repository.ReasonOptionRow{
				ID: "return_reason", Type: repository.ReasonReturnReason,
				IsActive: true, Reason: "Damaged",
			})),
		IncomingUpsert(reasonTable, "vvm_status_now_unusable",
			`{"ID":"vvm_status_now_unusable","type":"closedVialWastage","isActive":true,"title":"VVM Status Unusable"}`,
			synctypes.PullUpsert(repository.ReasonOptionRow{
				ID: "vvm_status_now_unusable", Type: repository.ReasonClosedVialWastage,
				IsActive: true, Reason: "VVM Status Unusable",
			})),
	}
}
