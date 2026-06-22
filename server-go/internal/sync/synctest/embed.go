package synctest

import "embed"

// testdataFS holds raw sync JSON fixtures copied verbatim from
// server/service/src/sync/test/test_data/*.rs. Embedding (rather than inlining as Go string
// literals) keeps them byte-for-byte identical and sidesteps Go raw-string escaping — some
// fixtures contain backticks (e.g. store tags "...weirdchars`$").
//
//go:embed testdata
var testdataFS embed.FS

// LoadJSON returns the verbatim fixture at testdata/<rel> (e.g. "store/store_1.json").
func LoadJSON(rel string) string {
	b, err := testdataFS.ReadFile("testdata/" + rel)
	if err != nil {
		panic("synctest: missing fixture " + rel + ": " + err.Error())
	}
	return string(b)
}
