'use strict';

import * as yargs from "yargs";

export function isRoot() {
  return process.getuid && process.getuid() === 0;
}

if (!isRoot()) {
  console.error('You should run test in root.');
  process.exit(1);
}

const argv = yargs.argv;

export const ssid = argv.ssid;
export const password = argv.pass;

if (ssid) {
  console.log('----------------------------');
  console.log('Testing with creds: ', {ssid, password});
  console.log('----------------------------');
}
