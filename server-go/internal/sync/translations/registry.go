package translations

import "github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"

// AllTranslators is the Go registry, mirroring all_translators() in
// server/service/src/sync/translations/mod.rs. It currently holds the vertical-slice
// entities; append the remaining ~95 translators here during the mechanical rollout (the
// dependency ordering picks up each new PullDependencies() automatically).
func AllTranslators() []synctypes.SyncTranslation {
	return []synctypes.SyncTranslation{
		Unit{},
		Reason{},
		Store{},
		StockLine{},
		// Invoice{}, InvoiceLine{} added below as they are implemented.
	}
}
