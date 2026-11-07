import { Group, Mesh, InstancedMesh, MeshBasicMaterial, CylinderGeometry, SphereGeometry,
  BoxGeometry, Object3D, Vector3, Color, DoubleSide } from 'three';

export const KELP_BOTTOM=-0.72;
export const KELP_TOP=0.87;
export const KELP_FINALE_SECONDS=4.45;
const up=new Vector3(0,1,0);

/** Task-count sections and fixed reusable sea creatures; no storage or browser/XR dependencies. */
export class KelpForest {
  readonly root=new Group();
  readonly jellyfish:Group[]=[];
  readonly bells:Mesh[]=[];
  readonly tentacles:Mesh[][]=[];
  readonly backdrop=new Mesh(new BoxGeometry(1.1,1.98,0.01),new MeshBasicMaterial({color:0x0a465a}));
  stems:InstancedMesh;
  leaves:InstancedMesh;
  private readonly stemGeometry=new CylinderGeometry(1,1,1,6);
  private readonly leafGeometry=new SphereGeometry(1,10,6);
  private readonly stemMaterial=new MeshBasicMaterial({color:0x548e41});
  private readonly leafMaterial=new MeshBasicMaterial({color:0x80b64f});
  private readonly scratch=new Object3D();
  private capacity=10;
  private count=0;
  private ratio=0;
  private phase=0;
  private elapsed=-1;
  get finaleActive():boolean {return this.elapsed>=0;}
  private opened=false;
  private bend=0;
  private aspect=1;

  constructor() {
    this.root.name='Coral Reef / Kelp Forest';this.root.pointerEvents='none';
    this.backdrop.name='Underwater backdrop';this.backdrop.position.set(0,0.1,-0.16);this.root.add(this.backdrop);
    this.stems=this.instances(this.stemGeometry,this.stemMaterial,20,'Two kelp stems');
    this.leaves=this.instances(this.leafGeometry,this.leafMaterial,80,'Leafy task sections');
    this.root.add(this.stems,this.leaves);
    const bellGeometry=new SphereGeometry(1,24,16,0,Math.PI*2,0,Math.PI/2);
    const tendrilGeometry=new CylinderGeometry(0.0018,0.0008,1,5);
    const colors=[0xf49bc1,0x9bdce8,0xe3b5ff,0xffc98b,0xa4e6ce];
    for(let i=0;i<5;i++) {
      const jelly=new Group();jelly.name='Colorful rising jellyfish';jelly.visible=false;
      const material=new MeshBasicMaterial({color:colors[i],transparent:true,opacity:0.85,side:DoubleSide,depthWrite:false});
      const bell=new Mesh(bellGeometry,material);bell.name='Pulsing jellyfish bell';bell.scale.set(0.045,0.04,0.026);jelly.add(bell);this.bells.push(bell);
      const strands:Mesh[]=[];
      for(let j=0;j<5;j++) {
        const strand=new Mesh(tendrilGeometry,material);strand.name='Undulating jellyfish tentacle';
        strands.push(strand);jelly.add(strand);
      }
      this.tentacles.push(strands);this.jellyfish.push(jelly);this.root.add(jelly);
    }
    this.setProgress(0);this.update(0,false);
  }
  private instances(geometry:Mesh['geometry'],material:MeshBasicMaterial,count:number,name:string):InstancedMesh {
    const mesh=new InstancedMesh(geometry,material,count);mesh.name=name;mesh.frustumCulled=false;return mesh;
  }
  setTaskCount(count:number):void {
    const next=Math.max(0,Math.floor(count));if(next===this.count)return;
    this.count=next;
    if(next>this.capacity) {
      this.capacity=next;
      for(const mesh of [this.stems,this.leaves]){mesh.removeFromParent();mesh.dispose();}
      this.stems=this.instances(this.stemGeometry,this.stemMaterial,next*2,'Two kelp stems');
      this.leaves=this.instances(this.leafGeometry,this.leafMaterial,next*8,'Leafy task sections');
      this.root.add(this.stems,this.leaves);
    }
    this.drawFronds();
  }
  setProgress(ratio:number):void {
    this.ratio=this.count?Math.max(0,Math.min(1,ratio)):0;
    if(this.ratio<1 && (this.elapsed>=0 || this.opened))this.cancel();
    this.drawFronds();
  }
  fit(scaleX:number,scaleY:number):void {
    this.aspect=scaleY/Math.max(0.0001,scaleX);
    for(const jelly of this.jellyfish)jelly.scale.set(this.aspect,1,1);
  }
  point(t:number,side:number):Vector3 {
    return new Vector3(side*(0.43+this.bend*0.035*t*t*t)+Math.sin(t*6+this.phase*0.8)*0.009*t,
      KELP_BOTTOM+(KELP_TOP-KELP_BOTTOM)*t,0.03);
  }
  private drawFronds():void {
    this.stems.count=this.count*2;this.leaves.count=this.count*8;
    if(!this.count)return;
    for(let section=0;section<this.count;section++) {
      const growth=Math.max(0,Math.min(1,this.ratio*this.count-section));
      for(let edge=0;edge<2;edge++) {
        const side=edge?1:-1;
        const a=this.point(section/this.count,side),b=this.point((section+growth)/this.count,side);
        this.scratch.position.copy(a).add(b).multiplyScalar(0.5);
        this.scratch.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());
        this.scratch.scale.set(0.006*growth,a.distanceTo(b),0.006*growth);this.scratch.updateMatrix();
        this.stems.setMatrixAt(section*2+edge,this.scratch.matrix);
        for(let leaf=0;leaf<4;leaf++) {
          const point=this.point((section+(leaf+1)/5*growth)/this.count,side);
          const facing=leaf%2?1:-1;
          this.scratch.position.copy(point);this.scratch.position.x+=facing*0.012*growth*this.aspect;
          this.scratch.rotation.set(0,0,-facing*0.65+Math.sin(this.phase+section)*0.05);
          const length=Math.min(0.045,0.55/this.count);
          this.scratch.scale.set(0.012*growth*this.aspect,length*growth,0.004*growth);this.scratch.updateMatrix();
          const index=section*8+edge*4+leaf;this.leaves.setMatrixAt(index,this.scratch.matrix);
          this.leaves.setColorAt(index,new Color(leaf%2?0x8fbd55:0x609f47));
        }
      }
    }
    this.stems.instanceMatrix.needsUpdate=this.leaves.instanceMatrix.needsUpdate=true;
    if(this.leaves.instanceColor)this.leaves.instanceColor.needsUpdate=true;
  }
  celebrate(motion:boolean):void {
    if(!this.count || this.ratio<1)return;
    this.elapsed=motion?0:KELP_FINALE_SECONDS;this.opened=false;this.update(0,motion);
  }
  cancel():void {
    this.elapsed=-1;this.opened=false;this.bend=0;
    for(const jelly of this.jellyfish)jelly.visible=false;
  }
  update(delta:number,motion:boolean):void {
    const step=Math.min(Math.max(delta,0),1/30);
    if(motion)this.phase+=step;
    if(this.elapsed>=0) {
      this.elapsed=motion?Math.min(KELP_FINALE_SECONDS,this.elapsed+step):KELP_FINALE_SECONDS;
      this.bend=Math.min(1,this.elapsed/0.55);
      const rise=Math.min(1,this.elapsed/2.4);
      this.jellyfish.forEach((jelly,i)=>{
        jelly.visible=true;
        const pulse=motion?Math.sin(this.elapsed*5-i):0;
        jelly.position.set((i-2)*0.125,0.76+rise*0.19+(i%2)*0.035,0.035);
        this.bells[i].scale.set(0.045*(1+pulse*0.12),0.04*(1-pulse*0.14),0.026);
        this.tentacles[i].forEach((strand,j)=>{
          const length=0.06+(j%3)*0.009;
          strand.position.set((j-2)*0.014+(motion?Math.sin(this.elapsed*4+j+i)*0.006:0),-length/2,0);
          strand.rotation.z=motion?Math.sin(this.elapsed*4+j+i)*0.16:0;
          strand.scale.y=length;
        });
      });
      if(this.elapsed>=KELP_FINALE_SECONDS){this.elapsed=-1;this.opened=true;}
    }
    this.drawFronds();
  }
}
