package translations

import (
	"testing"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctest"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// Mirrors the #[cfg(test)] test in translations/unit.rs: loop fixtures, assert the translator
// matches and produces the expected operation. Unit needs no DB connection to translate.
func TestUnitTranslation(t *testing.T) {
	tr := Unit{}

	for _, rec := range synctest.UnitPullUpsert() {
		if !synctypes.ShouldTranslateFrom(tr, &rec.Buffer) {
			t.Fatalf("unit translator should match record %s", rec.Buffer.RecordID)
		}
		got, err := tr.TryTranslateFromUpsert(nil, db.SQLite, &rec.Buffer)
		if err != nil {
			t.Fatalf("translate upsert %s: %v", rec.Buffer.RecordID, err)
		}
		synctest.AssertPullEqual(t, got, rec.Expected)
	}

	for _, rec := range synctest.UnitPullDelete() {
		if !synctypes.ShouldTranslateFrom(tr, &rec.Buffer) {
			t.Fatalf("unit translator should match delete %s", rec.Buffer.RecordID)
		}
		got, err := tr.TryTranslateFromDelete(nil, db.SQLite, &rec.Buffer)
		if err != nil {
			t.Fatalf("translate delete %s: %v", rec.Buffer.RecordID, err)
		}
		synctest.AssertPullEqual(t, got, rec.Expected)
	}
}
