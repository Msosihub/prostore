const { chromium } = require("playwright");
const launch = chromium.launch.bind(chromium);
chromium.launch = (options) =>
  launch({
    ...options,
    args: [
      ...JSON.parse(process.env.PROSTORE_CHROMIUM_ARGS || "[]"),
      ...(options?.args || []),
    ],
  });
