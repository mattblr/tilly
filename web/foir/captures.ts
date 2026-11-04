import { defineModel } from '@foir/cli/configs'
import { viewersField } from './audience.ts'

const owned = { ownerPlane: 'user' as const, defaultVisibility: 'private' as const }
const config = { publishing: false, versioning: false }
const reference = (key: string, model: string, label: string) => ({
  key, type: 'reference' as const, label, required: true,
  config: { referenceTypes: [model], multiple: false },
})

/** One file and social identity, regardless of how many cats appear in it.
 * USER ownership lets the creator correct tags without project-row authority.
 */
export const capturePhoto = defineModel({
  key: 'capture-photo', name: 'Capture photo', pluralName: 'Capture photos',
  description: 'One uploaded photo, shared to its creator’s chosen audience, with editable cat associations.',
  fields: [
    { key: 'photo', type: 'image', label: 'Photo', required: true },
    { key: 'fileId', type: 'text', label: 'Backing file id', required: true },
    { key: 'payloadHash', type: 'text', label: 'Initial save digest', required: true },
    { key: 'clientKey', type: 'text', label: 'Capture attempt', required: true, queryable: true },
    { key: 'editHash', type: 'text', label: 'Active edit digest' },
    { key: 'tagRevision', type: 'text', label: 'Active cat tag revision', required: true, queryable: true },
    { key: 'area', type: 'geopoint', label: 'Neighbourhood' },
    // What the catch shows as: public, or private. `viewers` enforces it.
    { key: 'audience', type: 'text', label: 'Audience', required: true, queryable: true },
    { key: 'state', type: 'text', label: 'Save state', required: true, queryable: true },
    // Compatibility fields follow the first active tag; associations are authoritative.
    { key: 'cat', type: 'reference', label: 'First tagged cat', config: { referenceTypes: ['cat'], multiple: false } },
    { key: 'catKey', type: 'text', label: 'First tagged cat id', queryable: true },
    viewersField(),
  ], access: owned, config,
})

export const captureCatTag = defineModel({
  key: 'capture-cat-tag', name: 'Capture cat tag', pluralName: 'Capture cat tags',
  description: 'A creator-confirmed cat in a capture, optionally positioned in the upright photo.',
  fields: [
    reference('capture', 'capture-photo', 'Capture'), reference('cat', 'cat', 'Cat'),
    { key: 'photoKey', type: 'text', label: 'Canonical capture id', required: true, queryable: true },
    { key: 'catKey', type: 'text', label: 'Cat id', required: true, queryable: true },
    { key: 'inputHash', type: 'text', label: 'Tag selection digest' },
    { key: 'tagKey', type: 'text', label: 'Stable tag key', required: true, queryable: true },
    { key: 'revision', type: 'text', label: 'Tag revision', required: true, queryable: true },
    { key: 'position', type: 'json', label: 'Photo position' },
    { key: 'bounds', type: 'json', label: 'Detected cat bounds' },
    { key: 'active', type: 'boolean', label: 'Active association', queryable: true },
    { key: 'capturedAt', type: 'date', label: 'Original capture date', queryable: true },
    { key: 'positionIndex', type: 'integer', label: 'Tag order', required: true, queryable: true },
    { key: 'vector', type: 'json', label: 'Local feature vector' },
    { key: 'vectorModel', type: 'text', label: 'Local feature model' },
    { key: 'area', type: 'geopoint', label: 'Neighbourhood' },
    viewersField(),
  ], access: owned, config,
})

export { captureTagSchema } from '../src/server/operations/capture-tag-schema.ts'
