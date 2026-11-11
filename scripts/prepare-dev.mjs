import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

async function routes(directory,prefix='') {
  const result=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const name=`${prefix}${entry.name}`;
    if(entry.isDirectory())result.push(...await routes(path.join(directory,entry.name),`${name}/`));
    else if(entry.isFile()&&/^(page|layout|route)\.[cm]?[jt]sx?$/.test(entry.name))result.push(name);
  }
  return result.sort();
}
export async function prepareDev(root=process.cwd()) {
  const cache=path.join(root,'.next');
  const marker=path.join(cache,'proving-route-layout');
  const fingerprint=createHash('sha256').update(JSON.stringify(await routes(path.join(root,'app')))).digest('hex');
  let previous;try{previous=await readFile(marker,'utf8');}catch{}
  if(previous===fingerprint)return false;
  // Only generated Next cache is invalidated. Never touch .local credentials.
  await rm(cache,{recursive:true,force:true});
  await mkdir(cache,{recursive:true});await writeFile(marker,fingerprint);
  return true;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await prepareDev();
