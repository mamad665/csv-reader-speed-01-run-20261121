// Fast drop-in for csv-reader 1.0.0 — variant C.
// Common unquoted path inlined in the record loop (no closure call, no
// return-array allocation per field). Rare paths (stray CR, quoted fields,
// unterminated quote, quote junk) stay in closures.

/** csv-reader 1.0.0's answer for one case's input. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  let i = 0;
  let line = 1;
  let recordLine = 1;
  let recordRow = null;
  if (n > 0 && text.charCodeAt(0) === 0xfeff) i = 1;

  const COMMA = 0;
  const BREAK = 1;
  const END = 2;

  function scanUnq(p, init) {
    let v = init;
    let has = init !== '';
    let added = 0;
    for (;;) {
      let j = text.indexOf(',', p);
      let k = text.indexOf('\n', p);
      let b;
      let comma = false;
      let lf = false;
      if (j === -1) {
        if (k === -1) {
          b = n;
        } else {
          b = k;
          lf = true;
        }
      } else if (k === -1) {
        b = j;
        comma = true;
      } else if (j < k) {
        b = j;
        comma = true;
      } else {
        b = k;
        lf = true;
      }
      const seg = text.slice(p, b);
      const r = seg.indexOf('\r');
      if (r === -1) {
        if (b > p) {
          v = has ? v + seg : seg;
          added += b - p;
        }
        if (b >= n) {
          i = n;
          return [v, END, added];
        }
        if (comma) {
          i = b + 1;
          return [v, COMMA, added];
        }
        i = b + 1;
        line += 1;
        return [v, BREAK, added];
      }
      const rp = p + r;
      if (rp === b - 1 && lf) {
        if (rp > p) {
          const s2 = seg.slice(0, r);
          v = has ? v + s2 : s2;
          added += r;
        }
        i = b + 1;
        line += 1;
        return [v, BREAK, added];
      }
      return scanUnqSlow(p, v, has, added);
    }
  }

  function scanUnqSlow(p, v, has, added) {
    let start = p;
    let j = p;
    for (;;) {
      if (j >= n) {
        if (n > start) {
          v = has ? v + text.slice(start, n) : text.slice(start, n);
          added += n - start;
        }
        i = n;
        return [v, END, added];
      }
      const c = text.charCodeAt(j);
      if (c === 44) {
        if (j > start) {
          v = has ? v + text.slice(start, j) : text.slice(start, j);
          added += j - start;
        }
        i = j + 1;
        return [v, COMMA, added];
      }
      if (c === 10) {
        if (j > start) {
          v = has ? v + text.slice(start, j) : text.slice(start, j);
          added += j - start;
        }
        i = j + 1;
        line += 1;
        return [v, BREAK, added];
      }
      if (c === 13) {
        if (text.charCodeAt(j + 1) === 10) {
          if (j > start) {
            v = has ? v + text.slice(start, j) : text.slice(start, j);
            added += j - start;
          }
          i = j + 2;
          line += 1;
          return [v, BREAK, added];
        }
        if (j > start) {
          v = has ? v + text.slice(start, j) : text.slice(start, j);
          added += j - start;
          has = true;
        }
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        j += 1;
        start = j;
        continue;
      }
      j += 1;
    }
  }

  function fixSeg(s) {
    const t = s.replace(/\r\n?/g, '\n');
    let breaks = 0;
    let k = 0;
    for (;;) {
      const p = t.indexOf('\n', k);
      if (p === -1) break;
      breaks += 1;
      k = p + 1;
    }
    line += breaks;
    return t;
  }


  for (;;) {
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 10) {
        i += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(i + 1) === 10) {
        i += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (i >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    let ended;
    do {
      if (text.charCodeAt(i) === 34) {
        quoted = true;
        // Inlined quoted field.
        const open = i;
        const openLine = line;
        let qv = '';
        let has = false;
        let seg = i + 1;
        for (;;) {
          const q = text.indexOf('"', seg);
          if (q === -1) {
            i = open + 1;
            line = openLine;
            errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
            const r = scanUnq(open + 1, '"');
            fields.push(r[0]);
            ended = r[1];
            break;
          }
          if (text.charCodeAt(q + 1) === 34) {
            const s = text.slice(seg, q);
            const t = s.indexOf('\r') === -1 && s.indexOf('\n') === -1 ? s : fixSeg(s);
            qv = has ? qv + t + '"' : t + '"';
            has = true;
            seg = q + 2;
            continue;
          }
          const s = text.slice(seg, q);
          const t = s.indexOf('\r') === -1 && s.indexOf('\n') === -1 ? s : fixSeg(s);
          qv = has ? qv + t : t;
          const after = q + 1;
          if (after >= n) {
            i = n;
            fields.push(qv);
            ended = END;
            break;
          }
          const c = text.charCodeAt(after);
          if (c === 44) {
            i = after + 1;
            fields.push(qv);
            ended = COMMA;
            break;
          }
          if (c === 10) {
            i = after + 1;
            line += 1;
            fields.push(qv);
            ended = BREAK;
            break;
          }
          if (c === 13 && text.charCodeAt(after + 1) === 10) {
            i = after + 2;
            line += 1;
            fields.push(qv);
            ended = BREAK;
            break;
          }
          const junk = scanUnq(after, qv);
          if (junk[2] > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
          fields.push(junk[0]);
          ended = junk[1];
          break;
        }
      } else {
        // Inlined unquoted fast path: fresh field, no accumulation.
        quoted = false;
        let j = text.indexOf(',', i);
        let k = text.indexOf('\n', i);
        let b;
        let comma = false;
        let lf = false;
        if (j === -1) {
          if (k === -1) {
            b = n;
          } else {
            b = k;
            lf = true;
          }
        } else if (k === -1) {
          b = j;
          comma = true;
        } else if (j < k) {
          b = j;
          comma = true;
        } else {
          b = k;
          lf = true;
        }
        const seg = text.slice(i, b);
        const r = seg.indexOf('\r');
        if (r === -1) {
          fields.push(seg);
          if (b >= n) {
            i = n;
            ended = END;
          } else if (comma) {
            i = b + 1;
            ended = COMMA;
          } else {
            i = b + 1;
            line += 1;
            ended = BREAK;
          }
        } else if (i + r === b - 1 && lf) {
          fields.push(seg.slice(0, r));
          i = b + 1;
          line += 1;
          ended = BREAK;
        } else {
          const f = scanUnqSlow(i, '', false, 0);
          fields.push(f[0]);
          ended = f[1];
        }
      }
    } while (ended === COMMA);

    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
