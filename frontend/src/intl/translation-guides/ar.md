# Arabic (`ar`) translation guide

Read by the `translate` skill before drafting Arabic.

**No team glossary exists yet for Arabic.** Every rule and term below was taken by counting
the current catalog (`frontend/src/intl/locales/ar/common.json`, paired with
`locales/en/common.json` by key: 1,948 shared string keys) on 2026-11-17, not from a reviewer.
Counts are of keys, so a plural set counts once per form. When an Arabic-speaking reviewer
settles a term, record it here; their decision beats the counts.

## House style taken from the catalog

- **Address is the generic masculine singular**, the usual Arabic UI convention: 16 strings
  use _أنت_ (_هل أنت متأكد؟_) and 34 use second-person singular forms (_لديك_, _يمكنك_,
  _تريد_, _قمت_). No string uses the plural/formal _أنتم_, _لديكم_ (0) or feminine forms
  (_أنتِ_, _لديكِ_: 0).
- **Requests:** where the English says "please", use _يرجى_ + verbal noun (_يرجى إدخال…_): 25
  strings, against _الرجاء_ 2 and _من فضلك_ 0. Where the English sentence is a bare
  imperative ("Try again", "Check your connection"), the catalog uses a masculine-singular
  imperative (52 strings: _اختر_, _حاول_, _راجع_, _تحقق_, _انقر_, _قلل_).
- **Buttons use the verbal noun (masdar)**: 69 of 95 `button.` strings (_حفظ_, _إلغاء_,
  _تصدير_, _استيراد_, _إنشاء_, _عرض_, _مسح_ in `common.clear`). Only 8 use an imperative
  (_أضف منتج_, _افتح القائمة_, _حاول مرة أخرى_); the rest are nouns or adjectives (_التالي_,
  _مريض جديد_). _قم بـ…_ appears in 4 strings, none of them buttons; avoid it.
- **Column headers and short labels take the definite article**: _الحالة_, _الاسم_, _الرمز_,
  _الإجمالي_, _الوحدات_, _المستخدمون_.
- **Error openings:**
  - "Couldn't / Could not" → _تعذر_ (11 of 11).
  - "Unable to" → _تعذر_ 26, _غير قادر على_ 14, _لا يمكن_ 2. Use _تعذر_.
  - "Failed to" → _فشل_ (20 of 20).
  - "Cannot / can't" → _لا يمكن_ (39 of 40).
  - Spelling: _تعذر_ without shadda 40, _تعذّر_ 5. Use _تعذر_.
- **Progress text:** _جارٍ…_ 14, _جاري…_ 2.
- **Full stops:** of 113 `messages.`/`error.` strings whose English ends with ".", 101 end with
  "." in Arabic. Keep the full stop where the English has one.
- **Digits:** Western digits (45 strings); Arabic-Indic digits never (0).
- **Plurals:** the catalog has 61 plural sets, each with all six keys (`_zero`, `_one`, `_two`,
  `_few`, `_many`, `_other`). Most copy one form into all six. The grammatical model is
  `error.failed-attempts`; follow it for new strings:
  - `_zero`: _لا_ + noun, no number (_لا محاولات فاشلة_), or keep `{{count}}` + singular
    where a negative reads wrong (a button, an always-shown chip);
  - `_one`: singular noun + _واحد/واحدة_, no number (_محاولة فاشلة واحدة_);
  - `_two`: dual, no number (_محاولتان فاشلتان_);
  - `_few` (3–10): `{{count}}` + plural (_{{ count }} محاولات فاشلة_);
  - `_many` (11–99): `{{count}}` + singular in the accusative (_جدولًا_);
  - `_other` (100+): `{{count}}` + singular (_{{ count }} محاولة فاشلة_).

## Abbreviations

The catalog writes English abbreviations out in full in Arabic; it has no Arabic-script
abbreviation (nothing like _Qté_ or _Réf._). Keep short labels short by choosing a short word,
not by abbreviating.

- AMC → _معدل الاستهلاك الشهري_ (`label.amc`); SOH → _المخزون المتوفر_ (`label.soh`);
  CCE → _تجهيزات / معدات سلسلة التبريد_ (7 of 7); MOS → _أشهر المخزون_; ID → _معرّف_.
- Latin acronyms the catalog keeps as they are: URL (6 strings), CSV (2), API (2), AMC (2, only
  inside formulas), QR (1), IP (1). Product and format names stay in Latin script: _Excel_,
  _CSV_.

## Glossary

The majority rendering is the one to use. "n of N" counts Arabic strings containing the
rendering among the English strings containing the term.

| English                 | Arabic                | Evidence    | Notes                                                                                             |
| ----------------------- | --------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| import                  | استيراد               | 20 of 21    | `messages.import-error-on-upload` has _تحميل_ for "upload", not "import"                          |
| export                  | تصدير                 | 2 of 2      | the Export tab is `button.export` _تصدير_                                                         |
| upload                  | تحميل                 | 10 of 10    | see open questions: _تحميل_ also means "download"                                                 |
| download                | تنزيل                 | 7 of 8      | `button.download` = _تحميل_ is the minority                                                       |
| file                    | ملف                   | 10 of 10    |                                                                                                   |
| row                     | صف (pl. صفوف)         | 15 of 16    | _سطر_ once (`stocktake.line-edit.save-errors`)                                                    |
| line (document line)    | سطر (pl. أسطر)        | 68 of 104   | _خط_ in 40 strings; see likely errors                                                             |
| column                  | عمود                  | 5 of 5      |                                                                                                   |
| sheet (Excel)           | ورقة                  | 1 of 2      | _قائمة_ once (`report.stocktake-sheet`, a stocktake list); Excel's own Arabic UI also says _ورقة_ |
| workbook (Excel)        | مصنف Excel            | no evidence | Excel's own Arabic term                                                                           |
| table                   | جدول                  | 1 of 1      |                                                                                                   |
| record                  | سجل                   | 11 of 23    | the other 11 are "dispensing record" = _وصفة_, a different sense                                  |
| unit                    | وحدة                  | 15 of 22    | the other 7 are "units" = quantity, rendered _الكمية_                                             |
| item                    | عنصر                  | 73 of 95    | _صنف_ 16 (incl. `nav.catalogue.items` _الأصناف_), _منتج_ 2                                        |
| location type           | نوع التخزين البارد    | 2 of 2      | literally "cold-storage type"; see open questions                                                 |
| user                    | مستخدم                | 10 of 10    |                                                                                                   |
| preview                 | معاينة                | no evidence | no English string uses "preview" yet                                                              |
| change (noun)           | تغيير (pl. تغييرات)   | 21 of 22    | _تعديل_ 2                                                                                         |
| new                     | جديد                  | 48 of 55    | "New X" buttons use _إضافة X_ 5 times                                                             |
| updated                 | تم التحديث / تحديث    | 7 of 7      |                                                                                                   |
| deleted                 | تم الحذف / حذف        | 44 of 44    | status badges: _تم الحذف_                                                                         |
| unchanged               | دون تغيير             | no evidence |                                                                                                   |
| error                   | خطأ (pl. أخطاء)       | 36 of 39    |                                                                                                   |
| problem                 | مشكلة                 | 5 of 5      | plural: no evidence; MSA _مشكلات_                                                                 |
| filter                  | تصفية (عوامل التصفية) | 8 of 16     | _فلتر_ 4, _مرشح_ 2; see open questions                                                            |
| search                  | بحث                   | 20 of 20    |                                                                                                   |
| status                  | حالة                  | 43 of 45    |                                                                                                   |
| total                   | إجمالي                | 16 of 26    | _مجموع_ 8, _كلي_ 2                                                                                |
| server                  | خادم                  | 35 of 35    |                                                                                                   |
| sync                    | مزامنة                | 21 of 23    |                                                                                                   |
| contains (filter label) | يحتوي على             | 4 of 4      | _الرمز أو الاسم يحتوي على_                                                                        |
| choose / select         | اختر / اختيار         | 17 of 29    | _حدد / تحديد_ 12                                                                                  |
| confirm                 | تأكيد / أكّد          | 14 of 15    |                                                                                                   |
| clear                   | مسح                   | 4 of 4      |                                                                                                   |
| common medicines | الأدوية الشائعة |  | settled 2026-11-26 (Simple screen common medicines editor) |

## Right-to-left notes

- **Comma:** _،_ (28 strings). A Latin comma beside Arabic text appears twice
  (`label.age-months-and_*`), which is likely an error.
- **Question mark:** _؟_ (28); Latin `?` once, inside XML sample code.
- **Semicolon:** the catalog has none (_؛_ 0, `;` 0). Use the Arabic _؛_.
- **Arrows:** none in the catalog yet. A "from → to" arrow points the reading direction in
  Arabic: _←_. When both values are Latin text, the browser lays that run out left to right and
  the arrow reads backwards; the code should isolate each value (`<bdi>` or FSI/PDI).
- **Parentheses and dots at a string's end next to Latin text** (_Excel (.xlsx)_) get
  reordered by the bidi algorithm. Prefer wording that doesn't end on Latin punctuation.
- **Ellipsis:** _…_ 21, `...` 10. Use _…_.
- **Quotation marks:** _”…“_ 16, straight `"…"` 10, _«»_ 0. Use _”…“_ around UI names.
- **Dash:** spaced _—_ (5 strings).
- **Tokens:** keep `{{token}}` spacing as in the English: the catalog has 31 strings with
  `{{ x }}` and the rest with `{{x}}`.

## Open questions for reviewers

- **upload vs download.** "Upload" is _تحميل_ (10 of 10), but _تحميل_ is also the common
  Arabic word for "download", and `button.download` uses it. "Download" is otherwise _تنزيل_ (7
  of 8). Screens that show both (central data) depend on _تنزيل_ = download, _تحميل_ = upload.
  _رفع_ is the unambiguous alternative for upload (0 uses).
- **filter:** _عوامل التصفية_ (`filter.filters`) vs _الفلاتر_ (`label.filters`), _مسح الفلتر_
  (`label.clear-filter`), _مرشح_ (`messages.how-to-read-item-usage`,
  `stocktake.create.filtered-hint`).
- **item:** _عنصر_ (73) vs _صنف_ (16; `nav.catalogue.items` _الأصناف_) vs _منتج_
  (`button.add-item`, `button.new-catalogue-item`). _صنف_ is the usual pharmacy-stock word;
  the catalog majority is _عنصر_.
- **location type:** `label.location-type(s)` = _نوع / أنواع التخزين البارد_ ("cold-storage
  type"). Locations aren't only cold storage; _نوع الموقع_ would be literal.
- **total:** _إجمالي_ (16) vs _مجموع_ (8: `heading.total`, `label.line-total`).
- **"Unable to":** _تعذر_ (26) vs _غير قادر على_ (14: `error.unable-to-scan-barcode`,
  `error.encounter-not-created`).
- **choose/select:** _اختر / اختيار_ (17) vs _حدد / تحديد_ (12).

## Likely errors in existing translations

Found while counting. The skill doesn't fix these.

- _خط / خطوط_ ("drawn line") for a document line, e.g. `button.allocate-lines` _تعيين خطوط
  العنصر النائب_; the majority is _سطر / أسطر_.
- `button.download` = _تحميل_ while every other download string says _تنزيل_.
- `button.ok` = _نعم_ ("Yes").
- `error.failed-to-generate-excel` = _فشل في إنشاء برنامج Excel_ ("failed to create the Excel
  program"); the file, not the program, is generated.
- `label.age-months-and_*` use a Latin comma: _{{count}} شهر, _.
- Most plural sets copy one form into all six keys, e.g. `label.age-days_two` _{{count}}
  أيام_ (should be _يومان_), `label.items-selected_many` _{{count}} عناصر مختارة_.
