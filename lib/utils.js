'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
function toUpper(value) {
    if (!value) {
        return value;
    }
    if (typeof value !== 'string') {
        value = value.toString();
    }
    return value.toUpperCase();
}
exports.toUpper = toUpper;
function toLower(value) {
    if (!value) {
        return value;
    }
    if (typeof value !== 'string') {
        value = value.toString();
    }
    return value.toLowerCase();
}
exports.toLower = toLower;
function promiseFromCallback(fn) {
    return new Promise((resolve, reject) => {
        fn((err, result) => {
            if (err)
                return reject(err);
            resolve(result);
        });
    });
}
exports.promiseFromCallback = promiseFromCallback;
function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}
exports.wait = wait;
function promiseTimeout(promise, timeoutMillis) {
    const error = new TimeoutError();
    let timeout;
    return Promise.race([
        promise,
        new Promise(function (resolve, reject) {
            timeout = setTimeout(function () {
                reject(error);
            }, timeoutMillis);
        }),
    ]).then(function (v) {
        clearTimeout(timeout);
        return v;
    }, function (err) {
        clearTimeout(timeout);
        throw err;
    });
}
exports.promiseTimeout = promiseTimeout;
class TimeoutError extends Error {
    constructor() {
        super();
        this.name = 'TimeoutError';
        this.message = 'Timeout';
        this.stack = Error().stack;
    }
}
exports.TimeoutError = TimeoutError;
//# sourceMappingURL=utils.js.map