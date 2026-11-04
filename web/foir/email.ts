import { defineEmailCopy } from '@foir/cli/configs'

// Project email copy uses Fóir's branded layout. These are editable defaults;
// the root reconciler preserves installed edits rather than seeding over them.
const signIn = [{ label: 'Login to Tilly', url: '{base}/sign-in' }]
const securityFooter = 'If this wasn’t you, contact Tilly support. Never share a sign-in code.'
export const tillyEmailCopy = [
  { actionKey: 'email.project.otp', subject: 'Your Tilly sign-in code', heading: 'Login to Tilly',
    body: 'Enter the code below to continue to Tilly. It expires in 10 minutes.',
    footer: 'Only enter this code in Tilly. If you didn’t request it, ignore this email. Never share the code.', ctas: [] },
  { actionKey: 'email.project.welcome', subject: 'Welcome to Tilly', heading: 'Welcome to Tilly',
    body: 'Share your cat, or any you come across! Your account works on the web and in the Tilly app.',
    footer: 'If you didn’t create this account, contact Tilly support.', ctas: signIn },
  { actionKey: 'email.project.account_ready', subject: 'Your Tilly account is ready', heading: 'Your account is ready',
    body: 'You can now log in to Tilly with this email address. Choose the email-code option; you don’t need a password.',
    footer: 'If you weren’t expecting this, ignore this email or contact Tilly support.', ctas: signIn },
  { actionKey: 'email.project.address_code', subject: 'Confirm this email for Tilly', heading: 'Add your email address',
    body: 'Enter the code below to add {address} to your Tilly account. It expires in 10 minutes.',
    footer: 'If this wasn’t you, ignore this email. The address won’t be added. Never share the code.', ctas: [] },
  { actionKey: 'email.project.address_added', subject: 'An email address was added to Tilly', heading: 'An address was added',
    body: '{address} was added to your Tilly account. You can use it to log in.', footer: securityFooter, ctas: signIn },
  { actionKey: 'email.project.primary_address_changed', subject: 'Your Tilly email address changed', heading: 'Your email address changed',
    body: 'Your Tilly account now uses {address}. We’ll write to you there.', footer: securityFooter, ctas: signIn },
  { actionKey: 'email.project.sign_in_connected', subject: 'A sign-in method was added to Tilly', heading: 'A sign-in was connected',
    body: 'You can now log in to your Tilly account with {provider}.', footer: securityFooter, ctas: signIn },
  { actionKey: 'email.project.sign_in_link_code', subject: 'Connect your Tilly sign-in', heading: 'Connect your sign-in',
    body: 'Someone is logging in to your Tilly account with {provider}. Enter the code below to connect it. It expires in 10 minutes.',
    footer: 'If this wasn’t you, ignore this email. Nothing will be connected. Never share the code.', ctas: [] },
  { actionKey: 'email.project.sign_up_address_held', subject: 'Login to your Tilly account', heading: 'You can log in to Tilly',
    body: 'Someone tried to sign up with this email address. You already have a Tilly account, so use the email-code option to log in.',
    footer: 'If this wasn’t you, your account is unchanged. You can ignore this email.', ctas: signIn },
  { actionKey: 'email.project.sign_in_no_account', subject: 'Your Tilly sign-in request', heading: 'Your sign-in request',
    body: 'We couldn’t complete this sign-in. Tilly may not be open for new accounts yet. If you expected access, contact Tilly support.',
    footer: 'If you didn’t request this, ignore this email.', ctas: signIn },
  { actionKey: 'email.project.opt_in_confirmation', subject: 'Confirm your Tilly emails', heading: 'Confirm your emails',
    body: 'Use the button below to confirm that you want to receive {category} emails from Tilly. The link works for 7 days.',
    footer: 'If you didn’t ask for this, ignore this email. Your preferences won’t change.', ctas: [{ label: 'Confirm emails', url: '{confirm_url}' }] },
  { actionKey: 'email.project.waitlist_confirmation', subject: 'You’re on the Tilly waitlist', heading: 'You’re on the list',
    body: 'Thanks for your interest in Tilly. We’ll email you when there’s a place for you.',
    footer: 'If you didn’t ask to join, ignore this email.', ctas: [] },
  { actionKey: 'email.project.waitlist_approved', subject: 'Your place on Tilly is ready', heading: 'Come meet the neighbourhood',
    body: 'You can now create your Tilly account with this email address. Share your cat, or any you come across!',
    footer: 'If you didn’t ask to join, ignore this email.', ctas: [{ label: 'Join Tilly', url: '{base}/sign-in' }] },
].map(copy => defineEmailCopy({ ...copy, locale: 'en-GB', scope: 'project' }))

// App-notification copy is authored by the sending operation from ui-copy.
// Fóir does not read stored overrides for email.project.notification; do not
// create an override that looks editable but has no effect on delivery.
