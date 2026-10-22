import test from 'node:test';
import assert from 'node:assert/strict';
import { watchLocalStorage } from './local-sync.ts';
test('local storage watcher filters origins/keys and removes every listener on cleanup',()=>{
  const host=new EventTarget();const document=new EventTarget();const localStorage={};
  Object.assign(document,{visibilityState:'visible'});Object.assign(host,{document,localStorage});
  const events:string[]=[];const cleanup=watchLocalStorage(host as unknown as Window,['spatial'],reason=>events.push(reason));
  const fire=(key:string|null,storageArea:object)=>{const event=new Event('storage');Object.assign(event,{key,storageArea});host.dispatchEvent(event);};
  fire('other',localStorage);fire('spatial',{});assert.deepEqual(events,[]);
  fire('spatial',localStorage);fire(null,localStorage);host.dispatchEvent(new Event('pageshow'));document.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(events,['storage','storage','resume','resume']);
  cleanup();fire('spatial',localStorage);host.dispatchEvent(new Event('pageshow'));document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(events.length,4);
});
