package translations

import (
	"testing"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctest"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// Mirrors the #[cfg(test)] test in translations/reason.rs.
func TestReasonTranslation(t *testing.T) {
	tr := Reason{}

	for _, rec := range synctest.ReasonPullUpsert() {
		if !synctypes.ShouldTranslateFrom(tr, &rec.Buffer) {
			t.Fatalf("reason translator should match record %s", rec.Buffer.RecordID)
		}
		got, err := tr.TryTranslateFromUpsert(nil, db.SQLite, &rec.Buffer)
		if err != nil {
			t.Fatalf("translate upsert %s: %v", rec.Buffer.RecordID, err)
		}
		synctest.AssertPullEqual(t, got, rec.Expected)
	}
}
