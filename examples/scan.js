'use strict';

const {Wireless} = require('..');
const wireless = new Wireless('wlan0');

wireless.open().then(() => {
  return wireless.scan().then(networks => {
    console.log(networks);
  });
}).then(() => wireless.close());
