# Account deletion

This describes the template integration, illustrated by Tilly. Preserve the
shared integration when adapting the app; change its product rules and content
to match the new application.

Account settings on iOS and web expose **Delete account** through Fóir's
`deleteMyAccount(confirm: true)`. No recipient ID, admin credential or custom
deletion operation is accepted. Recent authentication, explicit confirmation
and cancellation protect the action; reauthentication does not submit deletion.
Changing accounts invalidates the previous confirmation.

A successful response closes the account and revokes sessions. Returned counts
refer to queued erasure, not completed destruction. The UI explains that owned
data removal continues in the background. A refused request preserves the active
account and offers retry or reauthentication.

After acceptance, clients clear local session/private state and notification
enrolment. In-flight responses remain bound to the initiating account; cleanup
cannot clear a replacement session. The hosted session SDK owns disposal and
late-exchange refusal. Cleanup after accepted deletion does not depend on a new
authenticated request with a revoked session.

Deleting an account does not cancel Apple or other provider billing. The
confirmation links to Apple subscription settings and the web portal when that
integration is enabled. Configure your own accurate policy for provider records,
retention and erasure; do not promise an erasure deadline from an API count.
For Apple-linked accounts, configure and verify supported remote authorization
revocation separately from local sign-out.

References: [Fóir data deletion](https://docs.foir.dev/data-portability),
[Apple account deletion](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion).
