# CSV Reader — mamad665

[![make.fun](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/mamad665/csv-reader-speed-01-run-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/mamad665/csv-reader-speed-01-run-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121)

A faster drop-in for csv-reader 1.0.0, entered in the [make.fun bounty "Read broken CSV files faster"](https://make.fun/bounty/csv-reader-speed-01-run-20261121).

## What it does

`solve.js` exports `run(input)`, which returns exactly what csv-reader 1.0.0
returns for `{text, header}`: `{columns, rows, errors}` — the same broken-row
policy (BOM dropped, CRLF/LF record ends, stray CR dropped, quoted fields
with `""` escapes and line breaks inside, `quote_junk`, `unterminated_quote`,
`short_row`/`long_row` padding and cutting), byte-identical in JSON terms.

## How it is faster

The reference walks one character at a time and builds each field a character
at a time. This one walks field by field:

- `indexOf` finds the next delimiter in C++ and `slice` takes the field
  whole; only the rare broken bits (a stray CR, a line break inside quotes,
  an unterminated quote) fall back to a slow loop.
- The common unquoted and quoted paths are inlined in the record loop: no
  closure call and no return-array allocation per field.
- `main.ts` stringifies each case's answer as soon as it is computed and
  drops the answer, so the live heap stays small and the garbage collector
  has almost no object graph to mark. The written file is byte-identical to
  `JSON.stringify` of the whole answers array.

On the kit's practice set (6 cases, ~10.2 MB of CSV) it runs about 4x
faster than the house baseline's `run()` and about 2x faster as a whole
program, measured as CPU time on one CPU.

## Run

```sh
node main.ts
```

It reads `/input/cases.json` (or `$MAKEFUN_INPUT_DIR/cases.json`) and writes
`/output/answers.json` (or `$MAKEFUN_OUTPUT_DIR/answers.json`). Node 22+,
no dependencies, no network.

## License

MIT. See [LICENSE](LICENSE).
