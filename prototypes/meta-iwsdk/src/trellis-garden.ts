import { bezierVine, VineGrowthController } from './vine-growth.ts';
import { Group, Mesh, MeshBasicMaterial, InstancedMesh, CylinderGeometry, SphereGeometry,
  TubeGeometry, Vector3, Object3D, DoubleSide, Color } from 'three';

import { enableInstancedContact, enableVineContact } from './hand-contact.ts';

export const VINE_SEGMENTS = 120;
export const BUTTERFLY_COUNT = 12;
const radial = 5;

/** Fixed-budget garden: batched wood/flowers/leaves and two reusable vine tubes. */
export class TrellisGarden {
  readonly root = new Group();
  readonly growthControllers: VineGrowthController[] = [];
  readonly vines: Mesh<TubeGeometry,MeshBasicMaterial>[] = [];
  readonly wings: InstancedMesh<SphereGeometry,MeshBasicMaterial>;
  readonly bodies: InstancedMesh<SphereGeometry,MeshBasicMaterial>;
  private readonly petals: InstancedMesh;
  private readonly centers: InstancedMesh;
  private readonly leaves: InstancedMesh;
  private readonly scratch = new Object3D();
  private elapsed = -1;
  private feedbackRemaining = 0;
  readonly feedback = new Mesh(new SphereGeometry(0.025,10,6),
    new MeshBasicMaterial({color:0xffc86b,transparent:true,opacity:0.75,depthWrite:false}));
  private finalePending = false;
  private ratio = -1;
  private static readonly halfWidth = 0.48;
  private static readonly halfHeight = 0.79;

  constructor() {
    this.root.name = 'Living Trellis Garden';
    this.feedback.name='Hand contact feedback';
    this.feedback.pointerEvents='none';this.feedback.visible=false;
    this.root.add(this.feedback);
    const wood = new InstancedMesh(new CylinderGeometry(1,1,1,6),
      new MeshBasicMaterial({color:0x805538}),36);
    wood.name = 'Rectangular wooden lattice';
    const rods: Array<[number,number,number,number,number]> = [
      [-0.48,-0.79,-0.48,0.79,0.022], [0.48,-0.79,0.48,0.79,0.022],
      [-0.5,-0.79,0.5,-0.79,0.022], [-0.5,0.79,0.5,0.79,0.022],
    ];
    // Two diagonal families clipped to the rectangular frame.
    for (const slope of [-1.6,1.6]) {
      for (let intercept=-1.5;intercept<=1.51;intercept+=0.12) {
        const points: Array<[number,number]> = [];
        for (const x of [-0.48,0.48]) {
          const y=slope*x+intercept;
          if(y>=-0.79 && y<=0.79) points.push([x,y]);
        }
        for (const y of [-0.79,0.79]) {
          const x=(y-intercept)/slope;
          if(x> -0.48 && x<0.48) points.push([x,y]);
        }
        if(points.length===2) rods.push([...points[0],...points[1],0.0045]);
      }
    }
    rods.forEach(([ax,ay,bx,by,r],i) => {
      this.scratch.position.set((ax+bx)/2,(ay+by)/2,-0.045);
      this.scratch.quaternion.setFromUnitVectors(new Vector3(0,1,0),new Vector3(bx-ax,by-ay,0).normalize());
      this.scratch.scale.set(r,Math.hypot(bx-ax,by-ay),r);
      this.scratch.updateMatrix(); wood.setMatrixAt(i,this.scratch.matrix);
    });
    wood.count=rods.length;
    enableInstancedContact(wood);
    this.root.add(wood);
    for(const side of [-1,1]) {
      const path=bezierVine(t=>this.vinePoint(t,side));
      const vine=new Mesh(new TubeGeometry(path,VINE_SEGMENTS,0.014,radial,false),
        new MeshBasicMaterial({color:0x2e7d32}));
      this.growthControllers.push(new VineGrowthController(vine));
      enableVineContact(vine);
      vine.name=side<0?'Left flowering vine':'Right flowering vine';
      vine.geometry.setDrawRange(0,0);this.vines.push(vine);this.root.add(vine);
    }
    const geometry=new SphereGeometry(1,8,5);
    this.petals=new InstancedMesh(geometry,new MeshBasicMaterial({color:0xc62828}),120);
    this.centers=new InstancedMesh(geometry,new MeshBasicMaterial({color:0xffca28}),24);
    this.leaves=new InstancedMesh(geometry,new MeshBasicMaterial({color:0x2e7d32}),48);
    for(const mesh of [this.petals,this.centers,this.leaves])enableInstancedContact(mesh);
    this.petals.name='Vine flowers';this.leaves.name='Vine leaves';
    this.root.add(this.petals,this.centers,this.leaves);
    this.wings=new InstancedMesh(geometry,new MeshBasicMaterial({color:0xffffff,side:DoubleSide,transparent:true}),BUTTERFLY_COUNT*2);
    this.bodies=new InstancedMesh(geometry,new MeshBasicMaterial({color:0x4c3829,transparent:true}),BUTTERFLY_COUNT);
    this.wings.name='Completion butterflies';
    this.wings.pointerEvents=this.bodies.pointerEvents='none';
    const colors=[0xffc869,0xf2a2a0,0xe9ddba,0x9dc6c0];
    for(let i=0;i<BUTTERFLY_COUNT*2;i++)this.wings.setColorAt(i,new Color(colors[Math.floor(i/2)%colors.length]));
    this.wings.visible=this.bodies.visible=false;
    // Flight spans outside the original geometry bounds. Avoid stale instance bounds.
    this.wings.frustumCulled=this.bodies.frustumCulled=false;
    this.root.add(this.wings,this.bodies);
    this.setProgress(0);
  }

  vinePoint(t:number,side:number):Vector3 {
    const join=Math.max(0,(t-0.78)/0.22);
    const smooth=join*join*(3-2*join);
    // Anchor on inside edge of 15% lattice closest to task list, then meet at top center
    const innerX = TrellisGarden.halfWidth - 0.144;
    const x=side*(innerX*(1-smooth))+Math.sin(t*Math.PI*16)*0.016;
    const y=-TrellisGarden.halfHeight+t*(2*TrellisGarden.halfHeight);
    const z=0.025+side*Math.cos(t*Math.PI*16)*0.016*(1-smooth);
    return new Vector3(x,y,z);
  }

  /** Size to the actual UIKit board, leaving the lattice visible on each edge. */
  fit(width:number,height:number):void {
    this.root.scale.set((width+0.15)/0.96,(height+0.18)/1.58,1);
  }

  setProgress(ratio:number):void {
    const next=Math.max(0,Math.min(1,ratio));
    if(next===this.ratio)return;
    this.ratio=next;
    this.growthControllers.forEach(controller=>controller.setProgress(this.ratio));
    for(let i=0;i<24;i++) {
      const t=(Math.floor(i/2)+1)/12;
      const point=this.vinePoint(t,i%2===0?-1:1);
      const growth=Math.max(0,Math.min(1,(this.ratio-t+0.045)/0.045));
      for(let petal=0;petal<5;petal++) {
        const angle=petal*Math.PI*2/5;
        this.scratch.position.set(point.x+Math.cos(angle)*0.022*growth,point.y+Math.sin(angle)*0.022*growth,point.z+0.012);
        this.scratch.rotation.set(0,0,angle);this.scratch.scale.set(0.026*growth,0.014*growth,0.007*growth);
        this.scratch.updateMatrix();this.petals.setMatrixAt(i*5+petal,this.scratch.matrix);
      }
      this.scratch.position.copy(point);this.scratch.position.z+=0.023;
      this.scratch.rotation.set(0,0,0);this.scratch.scale.setScalar(0.012*growth);
      this.scratch.updateMatrix();this.centers.setMatrixAt(i,this.scratch.matrix);
      for(let leaf=0;leaf<2;leaf++) {
        this.scratch.position.set(point.x+(leaf?1:-1)*0.022,point.y-0.05,point.z);
        this.scratch.rotation.z=leaf?0.5:-0.5;this.scratch.scale.set(0.016*growth,0.038*growth,0.005*growth);
        this.scratch.updateMatrix();this.leaves.setMatrixAt(i*2+leaf,this.scratch.matrix);
      }
    }
    this.petals.instanceMatrix.needsUpdate=this.centers.instanceMatrix.needsUpdate=this.leaves.instanceMatrix.needsUpdate=true;
    this.petals.frustumCulled=this.centers.frustumCulled=this.leaves.frustumCulled=false;
  }
  highlight(point:Vector3):void {
    this.feedback.position.copy(point);this.root.worldToLocal(this.feedback.position);
    this.feedbackRemaining=0.2;this.feedback.visible=true;
  }
  celebrate():void {this.finalePending=true;}
  cancel():void {
    this.finalePending=false;this.elapsed=-1;this.wings.visible=this.bodies.visible=false;
    this.feedbackRemaining=0;this.feedback.visible=false;
  }
  /** Returns true exactly once, once the growing vine tips have joined. */
  update(delta:number,motion:boolean):boolean {
    this.feedbackRemaining=Math.max(0,this.feedbackRemaining-Math.min(Math.max(delta,0),1/30));
    this.feedback.visible=this.feedbackRemaining>0;
    let joined=false;
    if(this.finalePending && this.ratio>=0.99999) {
      this.finalePending=false;joined=true;
      this.elapsed=motion?0:-1;
    }
    if(!motion){this.elapsed=-1;this.wings.visible=this.bodies.visible=false;return joined;}
    if(this.elapsed<0)return joined;
    this.elapsed+=Math.min(Math.max(delta,0),1/30);
    const t=this.elapsed/2;
    if(t>=1){this.cancel();return joined;}
    this.wings.visible=this.bodies.visible=true;
    this.wings.material.opacity=this.bodies.material.opacity=1-Math.max(0,(t-0.65)/0.35);
    for(let i=0;i<BUTTERFLY_COUNT;i++) {
      const angle=i*Math.PI*2/BUTTERFLY_COUNT;
      const x=Math.cos(angle)*t*0.85;
      const y=0.79+t*(0.15+(i%4)*0.08)+Math.sin(t*5+i)*0.025;
      const z=0.03+Math.sin(angle)*t*0.55;
      const flap=Math.sin(this.elapsed*22+i)*0.9;
      this.scratch.position.set(x,y,z);this.scratch.rotation.set(0,angle,0);
      this.scratch.scale.set(0.007,0.027,0.007);this.scratch.updateMatrix();this.bodies.setMatrixAt(i,this.scratch.matrix);
      for(let wing=0;wing<2;wing++) {
        const side=wing?1:-1;
        this.scratch.position.set(x+side*0.026,y,z);
        this.scratch.rotation.set(0,side*flap,side*0.3);
        this.scratch.scale.set(0.034,0.045,0.006);this.scratch.updateMatrix();this.wings.setMatrixAt(i*2+wing,this.scratch.matrix);
      }
    }
    this.wings.instanceMatrix.needsUpdate=this.bodies.instanceMatrix.needsUpdate=true;
    return joined;
  }
  dispose():void {
    this.root.removeFromParent();
    const geometries=new Set<import('three').BufferGeometry>();
    const materials=new Set<import('three').Material>();
    this.root.traverse(object=>{if(object instanceof Mesh){geometries.add(object.geometry);
      (Array.isArray(object.material)?object.material:[object.material]).forEach(material=>materials.add(material));
      if(object instanceof InstancedMesh)object.dispose();}});
    geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
  }
}
