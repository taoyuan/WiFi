'use strict';

const {Wireless} = require('..');
const wireless = new Wireless();

const argv = require('yargs').argv;

if (!argv.ssid) {
  console.warn('You should run example with --ssid and --pass');
  process.exit(1);
}

(async () => {
  const result = await wireless.connect(argv.ssid, argv.pass);
  console.log(result);
})();
