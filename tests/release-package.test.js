const { inspectRelease } = require("../scripts/release-manifest.cjs");
const fixture = () => ({
  files: ["package.json", "abc", "abc.pub"],
  packageJSON: {
    scripts: {
      build: "next build",
      start: "next start",
      postinstall: "prisma generate",
    },
  },
  exclusions: {
    ".vercelignore": "abc\nabc.pub\n.env*\ntests\nscripts/hosted-*",
    ".dockerignore": "abc\nabc.pub\n.env*\ntests\nscripts/hosted-*",
    ".gitattributes":
      "/abc export-ignore\n/abc.pub export-ignore\n/.env* export-ignore\n/tests export-ignore\n/scripts/hosted-* export-ignore",
  },
});
test("reviewed source packaging passes without declaring production readiness", () =>
  expect(inspectRelease(fixture())).toEqual([]));
test.each([
  "instrumentation.ts",
  "provider-fixture.cjs",
  "app/qa-loading/page.tsx",
  "scripts/hosted-staging-build.cjs",
  "tests/hosted/launch.cjs",
])("rejects temporary hosted source %s", (file) => {
  const f = fixture();
  f.files.push(file);
  expect(inspectRelease(f)).toContain("HOSTED_REHEARSAL_SOURCE_PRESENT");
});
test.each(["build", "start", "postinstall"])(
  "rejects changed %s hook",
  (key) => {
    const f = fixture();
    f.packageJSON.scripts[key] = "node scripts/hosted-staging-build.cjs";
    expect(inspectRelease(f)).toContain("UNREVIEWED_BUILD_HOOK");
  },
);
test.each([".vercelignore", ".dockerignore", ".gitattributes"])(
  "requires exclusions in %s",
  (key) => {
    const f = fixture();
    delete f.exclusions[key];
    expect(inspectRelease(f).length).toBeGreaterThan(0);
  },
);
