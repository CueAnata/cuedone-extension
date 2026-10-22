import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, InstancedMesh, MeshBasicMaterial, Matrix4, Sphere, Vector3, Mesh, TubeGeometry, LineCurve3, type Intersection } from 'three';
import { enableInstancedContact, enableVineContact } from './hand-contact.ts';

test('instance contact ignores base box and hidden instances',()=>{
 const mesh=new InstancedMesh(new BoxGeometry(1,1,1),new MeshBasicMaterial(),2);
 mesh.setMatrixAt(0,new Matrix4().makeScale(.02,.02,.02).setPosition(1,0,0));
 mesh.setMatrixAt(1,new Matrix4().makeScale(0,0,0));
 enableInstancedContact(mesh);
 const hits:Intersection[]=[];
 mesh.spherecast!(new Sphere(new Vector3(0,0,0),.01),hits);
 assert.equal(hits.length,0);
 mesh.spherecast!(new Sphere(new Vector3(1,0,.015),.01),hits);
 assert.equal(hits.length,1);assert.equal(hits[0].instanceId,0);
});
test('vine contact follows revealed draw range',()=>{
 const geometry=new TubeGeometry(new LineCurve3(new Vector3(0,0,0),new Vector3(0,1,0)),10,.01,6,false);
 const mesh=new Mesh(geometry,new MeshBasicMaterial());enableVineContact(mesh);
 const hits:Intersection[]=[];
 geometry.setDrawRange(0,0);
 mesh.spherecast!(new Sphere(new Vector3(0,.25,.015),.01),hits);assert.equal(hits.length,0);
 geometry.setDrawRange(0,5*6*6);
 mesh.spherecast!(new Sphere(new Vector3(0,.25,.015),.01),hits);assert.equal(hits.length,1);
 hits.length=0;
 mesh.spherecast!(new Sphere(new Vector3(0,.85,.015),.01),hits);assert.equal(hits.length,0);
});
