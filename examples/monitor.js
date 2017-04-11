'use strict';

const {Monitor} = require('..');
const monitor = new Monitor();

monitor.on('data', data => {
  console.log('data:', data);
});
monitor.on('control', (control, args) => {
  console.log('control:', control, args);
});
