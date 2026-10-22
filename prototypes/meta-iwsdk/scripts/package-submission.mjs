/** Package only production assets; reports/checksums stay beside the web ZIP. */
import {readdir,readFile,writeFile,mkdir,mkdtemp,copyFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(root,'dist'),out=path.join(root,'submission');
const walk=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name)))).flat();
const files=(await walk(dist)).sort();
if(!files.includes(path.join(dist,'index.html')))throw Error('Production entry missing');
const manifest=[];
for(const file of files){const data=await readFile(file);manifest.push({path:path.relative(dist,file).replaceAll(path.sep,'/'),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
await mkdir(out,{recursive:true});
const temporary=await mkdtemp(path.join(os.tmpdir(),'cuedone-package-'));
const name='CueDone-Personal-VR-WebXR.zip',archive=path.join(temporary,name);
try{
 execFileSync('zip',['-q','-r',archive,'.'],{cwd:dist,stdio:'pipe'});
 execFileSync('unzip',['-t',archive],{stdio:'pipe'});
 const entries=execFileSync('unzip',['-Z1',archive],{encoding:'utf8'}).trim().split('\n').filter(n=>!n.endsWith('/')).sort();
 if(JSON.stringify(entries)!==JSON.stringify(manifest.map(f=>f.path).sort()))throw Error('ZIP entries do not match production assets');
 await copyFile(archive,path.join(out,name));
 const bytes=await readFile(archive),hash=createHash('sha256').update(bytes).digest('hex');
 await writeFile(path.join(out,'SHA256SUMS-zip.txt'),`${hash}  ${name}\n`);
 await writeFile(path.join(out,'SHA256SUMS-dist.txt'),manifest.map(f=>`${f.sha256}  ${f.path}`).join('\n')+'\n');
 await writeFile(path.join(out,'build-manifest.json'),JSON.stringify({generatedAt:new Date().toISOString(),fileCount:manifest.length,totalBytes:manifest.reduce((n,f)=>n+f.bytes,0),archive:{name,bytes:bytes.length,sha256:hash},files:manifest},null,2)+'\n');
 for(const [source,destination]of [['submission-verification.md','VERIFICATION.md'],['distribution.md','DISTRIBUTION.md']])await copyFile(path.join(root,'docs',source),path.join(out,destination));
 console.log(`Packaged ${manifest.length} files: ${path.join(out,name)} (${bytes.length} bytes)\nSHA256 ${hash}\nZIP integrity and entry list verified.`);
}finally{await rm(temporary,{recursive:true,force:true});}
