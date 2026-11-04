import ApolloAPI

extension NotificationAPI {
    /// Notifications share the native session, but have their own generated
    /// schema contract. They use the same default cache identity policy.
    nonisolated enum SchemaConfiguration: ApolloAPI.SchemaConfiguration {
        static func cacheKeyInfo(for type: ApolloAPI.Object, object: ApolloAPI.ObjectData) -> CacheKeyInfo? { nil }
    }
}
