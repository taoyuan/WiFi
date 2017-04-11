'use strict';

const {Wireless} = require('..');
const wireless = new Wireless();

return wireless.connect('TY', 'king8888').then(result => {
  console.log(result);
});
