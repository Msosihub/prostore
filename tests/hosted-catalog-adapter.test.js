const fs = require('fs');
const vm = require('vm');
const adapt = require('../scripts/hosted-catalog-adapter.cjs');
const source = fs.readFileSync('tests/integration/catalog-launch.cjs','utf8');
test('hosted adapter retains import locks and empty-target checks',()=>{
 const output=adapt(source);
 expect(output).toContain('LOCK TABLE');
 expect(output).toContain('Target is not an empty operational catalog');
 expect(output).toContain('Verified target seller account required');
 expect(output).toContain('identity[0]?.name !== "nimboya_staging"');
 expect(output).not.toContain('127\\.0');
});
test('hosted adapter checks exact approved identity and datasource before any database import',()=>{
 const output=adapt(source);
 let guarded=0;
 const ctx={process:{env:{DATABASE_URL:'synthetic',PROSTORE_TEST_DATABASE_URL:'other'}},require:()=>({assertStaging:()=>{guarded++}})};
 expect(()=>vm.runInNewContext(output,ctx)).toThrow('Hosted rehearsal datasource mismatch');
 expect(guarded).toBe(1);
 const denied={process:{env:{}},require:()=>({assertStaging:()=>{throw Error('wrong project')}})};
 expect(()=>vm.runInNewContext(output,denied)).toThrow('wrong project');
});
test('changed fixture anchors refuse transformation',()=>{
 expect(()=>adapt('unexpected')).toThrow('anchors changed');
});
