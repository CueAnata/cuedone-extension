/** Prototype-local boundary: native XRSession and renderer stay untouched. */
export function isTrackedHand(source: XRInputSource, frame: XRFrame | null, space: XRReferenceSpace | null): boolean {
  if(!source.hand || (source.handedness!=='left' && source.handedness!=='right') || !frame || !space)return false;
  const tip=source.hand.get('index-finger-tip');
  if(!tip || !frame.getJointPose)return false;
  try {return !!frame.getJointPose(tip,space) && !!frame.getPose(source.targetRaySpace,space);}
  catch{return false;}
}

interface XRManagerPort {
  getSession(): XRSession | null;
  getFrame(): XRFrame | null;
  getReferenceSpace(): XRReferenceSpace | null;
}

/** Stable session facades preserve native method receivers and event subscription identity. */
export function handsOnlyManager<T extends XRManagerPort>(manager:T):T {
  const sessions=new WeakMap<XRSession,XRSession>();
  function sessionView(session:XRSession):XRSession {
    let view=sessions.get(session);
    if(view)return view;
    const methods=new Map<PropertyKey,unknown>();
    view=new Proxy(session,{
      get(target,key){
        if(key==='inputSources' || key==='trackedSources') {
          const sources=Reflect.get(target,key,target) as Iterable<XRInputSource> | undefined;
          if(!sources)return key==='trackedSources'?undefined:[];
          return Array.from(sources).filter(source=>isTrackedHand(source,manager.getFrame(),manager.getReferenceSpace()));
        }
        const value=Reflect.get(target,key,target);
        if(typeof value!=='function')return value;
        if(!methods.has(key))methods.set(key,value.bind(target));
        return methods.get(key);
      },
    });
    sessions.set(session,view);return view;
  }
  const methods=new Map<PropertyKey,unknown>();
  return new Proxy(manager,{
    get(target,key){
      if(key==='getSession')return ()=>{const session=target.getSession();return session?sessionView(session):null;};
      const value=Reflect.get(target,key,target);
      if(typeof value!=='function')return value;
      if(!methods.has(key))methods.set(key,value.bind(target));
      return methods.get(key);
    },
  });
}

interface InputPort<T extends XRManagerPort> {
  update(manager:T,delta:number,time:number):void;
  visualAdapters: {controller: Record<'left'|'right',{toggleVisual(enabled:boolean):void}>};
}

export function installHandsOnlyInput<T extends XRManagerPort>(input:InputPort<T>):()=>void {
  const original=input.update;
  const managers=new WeakMap<T,T>();
  for(const side of ['left','right'] as const)input.visualAdapters.controller[side].toggleVisual(false);
  input.update=function(manager,delta,time){
    let filtered=managers.get(manager);
    if(!filtered){filtered=handsOnlyManager(manager);managers.set(manager,filtered);}
    original.call(input,filtered,delta,time);
  };
  return ()=>{input.update=original;};
}

/** Dev-only IWER API. Never touches native Quest or a browser's global WebXR objects. */
export function useEmulatedHands(device: {
  primaryInputMode:'controller'|'hand';
  controllers:Partial<Record<'left'|'right',{connected:boolean}>>;
} | undefined):void {
  if(!device)return;
  device.primaryInputMode='hand';
  for(const controller of Object.values(device.controllers))if(controller)controller.connected=false;
}
