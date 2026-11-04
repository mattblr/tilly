import { useAppCopy } from './copy'
import { friendlyError } from '~/lib/failures'
import { useEffect, useRef, useState } from 'react'
import { useAppSession } from './session'
import { ProfileAvatar } from './ProfileAvatar'
import { photoJpeg, uploadPhoto } from './uploads'
import { websiteEnvironment } from '~/lib/foir'
import type { ProgressiveImageSource } from './media'
import { Camera, X } from 'lucide-react'
import { TillyAvatar } from '~/components/TillyAvatar'

export function ProfilePhoto({
  photo,
  disabled,
  onChange,
  onBusy,
}: {
  photo: ProgressiveImageSource | null
  disabled: boolean
  onChange: (id: string | null, remove: boolean) => void
  onBusy: (busy: boolean) => void
}) {
  const t = useAppCopy()
  const { client, user } = useAppSession()
  const [preview, setPreview] = useState<string | null>(null),
    [removed, setRemoved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => () => request.current?.abort(), [])
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )
  const choose = async (file: File) => {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    onBusy(true)
    setError('')
    try {
      const jpeg = await photoJpeg(file)
      controller.signal.throwIfAborted()
      const id = await uploadPhoto(
        client,
        jpeg,
        websiteEnvironment().PLATFORM_API_URL,
        controller.signal,
      )
      controller.signal.throwIfAborted()
      setPreview(URL.createObjectURL(jpeg))
      setRemoved(false)
      onChange(id, false)
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          friendlyError(failure, t),
        )
    } finally {
      if (!controller.signal.aborted) {
        request.current = null
        setBusy(false)
        onBusy(false)
      }
    }
  }
  return (
    <div className={'profile-photo-control grid gap-3'}>
      <span>{t('profile.photo.title')}</span>
      <div
        className={[
          'profile-photo-editor relative w-28 h-28 my-2',
          '[&_button]:absolute [&_button]:w-11 [&_button]:h-11 [&_button]:grid [&_button]:place-items-center [&_button]:[border:2px_solid_var(--color-tilly-bg)] [&_button]:rounded-full [&_button]:[color:var(--color-tilly-text)] [&_button]:[background:var(--color-tilly-surface)] [&_button]:[box-shadow:0_2px_8px_#0002]',
          '[&_button:focus-visible]:[outline:2px_solid_var(--color-tilly-accent)] [&_button:focus-visible]:[outline-offset:3px]',
        ].join(' ')}
      >
        {!removed && (photo || preview) ? (
          preview ? (
            <img
              src={preview}
              className={[
                'profile-portrait w-24 h-24 rounded-full flex-none',
                '[.profile-photo-editor_&]:w-28 [.profile-photo-editor_&]:h-28 [.profile-photo-editor_&]:rounded-full [.profile-photo-editor_&]:overflow-hidden',
              ].join(' ')}
              alt={t("web-app.newProfilePhoto")}
            />
          ) : (
            <ProfileAvatar
              photo={photo}
              seed={user?.id ?? 'unknown'}
              size={112}
            />
          )
        ) : (
          <span
            className={
              'profile-photo-placeholder w-28 h-28 rounded-full overflow-hidden grid place-items-center [background:var(--color-tilly-surface)]'
            }
          >
            <TillyAvatar
              seed={user?.id ?? 'unknown'}
              size={112}
              state="greeting"
            />
          </span>
        )}
        <button
          type="button"
          className={'profile-photo-camera bottom-[-4px] right-[-8px]'}
          aria-label={t('profile.photo.change')}
          disabled={busy || disabled}
          onClick={() => input.current?.click()}
        >
          <Camera size={20} aria-hidden="true" />
        </button>
        {!removed && (photo || preview) && (
          <button
            type="button"
            className={'profile-photo-remove top-[-8px] right-[-8px]'}
            aria-label={t('profile.photo.remove')}
            disabled={busy || disabled}
            onClick={() => {
              setRemoved(true)
              setPreview(null)
              onChange(null, true)
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <input
        ref={input}
        hidden
        type="file"
        id="profile-photo"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy || disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void choose(file)
        }}
      />
      {busy && <p role="status">{t('profile.photo.uploading')}</p>}
      {error && <p role="alert">{error}</p>}
      <p>{t('profile.photo.publicHint')}</p>
    </div>
  )
}
