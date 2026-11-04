/** Keeps the browser's DOM footprint and viewport position through an immersive handoff. */
export class BrowserPanelLayout {
  private readonly inlineStyle:string|null;
  private readonly position:{left:number;top:number};
  private readonly scroll:Array<{element:Element;top:number;left:number}>;
  private readonly spacer:HTMLElement;
  private restored=false;
  private readonly root:HTMLElement;
  private readonly view:Window;
  pinned=true;
  constructor(root:HTMLElement, elements:readonly Element[], view:Window=window) {
    this.root=root;this.view=view;
    this.inlineStyle=root.getAttribute('style');
    const rect=root.getBoundingClientRect();
    this.position={left:rect.left,top:rect.top};
    this.scroll=[...new Set(elements)].map(element=>({element,top:element.scrollTop,left:element.scrollLeft}));
    this.spacer=root.ownerDocument.createElement('div');
    this.spacer.setAttribute('aria-hidden','true');
    Object.assign(this.spacer.style,{width:`${rect.width}px`,height:`${rect.height}px`,
      flex:'0 0 auto',margin:view.getComputedStyle(root).margin,visibility:'hidden',pointerEvents:'none'});
    root.before(this.spacer);
    root.style.width=root.style.minWidth=root.style.maxWidth=`${rect.width}px`;
    root.style.height=root.style.minHeight=root.style.maxHeight=`${rect.height}px`;
    root.style.position='absolute';root.style.margin='0';
    root.style.left=`${rect.left+view.scrollX}px`;root.style.top=`${rect.top+view.scrollY}px`;
  }
  /** Release only after native XR/renderer teardown, or immediately when entry fails. */
  release():void {
    if(!this.pinned)return;
    if(this.inlineStyle===null)this.root.removeAttribute('style');
    else this.root.setAttribute('style',this.inlineStyle);
    this.spacer.remove();this.pinned=false;
  }
  /** Run AFTER the browser presentation is rendered. Never consume coordinates while still pinned. */
  restore():boolean {
    if(this.pinned || this.restored)return false;
    for(const {element,top,left} of this.scroll){element.scrollTop=top;element.scrollLeft=left;}
    const rect=this.root.getBoundingClientRect(),style=this.view.getComputedStyle(this.root);
    const dx=this.position.left-rect.left,dy=this.position.top-rect.top;
    if(dx)this.root.style.left=`${(parseFloat(style.left)||0)+dx}px`;
    if(dy)this.root.style.top=`${(parseFloat(style.top)||0)+dy}px`;
    this.restored=true;return true;
  }
}
