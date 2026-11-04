import ApolloAPI

extension SelfieAPI {
    // Reuse the application’s JSON tree; Apollo’s default String cannot decode cats.
    typealias JSON = FoirAPI.JSON
    nonisolated enum SchemaConfiguration: ApolloAPI.SchemaConfiguration {
        static func cacheKeyInfo(for type: ApolloAPI.Object, object: ApolloAPI.ObjectData) -> CacheKeyInfo? { nil }
    }
}
