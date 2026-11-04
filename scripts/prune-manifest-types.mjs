/** Omit inaccessible, unreferenced model descriptions from generated clients.
 * The platform manifest may describe retired models outside this key's callable
 * scope. Keep all operations, selections and referenced types exactly as served.
 */
import {readFileSync,writeFileSync} from 'node:fs'
export function pruneManifestTypes(input){
 const manifest=structuredClone(input)
 for(const [key,model] of Object.entries(manifest.models??{})){
  if(model.ops&&Object.keys(model.ops).length)continue
  const other={...manifest,models:{...manifest.models},surfaceHashes:{...manifest.surfaceHashes}}
  delete other.models[key];delete other.surfaceHashes[`models.${key}`]
  const serialized=JSON.stringify(other)
  if(serialized.includes(JSON.stringify(model.typeName)))continue
  delete manifest.models[key];delete manifest.surfaceHashes[`models.${key}`]
 }
 return manifest
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href){
 const [source,destination]=process.argv.slice(2)
 if(!source||!destination)throw Error('Pass source and destination manifest paths.')
 writeFileSync(destination,JSON.stringify(pruneManifestTypes(JSON.parse(readFileSync(source,'utf8')))))
}
