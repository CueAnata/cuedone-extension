import { Group, Mesh, MeshBasicMaterial, BoxGeometry, SphereGeometry, CylinderGeometry,
  TorusGeometry, ConeGeometry, type BufferGeometry } from 'three';

export const HOME_STAGES = ['Primitive Cave', 'Grass Hut', 'Stone House', 'Victorian Home',
  'Modern 2-Story Home', 'NYC Skyscraper Apartment', 'Futuristic Sky Apartment Finale'] as const;
/** Six equal progress intervals. The seventh scene is reserved for exact completion. */
export function homeStage(ratio:number):number {
  return Math.min(6, Math.floor(Math.max(0,Math.min(1,ratio))*6));
}

/** Fixed scene budget. No task state, browser storage, audio or garden assets. */
export class HomeEvolution {
  readonly root=new Group();
  readonly stages:Group[]=[];
  readonly cars:Group[]=[];
  readonly clouds:Mesh[]=[];
  readonly robot=new Group();
  private phase=0;
  private ratio=0;
  private active=0;
  constructor() {
    this.root.name='Home Evolution';this.root.pointerEvents='none';
    for(const name of HOME_STAGES) {
      const stage=new Group();stage.name=name;this.stages.push(stage);this.root.add(stage);
    }
    const box=(g:Group,name:string,c:number,x:number,y:number,w:number,h:number,z=0,d=0.08)=>
      this.part(g,name,new BoxGeometry(w,h,d),c,x,y,z);
    const ball=(g:Group,name:string,c:number,x:number,y:number,sx:number,sy:number,z=0)=>{
      const m=this.part(g,name,new SphereGeometry(1,24,16),c,x,y,z);m.scale.set(sx,sy,0.08);return m;
    };
    const window=(g:Group,x:number,y:number,w=0.18,h=0.16)=>{
      box(g,'Window frame',0xf4e9cf,x,y,w+0.025,h+0.025,0.11);
      box(g,'Window glass',0x90d9ed,x,y,w,h,0.16);
      box(g,'Window mullion',0xffffff,x,y,0.012,h,0.21);
    };
    const door=(g:Group)=>box(g,'Front door',0x694e3b,0,-0.27,0.14,0.28,0.16);
    this.stages.forEach((g,i)=>{
      box(g,'Stage sky',i===5?0x24334e:i===6?0x132c58:0xb8dfed,0,0,2.2,1.18,-0.3);
      box(g,'Ground',i>=5?0x526784:0x94ab73,0,-0.49,2.2,0.13,-0.15);
    });
    const cave=this.stages[0];
    ball(cave,'Primitive cave rock',0x887c70,0,-0.04,0.62,0.47);
    ball(cave,'Dark cave entrance',0x292928,0,-0.2,0.25,0.3,0.11);
    for(let i=0;i<9;i++)ball(cave,'Rough cave stone',i%2?0x9c9185:0x71695f,
      Math.cos(i*Math.PI/8)*0.5,Math.sin(i*Math.PI/8)*0.38-0.2,0.13,0.12,0.13);
    const hut=this.stages[1];
    box(hut,'Mud hut walls',0xb48c5b,0,-0.16,0.76,0.55);door(hut);
    const grass=this.part(hut,'Grass roof',new ConeGeometry(0.63,0.38,4),0x648139,0,0.26,0);grass.rotation.y=Math.PI/4;
    for(let i=0;i<23;i++) {
      const blade=box(hut,'Hanging grass thatch',i%2?0xa8ae52:0x859d43,(i-11)*0.045,0.12,0.018,0.18,0.16);
      blade.rotation.z=Math.sin(i)*0.14;
    }
    const stone=this.stages[2];
    box(stone,'Stone house',0xaaa99c,0,-0.13,0.95,0.62);door(stone);
    for(let row=0;row<5;row++)for(let col=0;col<8;col++) {
      box(stone,'Stone masonry',row%2?0x8e948c:0xbcc1b4,-0.42+col*0.12,-0.38+row*0.12,0.108,0.105,0.07);
    }
    door(stone);window(stone,-0.29,-0.08);window(stone,0.29,-0.08);
    for(let i=0;i<10;i++)box(stone,'Flat roof tile',0x6d7979,(i-4.5)*0.115,0.22,0.11,0.07,0.08);
    const victorian=this.stages[3];
    box(victorian,'Victorian facade',0xd9a5b3,0,-0.12,0.91,0.64);door(victorian);
    const front=this.part(victorian,'Inverted-V front gable',new ConeGeometry(0.66,0.43,4),0x77537c,0,0.37,0);front.rotation.y=Math.PI/4;
    for(const side of [-1,1]) {
      const trim=box(victorian,'Inverted-V white trim',0xfff2dc,side*0.24,0.36,0.64,0.025,0.18);
      trim.rotation.z=-side*0.65;
      window(victorian,side*0.29,-0.08);
      box(victorian,'Porch column',0xfff2dc,side*0.45,-0.18,0.025,0.56,0.22);
    }
    this.part(victorian,'Round attic window frame',new TorusGeometry(0.08,0.015,8,32),0xffedcf,0,0.34,0.24);
    ball(victorian,'Round attic window',0x94dced,0,0.34,0.067,0.067,0.22);
    const modern=this.stages[4];
    box(modern,'Brick bottom floor',0x9e5647,0,-0.27,1.06,0.36);
    for(let r=0;r<4;r++)for(let c=0;c<10;c++)box(modern,'Brick course',0xd08c70,(c-4.5)*0.105,-0.41+r*0.085,0.095,0.009,0.06);
    box(modern,'Siding upper floor',0xe6d8b9,0,0.11,1.06,0.4);
    for(let i=0;i<7;i++)box(modern,'Horizontal siding',0xc6bda5,0,-0.06+i*0.055,1.06,0.008,0.06);
    window(modern,-0.27,0.12,0.24,0.22);window(modern,0.27,0.12,0.24,0.22);door(modern);
    box(modern,'Roof overhang',0x344355,0,0.34,1.25,0.065,0.08,0.19);
    const nyc=this.stages[5];
    for(let b=0;b<7;b++) {
      const x=(b-3)*0.3,h=0.48+(b%3)*0.15;
      box(nyc,'NYC skyline building',0x33445e,x,-0.44+h/2,0.24,h,-0.12);
    }
    box(nyc,'NYC skyscraper apartment tower',0x667a92,0,0.01,0.66,0.99,0.01);
    box(nyc,'Skyscraper crown',0xabb8c8,0,0.52,0.46,0.045,0.02);
    box(nyc,'Antenna',0xcad4e3,0,0.59,0.012,0.13);
    for(let r=0;r<8;r++)for(let c=0;c<4;c++)box(nyc,'Apartment window',r%3?0xf8d887:0x98d1e8,(c-1.5)*0.145,-0.37+r*0.112,0.09,0.065,0.09);
    const future=this.stages[6];
    // Oblong panoramic window, with visible sky between the apartment trim.
    const rim=this.part(future,'Oblong panoramic window rim',new TorusGeometry(0.39,0.035,10,64),0xdef5ff,0,0.1,0.02);rim.scale.x=2.2;
    for(let i=0;i<5;i++) {
      const cloud=ball(future,'Sky apartment cloud',0xd1e9ff,(i-2)*0.4,0.13+(i%2)*0.18,0.18,0.045,-0.1);
      this.clouds.push(cloud);
    }
    box(future,'Apartment floor',0x778cab,0,-0.44,2.1,0.1,0.12);
    future.add(this.robot);this.robot.name='Retro serving robot with apron and tray';this.robot.position.set(-0.58,-0.18,0.24);
    ball(this.robot,'Robot body',0x84bac5,0,0,0.12,0.17);
    ball(this.robot,'Robot head',0xbedee4,0,0.2,0.115,0.085);
    for(const side of [-1,1]) {
      ball(this.robot,'Robot eye',0x1c354c,side*0.043,0.21,0.014,0.02,0.09);
      box(this.robot,'Robot arm',0x84bac5,side*0.15,0.01,0.14,0.035,0.04);
      box(this.robot,'Robot foot',0x31465c,side*0.06,-0.19,0.08,0.035,0.04);
    }
    box(this.robot,'White serving apron',0xfff8ea,0,-0.035,0.135,0.18,0.1);
    box(this.robot,'Serving tray',0xe4d3a3,0.23,0.04,0.22,0.016,0.1);
    this.part(this.robot,'Cup on serving tray',new CylinderGeometry(0.025,0.02,0.05,12),0xffe4ac,0.25,0.073,0.1);
    const dog=new Group();dog.name='Robot dog';future.add(dog);dog.position.set(0.59,-0.3,0.23);
    box(dog,'Robot dog body',0xb4c4df,0,0,0.23,0.1);
    box(dog,'Robot dog head',0xd5dfed,0.13,0.07,0.1,0.1);
    for(const x of [-0.08,0.08])box(dog,'Dog leg',0x7f9db8,x,-0.08,0.035,0.1);
    box(dog,'Dog eye',0x244263,0.16,0.09,0.018,0.02,0.06);
    const ear=box(dog,'Dog ear',0x718ca7,0.11,0.15,0.035,0.07);ear.rotation.z=0.3;
    const tail=box(dog,'Robot dog tail',0x718ca7,-0.15,0.05,0.08,0.025);tail.rotation.z=-0.6;
    for(let i=0;i<5;i++) {
      const car=new Group();car.name='Sci-fi flying car';future.add(car);this.cars.push(car);
      ball(car,'Flying car hull',[0xf3b464,0x83dcdb,0xdf98d0][i%3],0,0,0.105,0.025);
      ball(car,'Flying car canopy',0xc7f3ff,0,0.025,0.045,0.027);
      box(car,'Ion engine trail',0x67dcff,-0.14,-0.005,0.07,0.012);
    }
    this.setProgress(0);this.update(0,false);
  }
  private part(g:Group,name:string,geometry:BufferGeometry,color:number,x:number,y:number,z:number):Mesh {
    const mesh=new Mesh(geometry,new MeshBasicMaterial({color}));mesh.name=name;
    mesh.position.set(x,y,z);g.add(mesh);return mesh;
  }
  setProgress(ratio:number):void {
    this.ratio=Math.max(0,Math.min(1,ratio));this.active=homeStage(this.ratio);
    // Replace the old scene; local scale eases within each stage without scene overlap.
    this.stages.forEach((stage,i)=>{
      stage.visible=i===this.active;
      stage.scale.setScalar(i===6?1:0.94+0.06*(this.ratio*6-i));
    });
  }
  update(delta:number,motion:boolean):void {
    if(motion && this.active===6)this.phase+=Math.min(Math.max(delta,0),1/30);
    this.cars.forEach((car,i)=>{
      car.position.set(((i*0.43+this.phase*(0.45+i*0.08))%2.1)-1.05,0.03+(i%3)*0.16,-0.04);
    });
    this.clouds.forEach((cloud,i)=>cloud.position.x=((i*0.43+this.phase*0.035)%2.1)-1.05);
    this.robot.rotation.z=motion?Math.sin(this.phase*2)*0.025:0;
  }
}
