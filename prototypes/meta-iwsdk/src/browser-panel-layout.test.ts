import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserPanelLayout } from './browser-panel-layout.ts';

function fixture(inline:string|null=null) {
  const initial:Record<string,string>=inline ? {left:'12px',top:'-4px',fontSize:'1.25rem'} : {};
  const style:Record<string,string>={...initial};
  const page={scrollTop:130,scrollLeft:20},body={scrollTop:25,scrollLeft:3},list={scrollTop:85,scrollLeft:6};
  const natural={left:90,top:180,width:460,height:670};
  const spacers:Array<{style:Record<string,string>;removed:boolean;hidden:boolean;setAttribute:(key:string,value:string)=>void;remove:()=>void}>=[];
  let attribute=inline;
  const root={style,scrollTop:18,scrollLeft:2,
    getAttribute:()=>attribute,
    setAttribute(_name:string,value:string){attribute=value;for(const key of Object.keys(style))delete style[key];Object.assign(style,initial);},
    removeAttribute(){attribute=null;for(const key of Object.keys(style))delete style[key];},
    getBoundingClientRect(){return {
      left:(style.position==='absolute'?0:natural.left)+(parseFloat(style.left)||0)-page.scrollLeft,
      top:(style.position==='absolute'?0:natural.top)+(parseFloat(style.top)||0)-page.scrollTop,
      width:parseFloat(style.width)||natural.width,height:parseFloat(style.height)||natural.height,
    };},
    ownerDocument:{createElement(){const spacer={style:{},removed:false,hidden:false,
      setAttribute(key:string,value:string){this.hidden=key==='aria-hidden' && value==='true';},remove(){this.removed=true;}};spacers.push(spacer);return spacer;}},
    before(){},
  };
  const view={get scrollX(){return page.scrollLeft;},get scrollY(){return page.scrollTop;},
    getComputedStyle(){return {margin:'8px 12px',left:style.left ?? 'auto',top:style.top ?? 'auto'};}};
  const capture=()=>new BrowserPanelLayout(root as unknown as HTMLElement,
    [page,root,body,list] as unknown as Element[],view as unknown as Window);
  return {root,style,natural,page,body,list,spacers,capture,get attribute(){return attribute;}};
}

test('captures viewport coordinates and scroll before native entry, preserving the DOM footprint',()=>{
  const f=fixture();const before=f.root.getBoundingClientRect();const layout=f.capture();
  assert.deepEqual(f.root.getBoundingClientRect(),before);
  assert.equal(f.style.position,'absolute');assert.equal(f.style.width,'460px');assert.equal(f.style.height,'670px');
  assert.equal(f.spacers.length,1);assert.equal(f.spacers[0].hidden,true);
  assert.equal(f.spacers[0].style.margin,'8px 12px');assert.equal(layout.pinned,true);
});
test('an early browser visibility event cannot consume the snapshot before XR layout releases',()=>{
  const f=fixture();const before=f.root.getBoundingClientRect();const layout=f.capture();
  f.page.scrollTop=0;f.page.scrollLeft=0;f.list.scrollTop=0;f.body.scrollTop=0;
  f.natural.left+=70;f.natural.top+=45;
  assert.equal(layout.restore(),false);assert.equal(layout.pinned,true);assert.equal(f.page.scrollTop,0);
  layout.release();assert.equal(f.spacers[0].removed,true);assert.equal(layout.pinned,false);
  assert.equal(layout.restore(),true);
  assert.deepEqual(f.root.getBoundingClientRect(),before);
  assert.equal(f.page.scrollTop,130);assert.equal(f.page.scrollLeft,20);
  assert.equal(f.list.scrollTop,85);assert.equal(f.list.scrollLeft,6);assert.equal(f.body.scrollTop,25);
});
test('failed entry restores authored inline styles and scroll; duplicate cleanup never moves the panel twice',()=>{
  const inline='left:12px;top:-4px;font-size:1.25rem';
  const f=fixture(inline);const before=f.root.getBoundingClientRect();const layout=f.capture();
  f.page.scrollTop=0;layout.release();layout.restore();
  assert.equal(f.attribute,inline);assert.equal(f.style.fontSize,'1.25rem');
  assert.deepEqual(f.root.getBoundingClientRect(),before);
  layout.release();assert.equal(layout.restore(),false);assert.deepEqual(f.root.getBoundingClientRect(),before);
});
test('repeated immersive cycles preserve coordinates without accumulating offsets or spacers',()=>{
  const f=fixture();const before=f.root.getBoundingClientRect();
  for(let i=0;i<3;i++) {
    const layout=f.capture();f.natural.left+=15;f.natural.top-=20;
    f.root.scrollTop=0;f.list.scrollTop=0;
    layout.release();layout.restore();
    assert.deepEqual(f.root.getBoundingClientRect(),before);
    assert.equal(f.root.scrollTop,18);assert.equal(f.list.scrollTop,85);
    assert.ok(f.spacers.every(spacer=>spacer.removed));
  }
});
