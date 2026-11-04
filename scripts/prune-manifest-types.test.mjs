import test from 'node:test'
import assert from 'node:assert/strict'
import {pruneManifestTypes} from './prune-manifest-types.mjs'
test('generated SDK omits only inaccessible unreferenced models and preserves reachable types',()=>{
 const source={models:{live:{typeName:'Live',ops:{findUnique:{}}},retired:{typeName:'Retired'},nested:{typeName:'Nested'}},surfaceHashes:{'models.retired':'old','models.nested':'keep'},selectionUnions:{items:{members:[{typeName:'Nested'}]}}}
 const result=pruneManifestTypes(source)
 assert.ok(result.models.live);assert.ok(result.models.nested);assert.equal(result.models.retired,undefined)
 assert.equal(result.surfaceHashes['models.retired'],undefined);assert.ok(source.models.retired)
})
