'use strict';

const {Wireless} = require('..');
const wireless = new Wireless('wlan0');

wireless.reboot();
