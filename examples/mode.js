'use strict';

const {Wireless} = require('..');
const wireless = new Wireless('wlan0');

wireless.open().then(() => {
  return wireless.mode().then(mode => {
    console.log(mode);
  });
}).then(() => wireless.close());
