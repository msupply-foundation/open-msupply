package synctypes

import "github.com/msupply-foundation/open-msupply/server-go/internal/db"

// ToSyncRecordTranslationType mirrors translations::ToSyncRecordTranslationType: which
// direction/peer a push translation is for.
type ToSyncRecordTranslationType int

const (
	// PushToLegacyCentral: omSupply remote pushing to legacy mSupply central.
	PushToLegacyCentral ToSyncRecordTranslationType = iota
	// PushToOmSupplyCentral: omSupply remote pushing to omSupply central.
	PushToOmSupplyCentral
	// PullFromOmSupplyCentral: omSupply central preparing records for a remote's pull.
	PullFromOmSupplyCentral
)

// SyncTranslation mirrors the Rust SyncTranslation trait. The two "should translate"
// predicates are NOT part of this interface: they have table-name/changelog-type defaults
// (see ShouldTranslateFrom / ShouldTranslateTo) that a translator overrides by implementing
// the optional ShouldTranslateFromOverride / ShouldTranslateToOverride interfaces. Embedding
// BaseTranslation supplies no-op defaults for everything except TableNames.
type SyncTranslation interface {
	// PullDependencies lists legacy table names that must be integrated before this one.
	PullDependencies() []string
	// TableNames are the legacy sync table name(s) this translator matches on.
	TableNames() []string

	// Pull (integrate records received from central).
	TryTranslateFromUpsert(tx Exec, d db.Dialect, row *SyncBufferRow) (PullTranslateResult, error)
	TryTranslateFromDelete(tx Exec, d db.Dialect, row *SyncBufferRow) (PullTranslateResult, error)
	TryTranslateFromMerge(tx Exec, d db.Dialect, row *SyncBufferRow) (PullTranslateResult, error)

	// ChangelogType returns the changelog table this entity is tracked under, if any
	// (ok == false is the Rust None). Drives the default ShouldTranslateTo.
	ChangelogType() (ChangelogTableName, bool)

	// Push (translate a changelog row to an outgoing sync record).
	TryTranslateToUpsert(tx Exec, d db.Dialect, cl *ChangelogRow) (PushTranslateResult, error)
	TryTranslateToDelete(tx Exec, d db.Dialect, cl *ChangelogRow) (PushTranslateResult, error)
}

// ShouldTranslateFromOverride is the optional interface a translator implements when matching
// on something other than its table names.
type ShouldTranslateFromOverride interface {
	ShouldTranslateFromSyncRecord(row *SyncBufferRow) bool
}

// ShouldTranslateToOverride is the optional interface a translator implements to control push
// matching (e.g. V6 entities answering PullFromOmSupplyCentral / PushToOmSupplyCentral).
type ShouldTranslateToOverride interface {
	ShouldTranslateToSyncRecord(cl *ChangelogRow, t ToSyncRecordTranslationType) bool
}

// ShouldTranslateFrom is the engine-side predicate. Mirrors the Rust default
// should_translate_from_sync_record (match by table name), honouring an override if present.
func ShouldTranslateFrom(t SyncTranslation, row *SyncBufferRow) bool {
	if o, ok := t.(ShouldTranslateFromOverride); ok {
		return o.ShouldTranslateFromSyncRecord(row)
	}
	for _, name := range t.TableNames() {
		if name == row.TableName {
			return true
		}
	}
	return false
}

// ShouldTranslateTo mirrors the Rust default should_translate_to_sync_record (mod.rs:468):
// for PushToLegacyCentral, match when the entity's changelog type equals the changelog row's
// table; the two omSupply-central variants default to false unless overridden.
func ShouldTranslateTo(t SyncTranslation, cl *ChangelogRow, typ ToSyncRecordTranslationType) bool {
	if o, ok := t.(ShouldTranslateToOverride); ok {
		return o.ShouldTranslateToSyncRecord(cl, typ)
	}
	switch typ {
	case PushToLegacyCentral:
		ct, ok := t.ChangelogType()
		return ok && ct == cl.TableName
	default:
		return false
	}
}

// BaseTranslation provides no-op defaults so concrete translators override only what they
// need (mirrors the Rust trait's default methods). It deliberately does NOT implement
// TableNames — every translator must declare its table(s).
type BaseTranslation struct{}

func (BaseTranslation) PullDependencies() []string { return nil }

func (BaseTranslation) ChangelogType() (ChangelogTableName, bool) { return "", false }

func (BaseTranslation) TryTranslateFromUpsert(Exec, db.Dialect, *SyncBufferRow) (PullTranslateResult, error) {
	return NotMatched(), nil
}

func (BaseTranslation) TryTranslateFromDelete(Exec, db.Dialect, *SyncBufferRow) (PullTranslateResult, error) {
	return NotMatched(), nil
}

func (BaseTranslation) TryTranslateFromMerge(Exec, db.Dialect, *SyncBufferRow) (PullTranslateResult, error) {
	return NotMatched(), nil
}

func (BaseTranslation) TryTranslateToUpsert(Exec, db.Dialect, *ChangelogRow) (PushTranslateResult, error) {
	return PushNotMatchedResult(), nil
}

func (BaseTranslation) TryTranslateToDelete(Exec, db.Dialect, *ChangelogRow) (PushTranslateResult, error) {
	return PushNotMatchedResult(), nil
}
