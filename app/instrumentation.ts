// To ensure your layout streams share a unified execution pipeline across serverless environments, initialize this tracking helper at the root layer of your API.
import { EventEmitter } from "events";

export function register() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof global !== "undefined" && !(global as any).chatEventEmitter) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).chatEventEmitter = new EventEmitter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).chatEventEmitter.setMaxListeners(100);
  }
}
