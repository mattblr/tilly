import ApolloAPI

extension SafetyAPI {
    nonisolated enum SchemaConfiguration: ApolloAPI.SchemaConfiguration {
        static func cacheKeyInfo(for type: ApolloAPI.Object, object: ApolloAPI.ObjectData) -> CacheKeyInfo? { nil }
    }
}
