'use strict';

const {Wireless} = require('..');
const wireless = new Wireless();

(async () => await wireless.disconnect())();

