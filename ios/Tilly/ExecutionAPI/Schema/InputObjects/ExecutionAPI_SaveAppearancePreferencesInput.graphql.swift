// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct SaveAppearancePreferencesInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      consentVersion: GraphQLNullable<String> = nil,
      enabled: Bool
    ) {
      __data = InputDict([
        "consentVersion": consentVersion,
        "enabled": enabled
      ])
    }

    var consentVersion: GraphQLNullable<String> {
      get { __data["consentVersion"] }
      set { __data["consentVersion"] = newValue }
    }

    var enabled: Bool {
      get { __data["enabled"] }
      set { __data["enabled"] = newValue }
    }
  }

}