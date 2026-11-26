# Pashto (`ps`) translation guide

Read by the `translate` skill before drafting Pashto.

**No team glossary exists for Pashto yet.** Everything below is taken from the existing catalog
(`frontend/src/intl/locales/ps/common.json`, paired with `en/common.json` by key: 4,201 shared
keys). The counts are string counts. When a Pashto-speaking reviewer settles a term, record it
here and say who decided and when.

## House style taken from the catalog

- **Formal address (تاسو) throughout.** 131 strings use _تاسو_ and 25 use _ستاسو_. 31 use _یاست_,
  33 use _غواړئ_. No string uses the informal _ستا_, _غواړې_ or _شې_. Requests are phrased
  _مهرباني وکړئ …_ (50 strings).
- **Buttons use the formal imperative in ـئ**: _… کړئ_, _… وګورئ_, _… لاړ شئ_. 121 of 204
  `button.` strings contain one, and 120 end in one. Other buttons:
  - 11 use a verbal noun (_واردول_, _صادرول_, _ړنګول_);
  - most of the rest are bare nouns (_نوی_, _توضیحات_).
  - 15 strings use the informal imperative _کړه_ or _شه_. See the open questions.
- **No Pashto-script abbreviations.** No string shortens a Pashto word with a dot. English
  shortenings are written out: _Qty_ is _مقدار_ or _اندازه_ (8 of 8). In a tight label,
  shorten by dropping words, not by abbreviating.
- **English acronyms and file formats stay in Latin script**: _AMC_ (26 tokens), _ID_ (34), _PO_
  (22), _MOS_ (17), _SOH_ (6), _CSV_ (6), _PDF_, _JSON_, _URL_, _API_. Product names do too
  (_mSupply_). 307 strings contain Latin-script text. _Excel_ is split: 2 Latin, 2 _اکسل_.
  Prefer Latin, like the other file formats.
- **Loanwords in Pashto script** where the catalog has settled them: _فایل_, _فلټر_, _ډاونلوډ_,
  _ریکارډ_, _کالم_, _سرور_, _ټب_.
- **Numbers stay in Latin digits.** Only 11 strings use Arabic-Indic digits.
- **Plurals:** a noun after a number takes its plural form (_{{count}} ورځې_, _{{count}}
  قطارونه_). `_one` takes the singular.

## Glossary

The majority rendering is the one to use. A split shows the minority count.

| English             | Pashto                                                      | Catalog evidence                                                                                       |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| import              | واردول (noun/button), وارد کړئ (imperative), وارد شو (done) | 38 of 38 import strings use _وارد_. 19 _واردول_, 5 _واردات_                                            |
| export              | صادرول, صادر کړئ                                            | 9 of 10 use _صادر_                                                                                     |
| upload              | پورته کول, پورته کړئ                                        | _پورته_ 22, _اپلوډ_ 14                                                                                 |
| download            | ډاونلوډ, ډاونلوډ کړئ                                        | 14 of 14                                                                                               |
| file                | فایل                                                        | _فایل_ 27, _دوتنه/دوتنې_ 8                                                                             |
| row (spreadsheet)   | قطار, pl. قطارونه                                           | _قطار_ 24 of 27. _کرښه_ 3 (approval lists), _لیکه_ 4. A shipment _line_ is _کرښه/لاین_: different word |
| column              | کالم                                                        | 13 of 13                                                                                               |
| sheet (worksheet)   | پاڼه, pl. پاڼې                                              | 2 of 2 (_stocktake sheet_)                                                                             |
| table               | جدول, pl. جدولونه                                           | _جدول_ 4, _میز_ 2. _میز_ is a desk                                                                     |
| record              | ریکارډ, pl. ریکارډونه                                       | 48 of 68. _ثبت_ 4, the verb _record_                                                                   |
| unit                | واحد, pl. واحدونه                                           | 48 of 57; `label.units` = _واحدونه_                                                                    |
| item                | توکی / توکي (obl. توکو)                                     | 242 of 245; `label.item` = _توکي_                                                                      |
| location type       | د ځای ډول, pl. د ځای ډولونه                                 | 2 of 2. _location_ is _ځای_ 59, _موقعیت_ 5                                                             |
| user                | کارن, pl. کارنان                                            | _کارن_ 8, _کارونکي/کاروونکي_ 4; `label.users` = _کارنان_                                               |
| preview             | مخکتنه                                                      | 1 of 1 (`label.colour-preview`)                                                                        |
| change (noun)       | بدلون, pl. بدلونونه. Verb: بدلول / بدلیږي                   | _بدل_ 55 of 56; `label.change` = _بدلون_                                                               |
| new                 | نوی (m.sg.), نوې (f.), نوي (pl.)                            | 105 of 112                                                                                             |
| updated             | تازه شوی, pl. تازه شوي                                      | _تازه_ 54 of 54                                                                                        |
| deleted (status)    | ړنګ شوی, pl. ړنګ شوي                                        | _ړنګ_ 63, _حذف_ 37 among _deleted_ strings                                                             |
| delete (imperative) | حذف کړئ                                                     | _حذف کړئ_ 16, _ړنګ کړئ_ 4. See the open questions                                                      |
| unchanged           | بې بدلونه                                                   | 1 each: _بې بدلونه_ (`label.form-outcome-unchanged`), _بې بدله_ (`label.leave-unchanged`)              |
| error               | تېروتنه, pl. تېروتنې                                        | 48 of 61. _خطا_ 7, _غلطي_ 2                                                                            |
| problem             | ستونزه, pl. ستونزې                                          | 6 of 6                                                                                                 |
| filter              | فلټر, pl. فلټرونه                                           | 25 of 27. _فلتر_ 1                                                                                     |
| clear (filters)     | پاک کړئ                                                     | _پاک_ 8, _روښانه_ 5. _روښانه_ means bright                                                             |
| search              | لټون                                                        | 29 of 32                                                                                               |
| status              | حالت                                                        | _حالت_ 66, _وضعیت_ 25                                                                                  |
| total               | ټول. Sums are مجموعه                                        | _ټول_ 41, _مجموعه_ 9 (sums)                                                                            |
| X of Y              | {{x}} د {{y}} څخه                                           | 3 of 4 (`label.doses-given-of`, `pagination.range`, `sync.status.progress`)                            |
| choose              | غوره کړئ                                                    | 19 of 20. _select_ is also mostly _غوره_ (40), else _وټاکئ_                                            |
| confirm             | تایید کړئ                                                   | 32 of 32 use _تایید_                                                                                   |
| edit                | ترمیم کړئ                                                   | _ترمیم_ 32, _ایډیټ_ 14, _سمون_ 10                                                                      |
| sync                | همغږي                                                       | 58 of 72. _ترکیب_ 12, a mistranslation                                                                 |
| unable to …         | د … توان نلري                                               | 53 of 100 _unable/couldn't_ strings                                                                    |
| tab                 | ټب                                                          | 4 of 4                                                                                                 |
| nothing             | هیڅ شی                                                      | 9 of 13                                                                                                |

### Terms settled in the 2026-11-26 backlog drafts

Settled by the drafts, not yet by a Pashto reviewer.

| English                       | Pashto                | Notes                                                        |
| ----------------------------- | --------------------- | ------------------------------------------------------------ |
| dispensing record             | د توزیع ریکارډ        | _نسخه_ is kept for a prescription; see open questions        |
| dispense (button) / dispensed | توزیع کړئ / توزیع شوی |                                                              |
| unnamed patient               | بې نومه ناروغ         |                                                              |
| visit                         | لیدنه                 |                                                              |
| medicine / common medicines   | درمل / عام درمل       |                                                              |
| stock                         | ذخیره                 | catalog 124 vs _سټاک_ 113                                    |
| store                         | پلورنځی               | 76 of 83                                                     |
| delivery lead time            | د سپارنې موده         | `label.lead-time` _د میاشتې مخکښ وخت_ is a calque            |
| tag                           | ټګ                    | from `label.tag-colour`                                      |
| short (a stock deficit)       | کم                    | not _لنډ_ (short in length)                                  |
| couldn't be loaded            | بار نه شو             |                                                              |
| press / click a named button  | په 'X' کلیک وکړئ      | straight single quotes, as the catalog does (25 vs 0 for «») |

## Right-to-left notes

- **Arrows point the reading direction.** The one catalog string that translates `→`
  (`messages.custom-translations-import-multi-language`) uses `←`. Use `←` for "from → to".
- **Punctuation is Arabic-script**:
  - _،_ in 154 strings; no Latin comma;
  - _؟_ in 83 strings; one Latin `?`;
  - _؛_ in 2 strings; no Latin semicolon.
    The colon stays `:`.
- **Ellipsis** is split: `…` 28, `...` 17. Prefer `…`, as the English does.
- `·` (4 strings) and `—` (10 strings) are kept as in the English.
- Directions in a spreadsheet: the exported workbook is left-to-right, so "to the right of the
  data" stays _ښي لور ته_. If Excel shows the sheet right-to-left, that is the left.

## Open questions

- **Register of short confirm buttons.** 15 strings use the informal imperative:
  - _تایید کړه_: `button.confirm`, `button.confirm-barcode`, `report.confirm-date`;
  - _لاړ شه_: `button.go-to-home`, `reorder.move-up`;
  - _پاتې شه_: `button.stay`.
    The rest of the catalog is formal (_کړئ_).
- **Delete.** _ړنګ_ and _حذف_ are each used in 78 _delete_ strings. Statuses lean _ړنګ شوی_ (63
  to 37), so the drafts use it. Imperatives lean _حذف کړئ_ (16 to 4), so the drafts use that.
  A reviewer may want one verb for both.
- **Upload.** _پورته کول_ (22) vs _اپلوډ_ (14): e.g. `error.upload-too-large`,
  `button.upload-help-document`.
- **File.** _فایل_ (27) vs _دوتنه_ (8): e.g. `label.file-name`, `label.file-size`,
  `error.duplicated-field`.
- **Table.** _میز_ (desk) in `label.reset-table-defaults` and `table.view-table`, against
  _جدول_ elsewhere.
- **Status.** _حالت_ (66) vs _وضعیت_ (25): e.g. `button.add-status-entry`,
  `label.status-change`.
- **Unchanged.** _بې بدلونه_ vs _بې بدله_, one string each.
- **Excel.** Latin (`error.failed-to-generate-excel`) vs _اکسل_ (`button.export-excel`).
- **Dispensing record.** _نسخه_ (17, e.g. `button.view-prescription`,
  `messages.deleted-prescriptions_other`) vs _د توزیع ریکارډ_ (5, `button.new-dispensing-record`,
  `messages.confirm-delete-dispensing-records_other`). _نسخه_ is also the prescription in the
  prescription-request screens, so the 2026-11-26 drafts use _د توزیع ریکارډ_.
- **Batch** is split three ways: _بیچ_ 22, _بسته_ 17, _بست_ 16 (plus _ډله_ in
  `label.batch-count_one`).
- **Import and export as a screen name.** _واردات او صادرات_ reads as trade in goods.
  Supply-chain users may read it as customs, so the drafts use the verbal nouns _واردول او
  صادرول_.
