# Releasing the iOS app

Pushing a tag such as `ios-v1.0.1` releases the iOS app to TestFlight. The
[release workflow](../.github/workflows/release-ios.yml) runs the checks, waits
for a reviewer to approve the `release` environment, then archives, signs and
uploads the app. You test the build in TestFlight and submit it for App Review
in App Store Connect yourself.

- The tag sets the version (`ios-v1.0.1` is 1.0.1). App Store Connect picks the
  next build number, so there's nothing to bump. `CURRENT_PROJECT_VERSION` in the
  Xcode project only numbers archives you make locally.
- Signing uses an App Store Connect API key and Xcode's cloud-managed
  certificates. No certificate or provisioning profile is stored in the repository.
- The build uses the production project's publishable key and RevenueCat's App
  Store SDK key, the same values `ios/scripts/app-key.sh` writes locally.

The website, operations and Fóir configuration are released separately (see
[deployment](go-live.md)). Release them first when an iOS build needs a new
operation or field. Keep them working for the iOS builds people already have.

## One-time setup

1. **App Store Connect API key.** In App Store Connect, go to Users and Access →
   Integrations → App Store Connect API → Team Keys and generate a key with
   Admin access: signing creates or uses your cloud-managed distribution
   certificate. Note the Key ID and Issuer ID, and download the `.p8` file. Apple
   lets you download it once.
2. **GitHub environment.** In the repository's Settings → Environments, create
   `release`. Add yourself as a required reviewer. Under deployment branches and
   tags, allow only selected tags with the pattern `ios-v*`.
3. **Environment secrets and variable.** Add these to the `release` environment,
   never to the repository or a file:

   | Name | Kind | Value |
   | --- | --- | --- |
   | `APP_STORE_CONNECT_KEY_ID` | secret | The API key's Key ID |
   | `APP_STORE_CONNECT_ISSUER_ID` | secret | The Issuer ID shown above the keys |
   | `APP_STORE_CONNECT_KEY` | secret | The whole contents of the `.p8` file |
   | `TILLY_APP_KEY` | secret | The production project's publishable app key (`foir_pub_…`) |
   | `TILLY_REVENUECAT_KEY` | secret | RevenueCat's App Store public SDK key (`appl_…`) |
   | `APPLE_TEAM_ID` | variable | Your Apple Developer team ID |

   With the GitHub CLI:

   ```sh
   gh secret set APP_STORE_CONNECT_KEY --env release < AuthKey_XXXXXXXXXX.p8
   gh secret set APP_STORE_CONNECT_KEY_ID --env release
   gh secret set APP_STORE_CONNECT_ISSUER_ID --env release
   gh secret set TILLY_APP_KEY --env release
   gh secret set TILLY_REVENUECAT_KEY --env release
   gh variable set APPLE_TEAM_ID --env release
   ```

   Each `gh secret set` without a file prompts for the value, so it stays out of
   your shell history.

The workflow names any input that's missing and stops before it builds.

## Releasing a version

From an up-to-date `main`:

```sh
git tag ios-v1.0.1
git push origin ios-v1.0.1
```

Approve the run when GitHub asks. Processing in App Store Connect takes a few
minutes after the upload finishes; the build then appears in TestFlight. Test it
on a device, then add it to the version in App Store Connect and submit it for
review.

A tag on a commit `main` doesn't hold is refused.

## Runner and Xcode

The workflow runs on GitHub's `xcode-27` macOS image with Xcode 27.2. That image
is a preview. To use another hosted or self-hosted runner, set the `release`
environment variables `IOS_RELEASE_RUNNER` (a runner label) and
`IOS_RELEASE_XCODE` (an app in `/Applications`, such as `Xcode_27.2.app`).
App Store Connect accepts builds from release and release-candidate Xcode
versions, not betas.
