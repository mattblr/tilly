# Deployment and rollback

Deployment is separate from local preparation. Use your own account, domains,
scoped keys and selected Fóir project. Keep signing/provider credentials and
release receipts private. A website build does not activate payments or submit
an app to a store.

1. Record current Worker versions, routes/DNS, environment inputs, manifest,
   auth returns and webhook endpoints privately. Preserve a working rollback.
2. Prepare the target using the single root config and its own user pool.
   Review grants and CMS content without broad prune/release. Regenerate actual
   scoped clients and restore native operation policies after install updates.
3. Build the one web/console/operation artifact. Keep published reads separate
   from [authenticated preview](web-preview.md); keep optional paid switches off
   until their supported contract and provider setup are configured.
4. Deploy the replacement host before switching traffic. Verify HTTPS, CMS,
   signed-in/out reads, private files, hosted sessions, dispatch verification,
   callbacks and native continuations on that host.
5. Migrate native configuration, installed operation/manifest URLs, login returns
   and inbound webhooks. Inspect the exact proposed changes and retain the old
   route until those dependencies are moved. Review [known gaps](known-gaps.md)
   before changing an installation's manifest address.
6. Switch the reviewed routing/DNS changes and observe actual behavior. Check
   the public domain, session changes and narrowed media independently of the
   deployment response.

Rollback restores the recorded Worker version and routing. Do not automatically
delete records, revoke credentials or roll schema back as a website rollback.
Keep resources needed by the previous version. Inspect in-flight Fóir operations
before disabling their endpoints and verify restored traffic with the same
identity/media boundaries.
