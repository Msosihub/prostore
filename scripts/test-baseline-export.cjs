// Own network-disabled disposable PostgreSQL only; no database URL input.
const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const name='prostore-metadata-'+randomUUID();const prefix=['-H','unix:///var/run/docker.sock'];
const docker=(args,input)=>cp.spawnSync('docker',[...prefix,...args],{input,encoding:'utf8',timeout:30000});
const sql=s=>docker(['exec','-i',name,'psql','-X','-At','-U','postgres','-v','ON_ERROR_STOP=1'],s);
const source=fs.readFileSync(path.join(__dirname,'export-production-baseline.sql'),'utf8');
const records=r=>{assert.equal(r.status,0,r.stderr);return r.stdout.split('\n').filter(l=>l.startsWith('{')).map(l=>JSON.parse(l));};
(async()=>{
 try {
  let r=docker(['run','--detach','--name',name,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine']);assert.equal(r.status,0,r.stderr);
  let ready=false;for(let i=0;i<50;i++){if(docker(['logs',name]).stdout.includes('PostgreSQL init process complete') && docker(['exec',name,'pg_isready','-U','postgres']).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,200));}assert(ready);
  let empty=records(sql(source));assert.equal(empty[0].transaction_read_only,'on');assert.equal(empty[1].migration_history,null);
  r=sql(`CREATE TABLE "User"(id int PRIMARY KEY,private_data text DEFAULT 'private-default-marker'); INSERT INTO "User" VALUES(1,'private-row-marker'); CREATE TABLE _prisma_migrations(migration_name text,checksum text,started_at timestamptz,finished_at timestamptz,rolled_back_at timestamptz,applied_steps_count int,logs text); INSERT INTO _prisma_migrations VALUES('synthetic',repeat('a',64),now(),now(),null,1,'private-log-marker');`);assert.equal(r.status,0,r.stderr);
  const result=sql(source),data=records(result);assert.equal(data[1].migration_history.length,1);assert(data[0].tables.includes('User'));assert(data[0].columns.some(c=>c.column_name==='private_data'));
  for(const marker of ['private-default-marker','private-row-marker','private-log-marker'])assert(!result.stdout.includes(marker));
  const refused=sql(source.replace('ROLLBACK;','CREATE TABLE forbidden_write(id int);\nROLLBACK;'));assert.notEqual(refused.status,0);assert(refused.stderr.includes('read-only transaction'));
  assert.equal(sql("SELECT to_regclass('public.forbidden_write') IS NULL;").stdout.trim(),'t');
  console.log('PASS metadata export: absent/present history, schema contracts, read-only enforcement, no application/default/log values, rollback');
 } finally {docker(['rm','--force',name]);}
})().catch(e=>{console.error(e.message);process.exitCode=1});
