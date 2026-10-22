import { EventDispatcher, Group, Points, BufferGeometry, Float32BufferAttribute,
  PointsMaterial, Vector3, CubicBezierCurve3 } from 'three';
import { isFinalCompletion, type SpatialTask } from './garden-progress.ts';

export const DOME_STARS=32;
const PARTICLES=12,MAX_STREAMS=32;
export function starCoordinate(index:number):Vector3 {
  const i=((index%DOME_STARS)+DOME_STARS)%DOME_STARS;
  const angle=(i+0.5)*2.399963;
  const y=0.2+(i%8)*0.12;
  return new Vector3(Math.cos(angle)*1.15,y,-1.25-Math.sin(angle)*0.35);
}
interface Stream {curve:CubicBezierCurve3;target:Vector3;elapsed:number;}
/** Completion events are distinct from hydration: only newly saved checks emit. */
export class ConstellationActivation extends EventDispatcher<{
  activate:{taskId:string;index:number};aligned:{position:Vector3};finale:{position:Vector3};
}> {
  readonly root=new Group();
  readonly stars=new Points(new BufferGeometry(),new PointsMaterial({size:.035,color:0xffdc9c}));
  readonly particles=new Points(new BufferGeometry(),new PointsMaterial({size:.012,color:0xffc86b}));
  private tasks:SpatialTask[]=[];
  private streams:Stream[]=[];
  private finalePending=false;
  private readonly finalePosition=new Vector3();
  private readonly positions=new Float32Array(MAX_STREAMS*PARTICLES*3);
  private readonly source:(index:number,total:number)=>Vector3;
  constructor(source:(index:number,total:number)=>Vector3){
    super();this.source=source;this.root.name='Completion constellation dome';
    this.root.pointerEvents='none';this.particles.frustumCulled=false;
    this.particles.geometry.setAttribute('position',new Float32BufferAttribute(this.positions,3));
    this.root.add(this.stars,this.particles);this.cancel();
    this.addEventListener('activate',event=>{
      if(this.streams.length>=MAX_STREAMS)return;
      const start=this.source(event.index,this.tasks.length),target=starCoordinate(event.index);
      this.streams.push({curve:new CubicBezierCurve3(start,start.clone().add(new Vector3(0,.35,-.2)),
        target.clone().add(new Vector3(0,-.2,.2)),target),target,elapsed:0});
    });
  }
  bind(tasks:readonly SpatialTask[],feedback:boolean):void {
    const before=this.tasks;
    if(JSON.stringify(before)===JSON.stringify(tasks))return;
    this.tasks=tasks.map(t=>({...t}));
    // Edits, resets, removals and list replacement invalidate pending streams.
    const forward=before.length===tasks.length && before.every((t,i)=>t.id===tasks[i].id && (!t.completed||tasks[i].completed));
    if(!feedback||!forward)this.cancel();
    this.finalePending=feedback && isFinalCompletion(before,tasks);
    if(this.finalePending){
      const last=tasks.reduce((index,t,i)=>t.completed&&!before[i]?.completed?i:index,0);
      this.finalePosition.copy(starCoordinate(last));
    }
    const stars=tasks.flatMap((t,i)=>t.completed?starCoordinate(i).toArray():[]);
    const old=this.stars.geometry;
    this.stars.geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute(stars,3));old.dispose();
    if(feedback&&forward)tasks.forEach((t,i)=>{
      if(t.completed&&!before[i].completed)this.dispatchEvent({type:'activate',taskId:t.id,index:i});
    });
  }
  tick(delta:number,motion:boolean):void {
    if(!motion){
      const finale=this.finalePending;this.cancel();
      if(finale)this.dispatchEvent({type:'finale',position:this.finalePosition.clone()});
      return;
    }
    let count=0;
    for(const stream of this.streams){
      stream.elapsed+=Math.min(Math.max(delta,0),1/30);
      const t=stream.elapsed/.9;
      if(t>=1){this.dispatchEvent({type:'aligned',position:stream.target.clone()});continue;}
      for(let i=0;i<PARTICLES;i++){
        const p=stream.curve.getPoint(Math.max(0,t-i*.012));
        this.positions.set(p.toArray(),count++*3);
      }
    }
    this.streams=this.streams.filter(s=>s.elapsed<.9);
    if(this.finalePending && this.streams.length===0){
      this.finalePending=false;
      this.dispatchEvent({type:'finale',position:this.finalePosition.clone()});
    }
    // Float32BufferAttribute owns a copy: update its buffer, not the staging array.
    const attribute=this.particles.geometry.getAttribute('position');
    (attribute.array as Float32Array).set(this.positions);attribute.needsUpdate=true;
    this.particles.geometry.setDrawRange(0,count);
  }
  cancel():void {this.finalePending=false;this.streams=[];this.particles.geometry.setDrawRange(0,0);}
  dispose():void {this.cancel();for(const p of [this.stars,this.particles]){p.geometry.dispose();p.material.dispose();}this.root.removeFromParent();}
}
