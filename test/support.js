'use strict';

exports.isRoot = function () {
  return process.getuid && process.getuid() === 0;
};

if (!exports.isRoot()) {
  console.error('You should run test in root.');
  process.exit(1);
}

const ssid = exports.ssid = process.env.SSID || 'ssid';
const password = exports.password = process.env.PASS || 'password';

console.log('----');
console.log('AP test creds:', {ssid, password});
console.log('----');
