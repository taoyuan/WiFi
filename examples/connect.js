'use strict';

const {Wireless} = require('..');
const wireless = new Wireless();

const argv = require('yargs').argv;

(async () => {
  const result = await wireless.connect(argv.ssid, argv.pass);
  console.log(result);
})();
