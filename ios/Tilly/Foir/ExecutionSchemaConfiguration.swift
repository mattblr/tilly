import ApolloAPI

extension ExecutionAPI {
    typealias JSON = FoirAPI.JSON
    nonisolated enum SchemaConfiguration: ApolloAPI.SchemaConfiguration {
        static func cacheKeyInfo(for type: ApolloAPI.Object, object: ApolloAPI.ObjectData) -> CacheKeyInfo? { nil }
    }
}
