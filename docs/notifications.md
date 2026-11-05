# Notifications and reminders

This describes the template integration, illustrated by Tilly. Preserve the
shared integration when adapting the app; change its product rules and content
to match the new application.

Fóir owns notification categories/preferences, device/browser enrolment, native
inbox, delivery, retries and execution. The app supplies product-specific text,
recipient selection and navigation. It does not maintain another inbox, send
queue, delivery ledger or scheduler.

Configure native category channels deliberately. Email is off for reminders and
community updates by default; do not rely on absent-category defaults. Shared
notification copy comes from Fóir `ui-copy`, with bundled native fallbacks.
APNs keys and the correct build environment belong in project push settings.
Browser enrolment uses the current account's scoped SDK client.

## Inbox and account changes

The inbox reads native notification pages and platform unread count. Read
mutations change UI after acceptance. Follow cursors through filtered/empty
pages and preserve failed-page retries. Listing requires neither push permission
nor a new device registration. Optional unavailable/expired images fall back
to text; the native extension does not borrow the main app's session.

Requests and late responses remain bound to the initiating account. Account
replacement clears rows/counts and installs fresh credential authority. Disable
browser push under the outgoing account before hosted sign-out; sign-out still
completes if unregister fails. Do not retain session tokens in browser storage.

## Product triggers

Social action hooks re-read the action and original author/recipient, check
blocks and invoke native send. Self-actions, deleted actions and private
relationships do not become public announcements. Challenge invitations use
published rules and current community-update intent, with stable native send
keys and Fóir continuation progress only. Reminder times use the person's
configured time zone and preferences.

Social notifications are commented out in the root config, waiting for a Fóir
platform fix: a hook acting for one user can't yet notify another
([known gaps](known-gaps.md)). When it can, restore the `socialNotificationHooks`
line in `foir.config.ts`. Notification deletion is also listed there. Do not equate a preview, accepted dispatch or local
notification double with transport to a device. Configure your own channels,
consent and native contract before enabling a product trigger.
