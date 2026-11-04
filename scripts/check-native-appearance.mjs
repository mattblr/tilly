import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'

if(process.platform!=='darwin')throw Error('Run native appearance controls on macOS with Swift installed.')
const root=new URL('../',import.meta.url),scratch=await mkdtemp(join(tmpdir(),'tilly-appearance-'))
try {
  const binary=join(scratch,'checks')
  for(const [command,args]of [
    ['swiftc',['-parse-as-library','-module-cache-path',join(scratch,'modules'),new URL('ios/Tilly/Foir/AppearanceAnswer.swift',root).pathname,new URL('ios/Tests/AppearanceChecks.swift',root).pathname,'-o',binary]],
    [binary,[]],
    ['swiftc',['-parse-as-library','-module-cache-path',join(scratch,'modules'),new URL('ios/Tilly/Foir/CatAppearanceEvidence.swift',root).pathname,new URL('ios/Tests/CatAppearanceEvidenceChecks.swift',root).pathname,'-o',binary]],
    [binary,[]],
  ]) {
    const result=spawnSync(command,args,{stdio:'inherit'})
    if(result.error)throw result.error
    if(result.status!==0)throw Error(`${command} failed (${result.status}).`)
  }
} finally {await rm(scratch,{recursive:true,force:true})}
