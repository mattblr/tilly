import ApolloAPI

extension ChallengeAPI {
    typealias JSON = FoirAPI.JSON
    nonisolated enum SchemaConfiguration: ApolloAPI.SchemaConfiguration {
        static func cacheKeyInfo(for type: ApolloAPI.Object, object: ApolloAPI.ObjectData) -> CacheKeyInfo? { nil }
    }
}
