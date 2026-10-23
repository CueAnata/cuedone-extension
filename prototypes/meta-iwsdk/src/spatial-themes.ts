import { ConstellationActivation } from './constellation-activation.ts';
import {
  Group, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial,
  LineSegments, LineBasicMaterial, Mesh, MeshBasicMaterial, SphereGeometry,
  CylinderGeometry, TorusGeometry, Color,
} from 'three';

import { TrellisGarden } from './trellis-garden.ts';
import type { SpatialTask } from './garden-progress.ts';

// Same seven Big Dipper nodes and edges as the approved 2D Constellation.
const STARS = [[35,75], [72,62], [110,68], [148,70], [142,104], [198,108], [206,64]];
const EDGES = [[0,1], [1,2], [2,3], [3,4], [4,5], [5,6], [6,3]];

/** Procedural geometry only: bounded particles, no textures, shadows, physics or downloads. */
export class SpatialThemes {
  readonly root = new Group();
  readonly trellis = new TrellisGarden();
  readonly activation = new ConstellationActivation((index,total)=>{
    const point=this.trellis.vinePoint((index+1)/Math.max(1,total),index%2===0?-1:1);
    this.trellis.root.updateWorldMatrix(true,false);
    this.root.updateWorldMatrix(true,false);
    return this.root.worldToLocal(this.trellis.root.localToWorld(point));
  });
  private readonly taskNodes = new Points(new BufferGeometry(),new PointsMaterial({size:0.052,vertexColors:true}));
  private readonly taskLinks = new LineSegments(new BufferGeometry(),new LineBasicMaterial({vertexColors:true}));
  readonly constellation = new Group();
  readonly zen = new Group();
  private readonly stars: Points<BufferGeometry, PointsMaterial>;
  private readonly lines: LineSegments;
  private readonly stones: Mesh[] = [];
  private readonly rings: Mesh[] = [];
  private readonly particles: Points;
  private phase = 0;

  constructor() {
    this.root.name = 'CueDone spatial themes';
    this.root.add(this.constellation, this.zen, this.trellis.root, this.activation.root);
    this.taskNodes.name = 'Task constellation nodes';
    this.taskLinks.name = 'Task constellation connections';

    this.constellation.position.set(-0.45, 0.05, -0.15);
    const positions = STARS.flatMap(([x,y]) => [(x - 120) / 200, (85 - y) / 200, 0]);
    this.stars = new Points(new BufferGeometry().setAttribute('position',
      new Float32BufferAttribute(positions, 3)),
      new PointsMaterial({ color: 0xffc86b, size: 0.045, transparent: true, opacity: 0.3 }));
    const linePositions = EDGES.flatMap(([a,b]) => [...positions.slice(a*3,a*3+3), ...positions.slice(b*3,b*3+3)]);
    this.lines = new LineSegments(new BufferGeometry().setAttribute('position',
      new Float32BufferAttribute(linePositions, 3)),
      new LineBasicMaterial({ color: 0xffdca0, transparent: true, opacity: 0.9 }));
    this.constellation.add(this.stars, this.lines, this.taskNodes, this.taskLinks);

    this.zen.position.set(0.45, -0.12, -0.15);
    this.zen.scale.setScalar(0.3);
    const sand = new Mesh(new CylinderGeometry(0.42, 0.45, 0.045, 32),
      new MeshBasicMaterial({ color: 0xd4ba8d }));
    sand.position.y = -0.23;
    this.zen.add(sand);
    for (let i = 0; i < 5; i++) {
      const stone = new Mesh(new SphereGeometry(0.11 - i * 0.009, 12, 8),
        new MeshBasicMaterial({ color: [0x514b41,0x6d6659,0x807464,0x94836e,0xb3a088][i] }));
      stone.position.set(Math.sin(i * 1.8) * 0.05, -0.16 + i * 0.12, 0);
      stone.scale.set(1.2, 0.7, 0.9);
      this.stones.push(stone);
      this.zen.add(stone);
    }
    for (let i = 0; i < 4; i++) {
      const ring = new Mesh(new TorusGeometry(0.17 + i * 0.065, 0.004, 4, 32),
        new MeshBasicMaterial({ color: 0xb69a6a }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.204;
      this.rings.push(ring);
      this.zen.add(ring);
    }
    const ambient = Array.from({length: 96}, (_,i) => {
      const a = i * 2.399963;
      return [Math.cos(a) * (0.65 + (i % 9)*0.025),
        ((i*37)%97) / 97 * 0.9 - 0.3, Math.sin(a) * 0.35 - 0.3];
    }).flat();
    this.particles = new Points(new BufferGeometry().setAttribute('position',
      new Float32BufferAttribute(ambient, 3)),
      new PointsMaterial({ color: 0xffdc9c, size: 0.008, transparent: true, opacity: 0.5 }));
    this.zen.add(this.particles);
  }


  bindTasks(tasks: readonly SpatialTask[], feedback=false): void {
    this.activation.bind(tasks,feedback);
    const positions:number[]=[];const colors:number[]=[];const links:number[]=[];const linkColors:number[]=[];
    const clusters=Math.max(1,Math.ceil(tasks.length/7));
    const columns=Math.ceil(Math.sqrt(clusters));
    const active=tasks.findIndex(task=>!task.completed);
    tasks.forEach((task,i)=>{
      const cluster=Math.floor(i/7);const [x,y]=STARS[i%7];
      positions.push(((x-120)/200+(cluster%columns)*0.9)/columns,
        ((85-y)/200-Math.floor(cluster/columns)*0.5)/columns,0.012);
      const color=new Color(task.completed?0xffedb8:i===active?0xff970f:0x8d7854);
      colors.push(color.r,color.g,color.b);
      if(i>0) {
        links.push(...positions.slice((i-1)*3,(i-1)*3+3),...positions.slice(i*3,i*3+3));
        const lineColor=new Color(task.completed&&tasks[i-1].completed?0xffd58a:0x72624d);
        linkColors.push(lineColor.r,lineColor.g,lineColor.b,lineColor.r,lineColor.g,lineColor.b);
      }
    });
    const nodes=new BufferGeometry().setAttribute('position',new Float32BufferAttribute(positions,3))
      .setAttribute('color',new Float32BufferAttribute(colors,3));
    const edges=new BufferGeometry().setAttribute('position',new Float32BufferAttribute(links,3))
      .setAttribute('color',new Float32BufferAttribute(linkColors,3));
    this.taskNodes.geometry.dispose();this.taskLinks.geometry.dispose();
    this.taskNodes.geometry=nodes;this.taskLinks.geometry=edges;
    this.taskNodes.userData.taskIds=tasks.map(task=>task.id);
    this.taskNodes.userData.activeTaskId=tasks[active]?.id??null;
  }

  update(theme: 'constellation' | 'zen', ratio: number, hasTasks: boolean, delta: number, motion: boolean): void {
    this.activation.tick(delta,motion);
    this.constellation.visible = theme === 'constellation' && hasTasks;
    this.trellis.root.visible = theme === 'zen';
    if(theme!=='zen')this.trellis.cancel();
    this.trellis.setProgress(hasTasks ? ratio : 0);
    this.zen.visible = theme === 'zen' && hasTasks;
    this.lines.geometry.setDrawRange(0, Math.floor(ratio * EDGES.length) * 2);
    this.stars.material.opacity = 0.3 + ratio * 0.7;
    this.constellation.scale.setScalar(0.3);
    this.stones.forEach((stone,i) => {
      const fill = Math.max(0, Math.min(1, ratio * 5 - i));
      stone.visible = fill > 0;
      stone.scale.set(1.2 * fill, 0.7 * fill, 0.9 * fill);
      stone.position.y = -0.16 + i * 0.12 - (1 - fill) * 0.05;
    });
    // Ambient motion is tiny and local; camera and floor never animate.
    if (motion) this.phase += Math.min(Math.max(delta, 0), 1 / 30);
    this.particles.rotation.y = motion ? Math.sin(this.phase * 0.15) * 0.04 : 0;
    this.rings.forEach((ring,i) => { ring.visible = ratio > i / 4; });
  }

  dispose(): void {
    this.activation.dispose();
    this.trellis.dispose();
    this.root.removeFromParent();
    this.root.traverse(object => {
      if (object instanceof Mesh || object instanceof Points || object instanceof LineSegments) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      }
    });
  }
}
