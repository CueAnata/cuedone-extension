import { Group, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial,
  Mesh, MeshBasicMaterial, SphereGeometry, CylinderGeometry, TorusGeometry } from 'three';
import { TrellisGarden } from './trellis-garden.ts';

/** Fixed garden environment: no sky, stars, or opaque fullscreen scenery. */
export class SpatialThemes {
  readonly root = new Group();
  readonly trellis = new TrellisGarden();
  readonly zen = new Group();
  private readonly stones: Mesh[] = [];
  private readonly rings: Mesh[] = [];
  private readonly particles: Points;
  private phase = 0;

  constructor() {
    this.root.name = 'Zen Garden';
    this.root.add(this.zen, this.trellis.root);
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

  update(ratio: number, hasTasks: boolean, delta: number, motion: boolean): void {
    this.trellis.root.visible = true;
    this.trellis.setProgress(hasTasks ? ratio : 0);
    this.zen.visible = hasTasks;
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
    this.trellis.dispose();
    this.root.removeFromParent();
    this.zen.traverse(object => {
      if (object instanceof Mesh || object instanceof Points) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      }
    });
  }
}
