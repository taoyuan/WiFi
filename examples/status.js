'use strict';

const {Wireless} = require('..');
const wireless = new Wireless('wlan0');

wireless.status().then(console.log);


// ----------------------
// inactive
// ----------------------
// { wpa_state: 'INACTIVE',
//   p2p_device_address: 'b8:27:eb:7e:11:87',
//   address: 'b8:27:eb:7e:11:87',
//   uuid: '1b984a4b-f4df-5ca5-9c09-04b4dc519b0c' }

// ----------------------
// disconnected
// ----------------------
//
// { wpa_state: 'DISCONNECTED',
//   p2p_device_address: 'b8:27:eb:7e:11:87',
//   address: 'b8:27:eb:7e:11:87',
//   uuid: '1b984a4b-f4df-5ca5-9c09-04b4dc519b0c' }

// -------------------
// connected
// -------------------
// { bssid: '58:6d:8f:fb:1a:7e',
//   freq: '2457',
//   ssid: 'TY',
//   id: '0',
//   mode: 'station',
//   pairwise_cipher: 'CCMP',
//   group_cipher: 'CCMP',
//   key_mgmt: 'WPA2-PSK',
//   wpa_state: 'COMPLETED',
//   p2p_device_address: 'b8:27:eb:7e:11:87',
//   address: 'b8:27:eb:7e:11:87',
//   uuid: '1b984a4b-f4df-5ca5-9c09-04b4dc519b0c' }

// ---------------
// AP mode started
// ---------------
// { wpa_state: 'DISCONNECTED',
//   ip_address: '10.1.1.1',
//   p2p_device_address: 'b8:27:eb:7e:11:87',
//   address: 'b8:27:eb:7e:11:87',
//   uuid: '1b984a4b-f4df-5ca5-9c09-04b4dc519b0c' }
