import { Group, Mesh, InstancedMesh, MeshBasicMaterial, BoxGeometry, SphereGeometry,
  CylinderGeometry, ConeGeometry, TorusGeometry, Object3D, Color } from 'three';

export const ROCKET_LEFT = -0.43;
export const ROCKET_BOTTOM = -0.64;
export const ROCKET_TOP = 0.91;
export const ROCKET_FINALE_SECONDS = 4.45;
export const rocketAltitude = (ratio:number):number =>
  ROCKET_BOTTOM + Math.max(0,Math.min(1,ratio))*(ROCKET_TOP-ROCKET_BOTTOM);

/** One local scene shared by browser and XR. Task persistence and completion events stay outside. */
export class SpaceRocket {
  readonly root=new Group();
  readonly rocket=new Group();
  readonly saucer=new Group();
  readonly heading=new Group();
  readonly trail=new Mesh(new CylinderGeometry(0.006,0.017,1,8),
    new MeshBasicMaterial({color:0x96dfff,transparent:true,opacity:0.6,depthWrite:false}));
  readonly flame=new Mesh(new ConeGeometry(0.018,0.07,10),new MeshBasicMaterial({color:0xffb750}));
  readonly stars:InstancedMesh;
  readonly backdrop=new Mesh(new BoxGeometry(1.1,1.98,0.01),new MeshBasicMaterial({color:0x080f2d}));
  private ratio=0;
  private elapsed=-1;
  private finished=false;
  private phase=0;
  private readonly planets:Group[]=[];

  constructor() {
    this.root.name='Space Rocket';this.root.pointerEvents='none';
    this.backdrop.name='Deep space backdrop';this.backdrop.position.set(0,0.1,-0.16);this.root.add(this.backdrop);
    this.stars=new InstancedMesh(new SphereGeometry(1,6,4),new MeshBasicMaterial({color:0xffffff}),96);
    this.stars.name='Distant stars';this.stars.frustumCulled=false;
    const scratch=new Object3D();
    for(let i=0;i<96;i++) {
      // Keep most stars in the side columns and the finale lane above the list.
      const side=i%2?-1:1;
      scratch.position.set(i<72?side*(0.36+((i*17)%31)/180):((i*37)%101)/100-0.5,
        i<72?-0.77+((i*29)%97)/97*1.8:0.73+(i%7)*0.043,-0.12);
      scratch.scale.setScalar(0.002+(i%4)*0.0008);scratch.updateMatrix();this.stars.setMatrixAt(i,scratch.matrix);
      this.stars.setColorAt(i,new Color([0xffffff,0xb5d1ff,0xffdfb6][i%3]));
    }
    this.root.add(this.stars);
    const ringed=new Group();ringed.position.set(0.45,0.32,-0.07);this.root.add(ringed);this.planets.push(ringed);
    const planet=this.mesh(ringed,'Distant violet planet',new SphereGeometry(0.047,20,12),0x9274c7,0,0,0);
    const ring=this.mesh(ringed,'Planet rings',new TorusGeometry(0.069,0.006,6,40),0xdab4e8,0,0,0.005);
    ring.rotation.x=1.05;ring.rotation.z=-0.3;
    const blue=new Group();blue.position.set(0.44,-0.44,-0.08);this.root.add(blue);this.planets.push(blue);
    this.mesh(blue,'Distant blue planet',new SphereGeometry(0.029,16,10),0x58a8d4,0,0,0);
    planet.name='Distant ringed planet';
    this.rocket.name='Upright climbing rocket';this.root.add(this.rocket);this.rocket.add(this.heading);
    this.mesh(this.heading,'Rocket body',new CylinderGeometry(0.025,0.027,0.105,16),0xf4f3ed,0,0,0);
    this.mesh(this.heading,'Rocket nose',new ConeGeometry(0.025,0.055,16),0xe16a52,0,0.08,0);
    this.mesh(this.heading,'Rocket window rim',new CylinderGeometry(0.017,0.017,0.006,16),0x42587c,0,0.015,0.025).rotation.x=Math.PI/2;
    this.mesh(this.heading,'Rocket window',new SphereGeometry(0.012,16,10),0x86e0f2,0,0.015,0.031).scale.z=0.3;
    for(const side of [-1,1]) {
      const fin=this.mesh(this.heading,'Rocket red fin',new ConeGeometry(0.021,0.065,3),0xd95055,side*0.028,-0.042,0);
      fin.rotation.z=-side*0.3;
    }
    this.flame.name='Rocket exhaust flame';this.flame.position.y=-0.093;this.flame.rotation.z=Math.PI;this.heading.add(this.flame);
    this.trail.name='Climbing contrail';this.trail.position.z=-0.025;this.root.add(this.trail);
    this.saucer.name='Alien flying saucer';this.root.add(this.saucer);
    this.mesh(this.saucer,'Saucer silver hull',new SphereGeometry(1,24,12),0xa5bedb,0,0,0).scale.set(0.075,0.018,0.035);
    this.mesh(this.saucer,'Alien cockpit',new SphereGeometry(1,20,12),0x407b93,0,0.023,0).scale.set(0.038,0.034,0.028);
    this.mesh(this.saucer,'Green alien pilot',new SphereGeometry(1,16,12),0x8de0a0,0,0.032,0.027).scale.set(0.02,0.023,0.01);
    for(const side of [-1,1])this.mesh(this.saucer,'Alien eye',new SphereGeometry(1,12,8),0x172137,side*0.008,0.035,0.038).scale.set(0.005,0.008,0.004);
    for(let i=0;i<5;i++)this.mesh(this.saucer,'Saucer running light',new SphereGeometry(0.004,8,6),0x9afaff,(i-2)*0.025,-0.006,0.033);
    this.setProgress(0);this.cancel();
  }
  private mesh(parent:Group,name:string,geometry:Mesh['geometry'],color:number,x:number,y:number,z:number):Mesh {
    const mesh=new Mesh(geometry,new MeshBasicMaterial({color}));mesh.name=name;mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  /** Counter panel stretching so the rocket and saucer keep their proportions in either surface. */
  fit(scaleX:number,scaleY:number):void {
    const aspect=scaleY/Math.max(0.0001,scaleX);
    for(const object of [this.rocket,this.saucer,...this.planets])object.scale.set(aspect,1,1);
  }
  setProgress(ratio:number):void {
    const next=Math.max(0,Math.min(1,ratio));
    if(next<1 && (this.elapsed>=0 || this.finished))this.cancel();
    this.ratio=next;
    if(this.elapsed<0 && !this.finished) {
      this.rocket.position.set(ROCKET_LEFT,rocketAltitude(next),0.03);this.heading.rotation.z=0;
    }
    const height=rocketAltitude(next)-ROCKET_BOTTOM;
    this.trail.visible=next>0 && this.elapsed<0 && !this.finished;
    this.trail.scale.set(1,height,1);
    this.trail.position.set(ROCKET_LEFT,ROCKET_BOTTOM+height/2-0.08,-0.025);
    this.flame.visible=next>0;
  }
  celebrate(motion:boolean):void {
    if(this.ratio<1)return;
    this.elapsed=motion?0:ROCKET_FINALE_SECONDS;
    this.finished=false;this.saucer.visible=true;this.trail.visible=false;
    this.update(0,motion);
  }
  cancel():void {
    this.elapsed=-1;this.finished=false;this.saucer.visible=false;
    this.heading.rotation.z=0;this.rocket.position.set(ROCKET_LEFT,rocketAltitude(this.ratio),0.03);
    this.setProgress(this.ratio);
  }
  update(delta:number,motion:boolean):void {
    const step=Math.min(Math.max(delta,0),1/30);
    if(motion)this.phase+=step;
    this.flame.scale.y=motion?0.9+Math.sin(this.phase*25)*0.1:1;
    if(this.elapsed<0)return;
    this.elapsed=motion?Math.min(ROCKET_FINALE_SECONDS,this.elapsed+step):ROCKET_FINALE_SECONDS;
    const turn=Math.min(1,this.elapsed/0.4);
    const flight=Math.max(0,(this.elapsed-0.4)/(ROCKET_FINALE_SECONDS-0.4));
    this.heading.rotation.z=-Math.PI/2*turn*turn*(3-2*turn);
    this.rocket.position.set(ROCKET_LEFT+flight*0.82,ROCKET_TOP,0.03);
    this.saucer.position.set(Math.max(-0.48,this.rocket.position.x-0.18),ROCKET_TOP-0.025,0.03);
    if(this.elapsed>=ROCKET_FINALE_SECONDS) {this.elapsed=-1;this.finished=true;}
  }
}
