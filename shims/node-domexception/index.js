// Shim to bypass the deprecated node-domexception@1.0.0 package warning.
// Since modern Node.js runs with native DOMException, we export it directly.
module.exports = globalThis.DOMException;
