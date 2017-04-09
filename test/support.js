'use strict';

exports.isRoot = function () {
  return process.getuid && process.getuid() === 0;
};

if (!exports.isRoot()) {
  console.error('You should run test in root.');
  process.exit(1);
}

const ssid = exports.ssid = process.env.SSID;
const password = exports.password = process.env.PASS;

if (ssid) {
  console.log('----------------------------');
  console.log('AP test with creds', {ssid, password});
  console.log('----------------------------');
} else {
  console.warn('* No ssid configured, skip all AP tests.');
}
