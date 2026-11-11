import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { syncUrl } from '../lib/local-config.mjs';

test('환경변수 없이 기기 토큰으로만 원격 저장하며 미연결·폐기·장애를 처리한다', async () => {
  const originalCwd=process.cwd();
  const sandbox=await mkdtemp(path.join(tmpdir(),'proving-local-test-'));
  const originalFetch=globalThis.fetch;
  process.chdir(sandbox);
  try {
    const { remoteStudyStore:store }=await import('../lib/sync/remote-store.ts');
    await assert.rejects(store.load(),error=>error.status===401&&error.message.includes('npm run link'));
    await mkdir('.local');
    await writeFile('.local/sync.json',JSON.stringify({token:'test-device-token'}));
    const workspace={notebooks:[],closedIds:[],records:[]};
    globalThis.fetch=async(url,init)=>{
      assert.equal(String(url),`${syncUrl}/api/sync`);
      assert.equal(init.headers.Authorization,'Bearer test-device-token');
      assert.equal(init.headers.Cookie,undefined);
      if(init.method==='POST')assert.deepEqual(JSON.parse(init.body),{action:'discard',id:'example'});
      return Response.json(workspace);
    };
    assert.deepEqual(await store.load(),workspace);
    await store.apply({accountKey:'local-account'},{action:'discard',id:'example'});
    globalThis.fetch=async()=>Response.json({error:'revoked'},{status:401});
    await assert.rejects(store.load(),error=>error.status===401&&error.message.includes('해제'));
    globalThis.fetch=async()=>{throw new Error('offline');};
    await assert.rejects(store.load(),error=>error.status===503);
  } finally {
    globalThis.fetch=originalFetch;
    process.chdir(originalCwd);
    await rm(sandbox,{recursive:true,force:true});
  }
});
