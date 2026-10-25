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

test('soft-keyboard Return and its form-submit follow-up add once without navigation',()=>{
  const input=new EventTarget(), form=new EventTarget();let submitted=0;
  const cleanup=bindTaskEntry(input,()=>submitted++,form);
  const softReturn=event('beforeinput',{inputType:'insertParagraph'});
  input.dispatchEvent(softReturn);
  assert.equal(softReturn.defaultPrevented,true);
  assert.equal(submitted,1);
  const submit=event('submit');form.dispatchEvent(submit);
  assert.equal(submit.defaultPrevented,true);
  assert.equal(submitted,1);
  input.dispatchEvent(event('input'));
  form.dispatchEvent(event('submit'));
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
  input.dispatchEvent(event('keydown',{key:'Unidentified',keyCode:229}));
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


test('Quest action key works repeatedly when the keyboard never sends keyup',()=>{
  const input=new EventTarget(); let count=0;
  const cleanup=bindTaskEntry(input,()=>count++);
  input.dispatchEvent(event('keydown',{key:'Enter'}));
  input.dispatchEvent(event('keydown',{key:'Enter',repeat:true}));
  input.dispatchEvent(event('input'));
  input.dispatchEvent(event('keydown',{key:'Enter'}));
  input.dispatchEvent(event('keydown',{key:'Enter'}));
  assert.equal(count,3); cleanup();
});

test('Return, keyup-only action, Android explicit Enter and legacy keycode paths submit',()=>{
  for(const properties of [{key:'Return'},{code:'NumpadEnter'},{key:'Enter',keyCode:229},{key:'Unidentified',keyCode:13}]) {
    const input=new EventTarget(); let count=0;
    const cleanup=bindTaskEntry(input,()=>count++);
    input.dispatchEvent(event('keyup',properties));
    assert.equal(count,1);
    input.dispatchEvent(event('keydown',properties));
    input.dispatchEvent(event('keyup',properties));
    assert.equal(count,2); cleanup();
  }
});

test('native form action adds successive drafts while typing alone never submits',()=>{
  const input=new EventTarget(), form=new EventTarget(); let count=0;
  const cleanup=bindTaskEntry(input,()=>count++,form);
  for(let draft=0; draft<3; draft++) {
    input.dispatchEvent(event('beforeinput',{inputType:'insertText'}));
    input.dispatchEvent(event('input'));
    assert.equal(count,draft);
    const submit=event('submit'); form.dispatchEvent(submit);
    assert.equal(submit.defaultPrevented,true);
    form.dispatchEvent(event('submit'));
    assert.equal(count,draft+1);
  }
  cleanup();
});
