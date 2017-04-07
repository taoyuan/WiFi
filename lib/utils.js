'use strict';

exports.toUpper = function (value) {
  if (!value) {
    return value;
  }
  if (typeof value !== 'string') {
    value = value.toString();
  }
  return value.toUpperCase();
};

exports.toLower = function (value) {
  if (!value) {
    return value;
  }
  if (typeof value !== 'string') {
    value = value.toString();
  }
  return value.toLowerCase();
};
