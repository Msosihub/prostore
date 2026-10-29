const {test}=require('node:test');const assert=require('node:assert/strict');
const {assess}=require('./compare-production-baseline.cjs');
const expected=[{name:'a',checksum:'aaa'},{name:'b',checksum:'bbb'}];
const metadata={report_version:1,transaction_read_only:'on',tables:['_prisma_migrations']};
const row=(name,overrides={})=>({migration_name:name,checksum:expected.find(x=>x.name===name)?.checksum||'unknown',finished_at:'2026-01-01',rolled_back_at:null,...overrides});
test('matching prefix identifies pending migration without authorizing execution',()=>{const r=assess(metadata,[row('a')],expected);assert.equal(r.status,'HISTORY_PREFIX_MATCHES');assert.deepEqual(r.pending,['b']);assert.equal(r.migrationExecutionApproved,false);});
test('complete history still does not approve production migration',()=>{const r=assess(metadata,[row('a'),row('b')],expected);assert.equal(r.issues.length,0);assert.equal(r.migrationExecutionApproved,false);});
test('missing history is review-only',()=>assert(assess(metadata,null,expected).issues.includes('migration-history-missing')));
test('existing untracked schema is not treated as an empty baseline',()=>assert(assess({...metadata,tables:['User']},[],expected).issues.includes('untracked-existing-tables')));
test('checksum drift, unknown migrations and duplicate completions are detected',()=>{const r=assess(metadata,[row('a',{checksum:'changed'}),row('a'),row('foreign')],expected);assert(r.issues.includes('checksum-mismatch:a'));assert(r.issues.includes('duplicate-completion:a'));assert(r.issues.includes('unknown:foreign'));});
test('unfinished and non-prefix migrations are refused',()=>{const r=assess(metadata,[row('a',{finished_at:null}),row('b')],expected);assert(r.issues.includes('unfinished:a'));assert(r.issues.includes('non-prefix-history:b'));});
test('rolled-back failed attempt followed by completed retry is not duplicate applied history',()=>{const r=assess(metadata,[row('a',{finished_at:null,rolled_back_at:'2026-01-02'}),row('a')],expected);assert.deepEqual(r.issues,[]);});
test('writable or malformed exports are rejected',()=>{assert.throws(()=>assess({...metadata,transaction_read_only:'off'},[],expected));assert.throws(()=>assess(metadata,{},expected));assert.throws(()=>assess(metadata,[{}],expected));});
test('CLI consumes JSONL with psql command tags and current checksums',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'baseline-cli-'));try{
  const current=require('./compare-production-baseline.cjs').expectedMigrations(path.join(__dirname,'../prisma/migrations'));
  const file=path.join(dir,'baseline.jsonl');fs.writeFileSync(file,'BEGIN\nSET\n'+JSON.stringify(metadata)+'\n'+JSON.stringify({migration_history:[{...row('a'),migration_name:current[0].name,checksum:current[0].checksum}]})+'\nROLLBACK\n');
  const r=cp.spawnSync(process.execPath,[path.join(__dirname,'compare-production-baseline.cjs'),file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const output=JSON.parse(r.stdout);assert.equal(output.pending.length,current.length-1);assert.equal(output.migrationExecutionApproved,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('CLI malformed input does not echo sensitive file content',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'baseline-cli-'));try{
  const file=path.join(dir,'broken.jsonl');fs.writeFileSync(file,'{private-input-marker');
  const r=cp.spawnSync(process.execPath,[path.join(__dirname,'compare-production-baseline.cjs'),file],{encoding:'utf8'});assert.equal(r.status,1);assert(!(r.stdout+r.stderr).includes('private-input-marker'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
