'use strict';

const {Wireless} = require('..');
const wireless = new Wireless();

wireless.scan().then(console.log);
