/** Reuse IWSDK's bundled MSDF worker/WASM for its unbundled default fallback. */
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const assets=fileURLToPath(new URL('../dist/assets/',import.meta.url));
const files=await readdir(assets),candidates=[];
for(const name of files.filter(n=>n.endsWith('.js'))){
 const source=await readFile(path.join(assets,name),'utf8');
 if(/import\s*\{\s*expose,\s*transfer\s*\}\s*from\s*["']comlink["']/.test(source))candidates.push(name);
}
if(candidates.length){
 const modules=files.filter(n=>/^msdf-worker-.*\.js$/.test(n));
 if(modules.length!==1)throw Error('Expected one SDK self-contained MSDF worker module');
 const {workerSource,wasmUrl}=await import(pathToFileURL(path.join(assets,modules[0])).href);
 const signature='async initialize(wasmBinaryUrl) {';
 if(typeof workerSource!=='string'||!workerSource.includes(signature)||!/^data:application\/(?:wasm|octet-stream);base64,AGFzbQ/.test(wasmUrl))throw Error('SDK worker shape changed; review before packaging');
 const source=workerSource.replace(signature,`async initialize(wasmBinaryUrl = ${JSON.stringify(wasmUrl)}) {`);
 for(const name of candidates)await writeFile(path.join(assets,name),source);
 console.log(`Made ${candidates.length} SDK font fallback worker(s) self-contained with embedded WASM.`);
}else console.log('No unbundled SDK font fallback worker found.');
