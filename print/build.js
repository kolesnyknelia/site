/* Збирає всі макети «Тямко» в print/out/:  node print/build.js  (або з аргументом: papka | den | nalipky | mistechko | znaydy) */
"use strict";
const L = require("./lib");
const ALL = ["papka", "den", "nalipky", "mistechko", "znaydy"];

(async () => {
  const only = process.argv[2];
  for (const name of only ? [only] : ALL) {
    console.log(`\n== ${name} ==`);
    await require("./" + name).build();
  }
  await L.done();
})().catch(e => { console.error(e); process.exit(1); });
