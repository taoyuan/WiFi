'use strict';

export function toUpper(value) {
  if (!value) {
    return value;
  }
  if (typeof value !== 'string') {
    value = value.toString();
  }
  return value.toUpperCase();
}

export function toLower(value) {
  if (!value) {
    return value;
  }
  if (typeof value !== 'string') {
    value = value.toString();
  }
  return value.toLowerCase();
}

export function promiseFromCallback(fn: (cb) => any): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    fn((err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

export function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

export function promiseTimeout(promise, timeoutMillis) {
  const error = new TimeoutError();
    let timeout;

  return Promise.race([
    promise,
    new Promise(function(resolve, reject) {
      timeout = setTimeout(function() {
        reject(error);
      }, timeoutMillis);
    }),
  ]).then(function(v) {
    clearTimeout(timeout);
    return v;
  }, function(err) {
    clearTimeout(timeout);
    throw err;
  });
}

export class TimeoutError extends Error {
  constructor() {
    super();
    this.name = 'TimeoutError';
    this.message = 'Timeout';
    this.stack = Error().stack;
  }
}

