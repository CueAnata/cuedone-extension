import test from 'node:test';
import assert from 'node:assert/strict';
import { bindTaskEntry } from './task-entry.ts';

function event(type: string, properties: Record<string,unknown> = {}): Event {
  return Object.assign(new Event(type,{cancelable:true}),properties);
}

test('Enter prevents native submission, submits once, and accepts the next released key',()=>{
  const input=new EventTarget(), form=new EventTarget();let submitted=0;
  const cleanup=bindTaskEntry(input,()=>submitted++,form);
  const enter=event('keydown',{key:'Enter',repeat:false});
  input.dispatchEvent(enter);
  assert.equal(enter.defaultPrevented,true);
  assert.equal(submitted,1);
  input.dispatchEvent(event('keydown',{key:'Enter',repeat:true}));
  input.dispatchEvent(event('beforeinput',{inputType:'insertLineBreak'}));
  const implicit=event('submit');form.dispatchEvent(implicit);
  assert.equal(implicit.defaultPrevented,true);
  assert.equal(submitted,1);
  input.dispatchEvent(event('keyup',{key:'Enter'}));
  input.dispatchEvent(event('keydown',{key:'Enter'}));
  assert.equal(submitted,2);
  cleanup();
});

test('soft-keyboard Return works without keydown and a direct form submit never navigates',()=>{
  const input=new EventTarget(), form=new EventTarget();let submitted=0;
  const cleanup=bindTaskEntry(input,()=>submitted++,form);
  const softReturn=event('beforeinput',{inputType:'insertParagraph'});
  input.dispatchEvent(softReturn);
  assert.equal(softReturn.defaultPrevented,true);
  assert.equal(submitted,1);
  const submit=event('submit');form.dispatchEvent(submit);
  assert.equal(submit.defaultPrevented,true);
  assert.equal(submitted,2);
  cleanup();
});

test('IME composition Enter edits text instead of prematurely adding a task',()=>{
  const input=new EventTarget();let submitted=0;
  const cleanup=bindTaskEntry(input,()=>submitted++);
  input.dispatchEvent(event('compositionstart'));
  const ime=event('keydown',{key:'Enter'});input.dispatchEvent(ime);
  input.dispatchEvent(event('beforeinput',{inputType:'insertLineBreak'}));
  assert.equal(submitted,0);
  assert.equal(ime.defaultPrevented,false);
  input.dispatchEvent(event('compositionend'));
  input.dispatchEvent(event('keydown',{key:'Enter',keyCode:229}));
  assert.equal(submitted,0);
  input.dispatchEvent(event('keydown',{key:'Enter',isComposing:true}));
  assert.equal(submitted,0);
  input.dispatchEvent(event('keydown',{key:'Enter',isComposing:false}));
  assert.equal(submitted,1);
  cleanup();
});

test('ordinary typing stays native and cleanup removes every submit path',()=>{
  const input=new EventTarget(), form=new EventTarget();let submitted=0;
  const cleanup=bindTaskEntry(input,()=>submitted++,form);
  const typing=event('keydown',{key:'a'});input.dispatchEvent(typing);
  assert.equal(typing.defaultPrevented,false);
  input.dispatchEvent(event('beforeinput',{inputType:'insertText'}));
  assert.equal(submitted,0);
  cleanup();
  const enter=event('keydown',{key:'Enter'});input.dispatchEvent(enter);
  const submit=event('submit');form.dispatchEvent(submit);
  assert.equal(enter.defaultPrevented,false);
  assert.equal(submit.defaultPrevented,false);
  assert.equal(submitted,0);
});
