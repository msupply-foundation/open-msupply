package synctypes

import "encoding/json"

// IntegrationOperation mirrors the Rust enum IntegrationOperation { Upsert | Delete }. Go has
// no sum types, so exactly one of Upsert/Delete is non-nil.
type IntegrationOperation struct {
	Upsert Upsert
	Delete Delete
}

// UpsertOp / DeleteOp mirror IntegrationOperation::upsert / ::delete.
func UpsertOp(u Upsert) IntegrationOperation { return IntegrationOperation{Upsert: u} }
func DeleteOp(d Delete) IntegrationOperation { return IntegrationOperation{Delete: d} }

// PullResultKind discriminates the three-state pull outcome. NotMatched (translator doesn't
// handle this table) is silent; Ignored is recorded as a non-fatal error; Operations carries
// the integration ops. The distinction is load-bearing in the engine.
type PullResultKind int

const (
	PullNotMatched PullResultKind = iota
	PullIgnored
	PullOperations
)

// PullTranslateResult mirrors translations::PullTranslateResult.
type PullTranslateResult struct {
	Kind          PullResultKind
	Operations    []IntegrationOperation
	IgnoreMessage string
}

// PullUpsert / PullDelete / PullUpserts / PullIgnoredMsg / NotMatched mirror the Rust
// PullTranslateResult constructors.
func PullUpsert(u Upsert) PullTranslateResult {
	return PullTranslateResult{Kind: PullOperations, Operations: []IntegrationOperation{UpsertOp(u)}}
}

func PullDelete(d Delete) PullTranslateResult {
	return PullTranslateResult{Kind: PullOperations, Operations: []IntegrationOperation{DeleteOp(d)}}
}

func PullOps(ops ...IntegrationOperation) PullTranslateResult {
	return PullTranslateResult{Kind: PullOperations, Operations: ops}
}

func PullIgnoredMsg(msg string) PullTranslateResult {
	return PullTranslateResult{Kind: PullIgnored, IgnoreMessage: msg}
}

func NotMatched() PullTranslateResult {
	return PullTranslateResult{Kind: PullNotMatched}
}

// CommonSyncRecord mirrors the transport CommonSyncRecord (camelCase on the wire). RecordData
// is the serialized legacy/V6 JSON; empty for deletes.
type CommonSyncRecord struct {
	TableName  string          `json:"tableName"`
	RecordID   string          `json:"recordId"`
	Action     TransportAction `json:"action"`
	RecordData json.RawMessage `json:"recordData"`
}

// PushSyncRecord mirrors translations::PushSyncRecord.
type PushSyncRecord struct {
	Cursor int64
	Record CommonSyncRecord
}

// PushResultKind discriminates the push outcome, like PullResultKind.
type PushResultKind int

const (
	PushNotMatched PushResultKind = iota
	PushIgnored
	PushRecords
)

// PushTranslateResult mirrors translations::PushTranslateResult.
type PushTranslateResult struct {
	Kind          PushResultKind
	Records       []PushSyncRecord
	IgnoreMessage string
}

// PushUpsert mirrors PushTranslateResult::upsert: a single Update record carrying the
// serialized row, keyed by the changelog cursor/record id.
func PushUpsert(cl *ChangelogRow, tableName string, recordData json.RawMessage) PushTranslateResult {
	return PushTranslateResult{Kind: PushRecords, Records: []PushSyncRecord{{
		Cursor: cl.Cursor,
		Record: CommonSyncRecord{
			TableName:  tableName,
			RecordID:   cl.RecordID,
			Action:     TransportUpdate,
			RecordData: recordData,
		},
	}}}
}

// PushDelete mirrors PushTranslateResult::delete.
func PushDelete(cl *ChangelogRow, tableName string) PushTranslateResult {
	return PushTranslateResult{Kind: PushRecords, Records: []PushSyncRecord{{
		Cursor: cl.Cursor,
		Record: CommonSyncRecord{
			TableName: tableName,
			RecordID:  cl.RecordID,
			Action:    TransportDelete,
		},
	}}}
}

func PushIgnoredMsg(msg string) PushTranslateResult {
	return PushTranslateResult{Kind: PushIgnored, IgnoreMessage: msg}
}

func PushNotMatchedResult() PushTranslateResult {
	return PushTranslateResult{Kind: PushNotMatched}
}
