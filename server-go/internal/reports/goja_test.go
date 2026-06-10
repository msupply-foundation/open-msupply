package reports

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func readTestdata(t *testing.T, name string) []byte {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("testdata", name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return b
}

type encountersOut struct {
	Data struct {
		Encounters struct {
			Nodes []struct {
				ID       string `json:"id"`
				DaysLate int    `json:"daysLate"`
				Status   string `json:"status"`
			} `json:"nodes"`
		} `json:"encounters"`
	} `json:"data"`
}

// goja (pure-Go, no CGO) runs the REAL webpack-built encounters convert_data bundle.
func TestGoja_RunsRealConvertData(t *testing.T) {
	bundle := readTestdata(t, "encounters_convert_data.var.js")
	input := readTestdata(t, "encounters_input.json")

	out, err := RunConvertGoja(bundle, "reportBundle", "convert_data", input)
	if err != nil {
		t.Fatalf("goja run: %v", err)
	}
	t.Logf("goja output: %s", out)

	var got encountersOut
	if err := json.Unmarshal(out, &got); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(got.Data.Encounters.Nodes) != 2 {
		t.Fatalf("want 2 nodes, got %d", len(got.Data.Encounters.Nodes))
	}
	// e1 is years in the past -> very late -> LTFU; e2 is in the far future -> not late.
	byID := map[string]struct {
		DaysLate int
		Status   string
	}{}
	for _, n := range got.Data.Encounters.Nodes {
		byID[n.ID] = struct {
			DaysLate int
			Status   string
		}{n.DaysLate, n.Status}
	}
	if byID["e1"].Status != "LTFU" || byID["e1"].DaysLate <= 7 {
		t.Errorf("e1 = %+v, want LTFU with daysLate>7", byID["e1"])
	}
	if byID["e2"].Status != "" || byID["e2"].DaysLate != 0 {
		t.Errorf("e2 = %+v, want daysLate=0 status=''", byID["e2"])
	}
	t.Logf("goja ran the real report bundle correctly (no CGO) ✓")
}
