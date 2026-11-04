# Tilly email setup

Fóir renders Tilly's transactional emails in its native branded layout. The
root configuration supplies the app icon, published brand-colour default,
display/From name and app base URL. Set `TILLY_SUPPORT_EMAIL` in private
deployment inputs for the support footer and Reply-To; do not add a real
provider credential to this repository. A custom sending domain/provider is a
separate setup, not implied by a From display name.

`web/foir/email.ts` declares 13 project-scoped English (UK) copy defaults through
the root config. They cover codes, welcome/account readiness, email/provider
security notices, waitlist and confirmation. Passwordless account messages do
not ask an Apple or email-code user to choose a password. Preserve merge fields
such as `{address}`, `{provider}`, `{category}` and `{confirm_url}` when editing.
The sign-in CTA uses `{base}/sign-in`, which starts hosted sign-in.

Apply a reviewed root plan without pruning or forcing over installed edits.
Email copy and project branding wait for a release. Release only the intended
copy/settings items; do not include unrelated provider or role drafts. Edit
installed wording under Fóir's Emails page, with the appropriate locale, then
review the next root reconciliation before applying it. Add reviewed
translations rather than copying the English defaults over them.

App notification wording is supplied by its signed sending operation from
`ui-copy`, using the same platform layout. Fóir's action catalogue explicitly
states that stored overrides for `email.project.notification` are not read.
Do not create a misleading copy editor for that envelope. Streak reminders and
community updates currently opt into push/in-app only; email channels remain
off. Email-channel preferences and a verified delivery test are required before
adding email reminders or campaigns.

See [known gaps](known-gaps.md) for verified native preview/layout/header and
CLI enum limitations. A rendered preview is not a delivered message. Configure
your own sending-domain/Reply-To requirements through Fóir rather than adding
an email provider or layout service to this app.
