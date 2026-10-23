import { Object3D, Ray, Vector3 } from 'three';

const finite = (v: Vector3) => [v.x,v.y,v.z].every(Number.isFinite);

/** One ray owns a move gesture. Motion smoothing never moves the camera. */
export class PanelDrag {
  owner: number | null = null;
  private readonly original = new Vector3();
  private readonly offset = new Vector3();
  private readonly target = new Vector3();
  private readonly next = new Vector3();
  private distance = 0;
  private readonly panel: Object3D;
  constructor(panel: Object3D) {this.panel = panel;}

  begin(pointerId: number, ray: Ray, point: Vector3): boolean {
    if(this.owner !== null || !finite(ray.origin) || !finite(ray.direction) || !finite(point))return false;
    const distance = ray.origin.distanceTo(point);
    if(distance < 0.1 || !Number.isFinite(distance) || Math.abs(ray.direction.lengthSq()-1) > 0.01)return false;
    this.owner = pointerId;
    this.distance = distance;
    this.original.copy(this.panel.position);
    this.offset.copy(this.panel.position).sub(point);
    this.target.copy(this.panel.position);
    return true;
  }

  move(pointerId: number, ray: Ray): boolean {
    if(this.owner !== pointerId || !finite(ray.origin) || !finite(ray.direction) || Math.abs(ray.direction.lengthSq()-1) > 0.01)return false;
    ray.at(this.distance,this.next).add(this.offset);
    if(!finite(this.next))return false;
    this.target.copy(this.next);
    return true;
  }

  tick(delta: number): void {
    if(this.owner === null)return;
    const dt = Math.max(0,Math.min(delta,1/30));
    // Exponential damping reduces hand-ray jitter; the step cap rejects teleports.
    this.next.copy(this.target).sub(this.panel.position).multiplyScalar(1-Math.exp(-dt/0.065));
    this.next.clampLength(0,0.08);
    this.panel.position.add(this.next);
  }

  end(pointerId: number): boolean {
    if(this.owner !== pointerId)return false;
    // Keep the last displayed position. Never snap to a pending smoothing target.
    this.owner = null;
    return true;
  }

  cancel(): boolean {
    if(this.owner === null)return false;
    this.owner = null;
    this.panel.position.copy(this.original);
    return true;
  }
}
