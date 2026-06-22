package synctest

// Aggregators across all slice entities, mirroring the get_all_* helpers in
// server/service/src/sync/test/test_data/mod.rs. Append new entities here as they are ported.

func AllPullUpsert() []IncomingRecord {
	var out []IncomingRecord
	out = append(out, UnitPullUpsert()...)
	out = append(out, ReasonPullUpsert()...)
	out = append(out, StorePullUpsert()...)
	out = append(out, StockLinePullUpsert()...)
	return out
}

func AllPullDelete() []IncomingRecord {
	var out []IncomingRecord
	out = append(out, UnitPullDelete()...)
	return out
}

// AllPushLegacy / AllPushV6 are the expected outgoing records (legacy mSupply / OMS V6). Empty
// until tracked entities (stock_line, invoice, invoice_line) are ported.
func AllPushLegacy() []OutgoingRecord { return nil }
func AllPushV6() []OutgoingRecord     { return nil }
