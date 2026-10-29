// Offline comparison only: never opens a database connection or executes migrations.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
function expectedMigrations(root) {
 return fs.readdirSync(root).sort().filter(n=>fs.existsSync(path.join(root,n,'migration.sql'))).map(name=>({name,checksum:createHash('sha256').update(fs.readFileSync(path.join(root,name,'migration.sql'))).digest('hex')}));
}
function assess(metadata, history, expected) {
 if(metadata?.report_version!==1 || metadata.transaction_read_only!=='on' || !Array.isArray(metadata.tables)) throw Error('Unsupported or non-read-only metadata export');
 const issues=[];
 if(history===null) issues.push('migration-history-missing');
 else if(!Array.isArray(history)) throw Error('Invalid migration history');
 const completed=[];
 for(const row of history||[]) {
  if(typeof row.migration_name!=='string'||typeof row.checksum!=='string') throw Error('Invalid migration metadata row');
  if(row.rolled_back_at) continue; // Retain failed attempts in input; rolled-back rows are not applied.
  if(!row.finished_at) {issues.push('unfinished:'+row.migration_name);continue;}
  const known=expected.find(e=>e.name===row.migration_name);
  if(!known) issues.push('unknown:'+row.migration_name);
  else if(known.checksum!==row.checksum) issues.push('checksum-mismatch:'+row.migration_name);
  if(completed.includes(row.migration_name)) issues.push('duplicate-completion:'+row.migration_name);
  completed.push(row.migration_name);
 }
 if(Array.isArray(history) && completed.length===0 && metadata.tables.some(t=>t!=="_prisma_migrations")) issues.push("untracked-existing-tables");
 const applied=new Set(completed);
 const pending=expected.filter(e=>!applied.has(e.name)).map(e=>e.name);
 let gap=false;
 for(const e of expected) {if(!applied.has(e.name))gap=true;else if(gap)issues.push('non-prefix-history:'+e.name);}
 return {metadataOnly:true,migrationExecutionApproved:false,status:issues.length?'REQUIRES_REVIEW':'HISTORY_PREFIX_MATCHES',issues,appliedCount:completed.length,pending,
  requiredNextSteps:['Compare schema contracts and constraints; metadata presence is not full equivalence.','Evaluate populated-data reconciliation guards on an authorized sanitized copy.','Verify backup restore and rollback before any production migration.']};
}
if(require.main===module) {
 try {
  const lines=fs.readFileSync(process.argv[2],'utf8').split('\n').filter(l=>l.trim().startsWith('{')).map(l=>JSON.parse(l));
  if(lines.length!==2 || !Object.hasOwn(lines[1],'migration_history')) throw Error('Expected two metadata JSON records');
  const result=assess(lines[0],lines[1].migration_history,expectedMigrations(path.join(__dirname,'../prisma/migrations')));
  console.log(JSON.stringify(result,null,2));process.exitCode=result.issues.length?2:0;
 } catch {console.error('Baseline comparison failed: expected a valid metadata-only export file.');process.exitCode=1;}
}
module.exports={assess,expectedMigrations};
