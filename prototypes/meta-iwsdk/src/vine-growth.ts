import { CurvePath, CubicBezierCurve3, Float32BufferAttribute, Vector3,
  type Mesh, type MeshBasicMaterial, type TubeGeometry } from 'three';

/** Piecewise cubic Beziers preserve the existing winding trellis silhouette. */
export function bezierVine(point:(t:number)=>Vector3):CurvePath<Vector3> {
  const path=new CurvePath<Vector3>();const steps=80;
  const tangent=(t:number)=>{
    const lo=Math.max(0,t-0.0001),hi=Math.min(1,t+0.0001);
    return point(hi).sub(point(lo)).divideScalar(hi-lo);
  };
  for(let i=0;i<steps;i++){
    const a=i/steps,b=(i+1)/steps;
    path.add(new CubicBezierCurve3(point(a),point(a).addScaledVector(tangent(a),1/(steps*3)),
      point(b).addScaledVector(tangent(b),-1/(steps*3)),point(b)));
  }
  return path;
}

/** Shared smoothed task ratio drives GPU taper and CPU draw/contact visibility. */
export class VineGrowthController {
  readonly uniforms={uGrowthProgress:{value:0}};
  readonly vine:Mesh<TubeGeometry,MeshBasicMaterial>;
  constructor(vine:Mesh<TubeGeometry,MeshBasicMaterial>){
    this.vine=vine;
    const g=vine.geometry,{path,tubularSegments,radialSegments}=g.parameters;
    const centers:number[]=[];
    for(let i=0;i<=tubularSegments;i++){
      const p=path.getPointAt(i/tubularSegments);
      for(let j=0;j<=radialSegments;j++)centers.push(p.x,p.y,p.z);
    }
    g.setAttribute('vineCenter',new Float32BufferAttribute(centers,3));
    vine.material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,this.uniforms);
      shader.vertexShader='uniform float uGrowthProgress;\nattribute vec3 vineCenter;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
        #include <begin_vertex>
        float vineGrowth = smoothstep(0.0, 0.025, uGrowthProgress - uv.x);
        transformed = mix(vineCenter, transformed, vineGrowth);
      `);
    };
    vine.material.customProgramCacheKey=()=> 'cuedone-vine-growth-v1';
  }
  setProgress(value:number):void {
    const ratio=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
    this.uniforms.uGrowthProgress.value=ratio;
    const g=this.vine.geometry;
    g.setDrawRange(0,Math.floor(ratio*g.parameters.tubularSegments)*g.parameters.radialSegments*6);
  }
}
