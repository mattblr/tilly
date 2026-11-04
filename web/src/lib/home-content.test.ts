import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  defaultHomeCopy,
  resolveHomeCopy,
  resolveHomeImages,
} from './home-content'
import type { PageData } from './platform'

test('native resolved copy replaces known fields, preserves blank text and falls back per field', () => {
  const copy = resolveHomeCopy([
    { key: 'hero.title', value: 'Meet the neighbourhood cats.' },
    { key: 'hero.availability', value: '' },
    { key: 'hero.body', value: null },
    { key: '__proto__', value: 'unexpected' },
  ])
  assert.equal(copy['hero.title'], 'Meet the neighbourhood cats.')
  assert.equal(copy['hero.availability'], '')
  assert.equal(copy['hero.body'], defaultHomeCopy['hero.body'])
  assert.equal(Object.getPrototypeOf(copy), Object.prototype)
  assert.equal(defaultHomeCopy['hero.title'], 'Catch the cats\nyou meet.')
})

test('homepage media uses published image order and rejects executable or ambiguous URLs', () => {
  const page: PageData = {
    _id: 'example',
    _modelKey: 'page',
    blocks: {
      entries: [
        {
          __typename: 'EditorialMedia',
          image: { desktop: { url: 'javascript:alert(1)' } },
        },
        {
          __typename: 'EditorialMedia',
          image: {
            desktop: {
              url: 'https://cdn.example/street.webp',
              alt: 'A new street',
            },
          },
        },
        {
          __typename: 'EditorialMedia',
          image: { desktop: { url: '//unreviewed.example/image' } },
        },
        {
          __typename: 'EditorialMedia',
          image: { desktop: { url: '/images/new-art.webp', alt: '' } },
        },
      ],
    },
  }
  const images = resolveHomeImages(page)
  assert.equal(images.cat.url, '/images/app/cat.webp')
  assert.equal(images.street.url, 'https://cdn.example/street.webp')
  assert.equal(images.street.alt, 'A new street')
  assert.equal(images.friends.url, '/images/app/friends.webp')
  assert.equal(images.art.url, '/images/new-art.webp')
  assert.equal(images.art.alt, '')
})
