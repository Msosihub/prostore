const { execFileSync } = require("node:child_process");
const path = require("node:path");
test("staging blocks direct TCP, HTTPS get and URL-option host overrides without any outgoing request", () => {
  const fixture = path.join(__dirname, "browser/provider-fixture.cjs");
  execFileSync(
    process.execPath,
    [
      "-e",
      `
    const assert=require('node:assert/strict'),net=require('node:net');
    let connections=0;
    net.Socket.prototype.connect=function(){connections++;return this;};
    require(${JSON.stringify(fixture)});
    assert.throws(()=>new net.Socket().connect(443,'example.test'));
    assert.throws(()=>new net.Socket().connect({host:'example.test',port:443}));
    assert.throws(()=>require('https').get('https://example.test/'));
    assert.throws(()=>require('http').request('http://127.0.0.1/',{hostname:'example.test'}));
    assert.equal(connections,0);
    new net.Socket().connect({host:'127.0.0.1',port:1234});
    assert.equal(connections,1);
  `,
    ],
    { env: { PATH: process.env.PATH }, stdio: "pipe" },
  );
});
