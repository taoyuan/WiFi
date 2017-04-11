'use strict';

const {Wireless} = require('..');
const wireless = new Wireless();

wireless.mode().then(console.log);
