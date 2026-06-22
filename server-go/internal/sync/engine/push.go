package engine

import (
	"fmt"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// TranslateChangelogsToSyncRecords turns changelog rows into outgoing sync records. For each
// changelog row, every translator that should translate it (for any of the requested types)
// is dispatched by row action to its translate-to-upsert/delete method. Mirrors
// translate_changelogs_to_sync_records / translate_changelog (translations/mod.rs).
func TranslateChangelogsToSyncRecords(
	exec synctypes.Exec,
	d db.Dialect,
	translators []synctypes.SyncTranslation,
	changelogs []synctypes.ChangelogRow,
	types []synctypes.ToSyncRecordTranslationType,
) ([]synctypes.PushSyncRecord, error) {
	var out []synctypes.PushSyncRecord
	for i := range changelogs {
		cl := &changelogs[i]
		for _, t := range translators {
			if !anyType(t, cl, types) {
				continue
			}
			var res synctypes.PushTranslateResult
			var err error
			switch cl.RowAction {
			case synctypes.RowActionUpsert:
				res, err = t.TryTranslateToUpsert(exec, d, cl)
			case synctypes.RowActionDelete:
				res, err = t.TryTranslateToDelete(exec, d, cl)
			}
			if err != nil {
				return nil, fmt.Errorf("push translate %s/%s: %w", cl.TableName, cl.RecordID, err)
			}
			switch res.Kind {
			case synctypes.PushRecords:
				out = append(out, res.Records...)
			case synctypes.PushIgnored, synctypes.PushNotMatched:
				// ignored is logged in Rust; not matched is silent
			}
		}
	}
	return out, nil
}

func anyType(t synctypes.SyncTranslation, cl *synctypes.ChangelogRow, types []synctypes.ToSyncRecordTranslationType) bool {
	for _, ty := range types {
		if synctypes.ShouldTranslateTo(t, cl, ty) {
			return true
		}
	}
	return false
}
