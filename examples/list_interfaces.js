'use strict';

const {Wireless} = require('..');
const wireless = new Wireless('wlan0');

wireless.open()
  .then(() => wireless.listInterfaces())
  .then(ifaces => {
    console.log(ifaces);
  })
  .then(() => wireless.close());
