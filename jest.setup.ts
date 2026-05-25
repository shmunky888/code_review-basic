import '@testing-library/jest-dom';

// Polyfill web standards in JSDOM environment using native Node.js implementations
if (typeof global.Request === 'undefined') {
  global.Request = globalThis.Request;
}
if (typeof global.Headers === 'undefined') {
  global.Headers = globalThis.Headers;
}
if (typeof global.Response === 'undefined') {
  global.Response = globalThis.Response;
}
if (typeof global.fetch === 'undefined') {
  global.fetch = globalThis.fetch as any;
}
