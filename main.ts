// csv-reader-speed-01 entry driver: reads every case from /input/cases.json,
// answers each one alone with run() from solve.js, and writes
// /output/answers.json. Answers are stringified one case at a time and the
// case's answer is dropped right after, so the live heap stays small and the
// garbage collector has almost no object graph to mark; the joined file is
// byte-identical to JSON.stringify of the whole answers array.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';

setFlagsFromString('--no-incremental-marking');

const { run } = (await import(new URL('./solve.js', import.meta.url).href));

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const cases = JSON.parse(readFileSync(join(INPUT_DIR, 'cases.json'), 'utf8'));
const parts = new Array(cases.length);
for (let k = 0; k < cases.length; k++) {
  parts[k] = JSON.stringify(run(cases[k].input));
  cases[k] = null;
}
writeFileSync(join(OUTPUT_DIR, 'answers.json'), `[${parts.join(',')}]`);
