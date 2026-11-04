# Pagination

Always follow platform connection cursors; a first page is not a complete list.
The table maps these shared patterns to Tilly's current screens. Apply the same
continuation and completeness rules to the refactored app's queries.

| Surface                                                | Web                                                                                                    | iOS                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Following and profile posts                            | Cursor sources, merged lanes, More controls                                                            | Paged sources; load near the last visible row                                                   |
| Trending                                               | Paged ranked hydration and public fallback; nearby board fetched fully and shown in slices             | Paged public fallback and ranked hydration; nearby board shown in slices                        |
| Cat photos and story                                   | 20 photos per page; carousel prefetch near the end plus More catches; notes/art fully paged            | Biography supplies first 20; inline/full-screen galleries and timeline request subsequent pages |
| Profiles, original posts, photos and artwork for cards | Connection helper drains lookup pages, including empty intermediate pages                              | Paging.all drains each batch of at most 100 filter values                                       |
| Follows, followers, requests, liked captures                       | Own relations read through every page; profile Likes/Reposts paginate posts                            | Relationships and like membership fully paged; username search loads on scroll                  |
| Nearby camera suggestions                              | Entire location connection read before deduplicating cats                                              | Entire location/photo connections read before local matching                                    |
| Map points and sparse cells                            | Paged location/record queries; newest-photo search stops when each requested cat has a result          | Same bounded search and continuation pattern                                                    |
| Map area counts                                        | Aggregate requests partitioned into at most eight parent cells                                         | Same partition: at most 256 child groups per request, below the 500-group ceiling               |
| Shared copy, note tags, streak tiers                   | All record pages; inline CMS arrays are returned as complete field values                              | All record pages; inline copy arrays are complete field values                                  |
| Premium/account records                                | All relevant grant pages; one-profile/one-account reads are singular lookups                           | Premium presence uses totalCount; own catches/streak history follow every page                  |
| Console trials and photo picker                        | Explicit More controls; fresh gallery heads reset their continuation and discard stale in-flight pages | Not a native surface                                                                            |
| Console words, tiers, tags, grants, profiles           | Full paged reads using the placement session                                                           | Not a native surface                                                                            |

The homepage's 16 recent captures are an intentional preview, not a complete
feed. Counts use totalCount. Reads for a single record, newest photo, existence,
username conflict or a count do not need a continuation. Local option lists
(theme, period, mood selection), navigation arrays and avatar traits are finite.

Global ranked aggregates have no cursor and a 1,000-group limit. Web and iOS
refuse a truncated ranking with a visible error rather than treating it as a
complete list; choose a narrower period or place. This is distinct from the
cursor-paginated posts beneath the ranking.
