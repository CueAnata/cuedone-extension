import { Matrix4, Vector3, type InstancedMesh, type Mesh, type Sphere,
  type Intersection, type TubeGeometry } from 'three';

/** The bundled pointer library falls through from InstancedMesh to its unscaled
 * base geometry. Override only our garden meshes so phantom unit-sized boxes
 * cannot capture a fingertip intended for the task panel. */
export function enableInstancedContact(mesh:InstancedMesh):void {
  const matrix=new Matrix4(),instance=new Matrix4(),inverse=new Matrix4();
  const local=new Vector3(),point=new Vector3(),normal=new Vector3();
  mesh.geometry.computeBoundingBox();
  const bounds=mesh.geometry.boundingBox!.clone();
  mesh.spherecast=(sphere:Sphere,hits:Intersection[])=>{
    for(let i=0;i<mesh.count;i++) {
      mesh.getMatrixAt(i,instance);matrix.multiplyMatrices(mesh.matrixWorld,instance);
      if(Math.abs(matrix.determinant())<1e-12)continue; // unrevealed flowers have zero scale
      inverse.copy(matrix).invert();local.copy(sphere.center).applyMatrix4(inverse);
      bounds.clampPoint(local,point);point.applyMatrix4(matrix);
      const distance=point.distanceTo(sphere.center);
      if(distance>sphere.radius)continue;
      normal.copy(sphere.center).sub(point);
      if(normal.lengthSq()<1e-12)normal.set(0,0,1);else normal.normalize();
      normal.transformDirection(inverse);
      hits.push({distance,point:point.clone(),object:mesh,instanceId:i,
        face:{a:0,b:0,c:0,materialIndex:0,normal:normal.clone()}});
    }
  };
}

/** Touch only the currently drawn vine segments, not the tube's full bounds. */
export function enableVineContact(mesh:Mesh<TubeGeometry>):void {
  const geometry=mesh.geometry;
  const raycast=mesh.raycast;
  mesh.raycast=function(ray,hits){
    // IWSDK may build the BVH while drawRange is still zero. The ordinary
    // Three mesh raycast honors the current progressive draw range instead.
    const tree=geometry.boundsTree;
    geometry.boundsTree=undefined;
    try {raycast.call(this,ray,hits);} finally {geometry.boundsTree=tree;}
  };
  const {path,tubularSegments,radialSegments,radius}=geometry.parameters;
  const points=Array.from({length:tubularSegments+1},(_,i)=>path.getPointAt(i/tubularSegments));
  const a=new Vector3(),b=new Vector3(),ab=new Vector3(),closest=new Vector3(),normal=new Vector3();
  const inverse=new Matrix4(),delta=new Vector3();
  mesh.spherecast=(sphere:Sphere,hits:Intersection[])=>{
    const count=Math.min(tubularSegments,Math.floor(geometry.drawRange.count/(radialSegments*6)));
    let best=Infinity;let bestPoint:Vector3|undefined;let bestNormal:Vector3|undefined;
    const worldRadius=radius*mesh.matrixWorld.getMaxScaleOnAxis();
    for(let i=0;i<count;i++) {
      a.copy(points[i]).applyMatrix4(mesh.matrixWorld);b.copy(points[i+1]).applyMatrix4(mesh.matrixWorld);
      ab.copy(b).sub(a);delta.copy(sphere.center).sub(a);
      const t=Math.max(0,Math.min(1,delta.dot(ab)/Math.max(1e-12,ab.lengthSq())));
      closest.copy(a).addScaledVector(ab,t);
      normal.copy(sphere.center).sub(closest);const length=normal.length();
      const distance=Math.max(0,length-worldRadius);
      if(distance>sphere.radius || distance>=best)continue;
      if(length>1e-8)normal.multiplyScalar(1/length);else normal.set(0,0,1);
      closest.addScaledVector(normal,Math.min(length,worldRadius));
      best=distance;bestPoint=closest.clone();bestNormal=normal.clone();
    }
    if(bestPoint && bestNormal) {
      inverse.copy(mesh.matrixWorld).invert();bestNormal.transformDirection(inverse);
      hits.push({distance:best,point:bestPoint,object:mesh,
        face:{a:0,b:0,c:0,materialIndex:0,normal:bestNormal}});
    }
  };
}
