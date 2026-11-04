import {ActionFailure} from '../../lib/failures'
import {CompletedOperationFailure,runAppOperation} from './operations'
import type {AppClient} from './data'

export interface SavedCaptureCompletion {
  photoKey:string
  captureRevision?:string
  captureId?:string
  note?:{text:string;key?:string;saved?:boolean}
  finalizeKey?:string
  finished?:boolean
}
/** Await the saved note before the finalization intent. A retry observes the
 * same writes; an ambiguous response cannot create another note/provider job. */
export async function finishSavedCapture(client:AppClient,attempt:SavedCaptureCompletion,current:()=>boolean) {
  const check=()=>{if(!current())throw new ActionFailure('pending')}
  check()
  if(attempt.finished)return
  if(attempt.note?.text.trim()&&!attempt.note.saved) {
    attempt.note.key??=crypto.randomUUID()
    try {
      await runAppOperation(client,'execute.tilly.add-field-note',{photoKey:attempt.photoKey,text:attempt.note.text.trim(),tags:[]},{idempotencyKey:attempt.note.key})
    } catch(error){if(error instanceof CompletedOperationFailure)delete attempt.note.key;throw error}
    check();attempt.note.saved=true
  }
  check()
  if(attempt.captureId) {
    attempt.finalizeKey??=crypto.randomUUID()
    try {
      await runAppOperation(client,'execute.finalize_capture',{captureId:attempt.captureId,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone},{idempotencyKey:attempt.finalizeKey})
    } catch(error){if(error instanceof CompletedOperationFailure)delete attempt.finalizeKey;throw error}
    check()
  }
  attempt.finished=true
}
