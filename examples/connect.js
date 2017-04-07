'use strict';

const {Wireless} = require('..');
const wireless = new Wireless();

wireless.on('raw_msg', msg => {
  console.log(msg);
});

wireless.open().then(() => {
  return wireless.connect('TY', 'king8888').then(result => {
    console.log(result);
  });
}).then(() => wireless.close());
