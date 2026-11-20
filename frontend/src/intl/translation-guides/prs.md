# Dari (`prs`) translation guide

Read by the `translate` skill before drafting Dari (Afghan Persian).

**There is no team glossary for Dari yet.** Everything below is taken from the catalog
(`frontend/src/intl/locales/prs/common.json`, 4,261 keys, paired with `en` by key: 4,201 shared
string keys), counted with a script, not from general knowledge. When a Dari-speaking reviewer
or PM settles a term, record it here and mark it as settled; until then the catalog majority
wins. Where Dari and Iranian Persian differ, prefer the Dari word.

## House style taken from the catalog

- **Formal address.** 467 strings use شما / ـتان / the plural imperative (…کنید). Only 2 use the
  informal singular imperative (`label.always-open-named-store`, `label.always-open-picked-store`:
  _باز کن_). Requests are phrased _لطفاً … کنید_ (42 strings).
- **Buttons use the infinitive or a verbal noun, not the imperative.** Of 204 `button.` strings,
  only 7 end in an imperative (_تأیید کنید_, _رد کنید_, _بازنشانی کنید_ …). The rest open with an
  infinitive or verbal noun: _افزودن_ (25), _ایجاد …_ (10), _وارد کردن …_ (8), _تأیید_ (6),
  _ذخیره_ (6), _حذف_ (5), _بستن_, _پاک کردن نتایج_, _دانلود_.
- **Statuses and badges use the past participle** (_حذف شده_, _بدون تغییر_); log entries use the
  simple past (_حذف شد_, _بروزرسانی شد_).
- **Error messages for a failed action**: _X ممکن نیست_ / _X ممکن نشد_ (47), _نمی‌توان …_ (103),
  e.g. _بارگذاری پلاگین ممکن نیست_, _تبدیل CSV به Excel ممکن نیست_.
- **"Again" is _دوباره_** (31) rather than _مجدداً_ (1).
- **Persian digits in prose**: 90 strings use ۰–۹, 8 use ASCII digits (mostly version names
  such as V6/V7 and `1 مورد`). Placeholders (`{{count}}`) are formatted by the app.
- **Plurals**: the noun after a number stays singular (_{{count}} ردیف_, _{{count}} خطا_), so a
  `_one` and `_other` form are usually identical.
- **Half-space (ZWNJ, U+200C)** joins suffixes: _ردیف‌ها_ (568 _‌ها_ with ZWNJ vs 68 with a
  space), _می‌شود_ (513 vs 0 with a space). _شده_ after a noun is split: 303 with ZWNJ, 219
  with a space.

## Abbreviations and loanwords

- **No Persian-script abbreviations.** The catalog writes English short forms in full:
  _Min_/_Max_ → _حداقل_/_حداکثر_, _Qty_ → _تعداد_, _Ref_ → _مرجع_. Don't invent dotted
  abbreviations; shorten by choosing a shorter word.
- **Domain acronyms stay in Latin script**: AMC (25), ID (25), MOS (16), VVM (14), SOH (7),
  CCE (7), PO (6), GTIN, VEN. Word order puts the Persian qualifier after them:
  _SOH اولیه_, _MOS هدف_.
- **Product and format names stay in Latin script**: Excel (4 of 4, never _اکسل_), CSV, PDF,
  JSON, USB, URL, API, mSupply. A file extension goes in parentheses: _(.json)_.
- Some English loanwords are written in Persian script and accepted in Dari: _فایل_ (34),
  _دانلود_ (14), _سرور_ (86), _تب_ (10), _ابدیت_ (6, minority).

## Glossary

Counts are catalog strings whose English contains the term and whose Dari contains the
rendering.

| English                     | Dari                            | Count                                      | Notes                                                                                                   |
| --------------------------- | ------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| import (verb, noun, button) | وارد کردن                       | 27 of 38                                   | past: _وارد شد_ (5). _واردات/وارداتی_ only 2; avoid _واردات_ — it reads as trade imports of goods       |
| export                      | صادر کردن                       | button/tab _صادر کردن_; 8 of 10 use _صادر_ | noun _صدور_ (`message.export-failed`); _صادرات_ 1                                                       |
| upload                      | بارگذاری                        | 19 of 36                                   | _آپلود_ 13; _ذخیره_ 4 (wrong)                                                                           |
| download                    | دانلود                          | 14 of 14                                   | never _بارگیری_                                                                                         |
| file                        | فایل                            | 34 of 35                                   |                                                                                                         |
| row (table/spreadsheet)     | ردیف                            | 27 of 27                                   | _سطر_ is "line" (order line), 113                                                                       |
| column                      | ستون                            | 13 of 13                                   |                                                                                                         |
| sheet (Excel worksheet)     | ورق                             | 1 vs 1                                     | only printed sheets in the catalog: _ورق شمارش فزیکی_ vs _برگه شمارش فزیکی_; _ورق_ is the Dari word     |
| table                       | جدول                            | 6 of 6                                     |                                                                                                         |
| record (data record)        | رکورد                           | 19                                         | _ریکارد_ 7 (Dari spelling, minority); _سابقه_ is a patient/dispensing record                            |
| unit                        | واحد                            | 48 of 57                                   | rest are placeholders only                                                                              |
| item                        | واکسین و مواد خشک               | 87                                         | _جنس/اجناس_ 63, _قلم/اقلام_ 30; the catalog localises "item" for an EPI deployment — see open questions |
| location type               | نوع مکان / انواع مکان           | 2 of 2                                     | location: _مکان_ 63 of 64                                                                               |
| user                        | کاربر / کاربران                 | 11 of 13                                   | _استفاده کننده_ 2 (sync-info)                                                                           |
| preview                     | پیش‌نمایش                       | 1 of 1                                     |                                                                                                         |
| review (verb)               | بازبینی                         | 2                                          | _بررسی_ 2                                                                                               |
| change                      | تغییر / تغییرات                 | 55 of 56                                   |                                                                                                         |
| new                         | جدید                            | all 4 single-word `New` keys               |                                                                                                         |
| updated                     | بروزرسانی شده / بروزرسانی شد    | 33                                         | _به‌روزرسانی_ 11 + _به‌روز_ 9; _ابدیت_ 6                                                                |
| deleted                     | حذف شده (status) / حذف شد (log) | 68 contain _حذف شد_                        |                                                                                                         |
| unchanged                   | بدون تغییر                      | 2 of 2                                     |                                                                                                         |
| error                       | خطا                             | 55 of 61                                   |                                                                                                         |
| problem                     | مشکل                            | 6 of 6                                     | keep apart from _خطا_ where the English does                                                            |
| filter                      | فیلتر                           | 17 vs 16 _فلتر_                            | split almost evenly — see open questions                                                                |
| search                      | جستجو                           | 31 of 32                                   |                                                                                                         |
| status                      | وضعیت                           | 95 of 98                                   | _حالت_ for "mode"/hold                                                                                  |
| total                       | مجموع                           | 33 of 59                                   | _کل_ 14, _جمع_ 5; "N of total" is _{{n}} از {{total}}_                                                  |
| confirm                     | تأیید                           | 31 of 32                                   | spelling _تأیید_ 88 vs _تایید_ 4                                                                        |
| sync                        | همگام‌سازی                      | 72 of 72                                   |                                                                                                         |
| data                        | داده                            | 88                                         | _معلومات_ 7, _اطلاعات_ 20 (information)                                                                 |
| server                      | سرور                            | 86 of 88                                   |                                                                                                         |
| contains (search label)     | شامل                            | 7                                          | _نام کاربری شامل_, _کد یا نام شامل_                                                                     |
| tab                         | تب                              | 10                                         | never _زبانه_                                                                                           |

## Open questions

- **item**: _واکسین و مواد خشک_ (87, e.g. `label.item`, `items`) vs _جنس/اجناس_ (63, e.g.
  `nav.catalogue.items`, `stocktake.column.item-name`) vs _قلم/اقلام_ (30, e.g.
  `label.ancillary-item`). The first suits a vaccine-only deployment but is long and wrong for
  general medicines; a reviewer should decide whether new strings follow it.
- **filter**: _فیلتر_ (17, `label.filters`, `label.clear-filter`, `placeholder.filter-items`) vs
  _فلتر_ (16, `filter.filters`, `label.add-filter`, `stocktake.create-filtered-description`).
  _فلتر_ is the common Afghan spelling; the drafts follow the one-string majority _فیلتر_.
- **updated**: _بروزرسانی_ (33, `button.update`, `log.asset-updated`) vs _به‌روزرسانی_ (11,
  `label.form-outcome-updated`) vs _به‌روز_ (9, `messages.import-facilities-updated_other`) vs
  _ابدیت_ (6, `success.sync-settings`).
- **upload**: _بارگذاری_ (19) vs _آپلود_ (13, `button.upload-a-new-one`,
  `error.upload-too-large`); and four upload strings say _ذخیره_ ("save"):
  `messages.no-documents-uploaded`, `messages.upload-error`, `messages.upload-invite`,
  `title.upload-reports`.
- **record**: _رکورد_ (19) vs _ریکارد_ (7, `messages.forms-on-server`).
- **sheet**: _ورق_ (`report.stocktake-sheet`) vs _برگه_ (`report.stock-take-sheet`).
- **store**: _ذخیره گاه_ (76) vs _ذخیرگاه_ (26).
- **total**: _مجموع_ (33) vs _کل_ (14, `description.total`).

## Right-to-left notes

- **Persian punctuation throughout**: comma _،_ (185 strings, no Latin `,`), question mark _؟_
  (83, no `?`), semicolon _؛_ (4, no `;`). Use them in new strings.
- **Arrows point the reading direction**: the one arrow in the catalog is _←_
  (`messages.custom-translations-import-multi-language`: _زبان ← فضای نام ← کلید ← مقدار_).
  Turn an English → into ←.
- **Kept as in English**: the middle dot _·_ as a separator (4), the em dash _—_ (32), the
  ellipsis _…_ (26; _..._ in 19), the colon _:_.
- **Quotation marks**: _« »_ (4) for a quoted UI name; straight quotes also occur (6 `"`, 27 `'`).
- **Percent**: _٪_ (2) and _%_ (4) both occur.
- Words like "right" and "left" for screen or sheet positions flip meaning in an RTL layout;
  prefer direction-free wording (before/after, first/last) when the English names a side.
