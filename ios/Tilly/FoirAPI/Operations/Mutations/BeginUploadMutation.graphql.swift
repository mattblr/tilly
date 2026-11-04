// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct BeginUploadMutation: GraphQLMutation {
    static let operationName: String = "BeginUpload"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation BeginUpload($filename: String!, $mimeType: String!, $size: Int!) { uploadFile( filename: $filename mimeType: $mimeType size: $size visibility: PRIVATE ) { __typename uploadId uploadUrl landed { __typename endpoint token } } }"#
      ))

    public var filename: String
    public var mimeType: String
    public var size: Int32

    public init(
      filename: String,
      mimeType: String,
      size: Int32
    ) {
      self.filename = filename
      self.mimeType = mimeType
      self.size = size
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "filename": filename,
      "mimeType": mimeType,
      "size": size
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("uploadFile", UploadFile?.self, arguments: [
          "filename": .variable("filename"),
          "mimeType": .variable("mimeType"),
          "size": .variable("size"),
          "visibility": "PRIVATE"
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        BeginUploadMutation.Data.self
      ] }

      var uploadFile: UploadFile? { __data["uploadFile"] }

      /// UploadFile
      ///
      /// Parent Type: `FileUpload`
      nonisolated struct UploadFile: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.FileUpload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("uploadId", String.self),
          .field("uploadUrl", String.self),
          .field("landed", Landed.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          BeginUploadMutation.Data.UploadFile.self
        ] }

        var uploadId: String { __data["uploadId"] }
        var uploadUrl: String { __data["uploadUrl"] }
        var landed: Landed { __data["landed"] }

        /// UploadFile.Landed
        ///
        /// Parent Type: `UploadLanded`
        nonisolated struct Landed: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.UploadLanded }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("endpoint", String.self),
            .field("token", String.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            BeginUploadMutation.Data.UploadFile.Landed.self
          ] }

          var endpoint: String { __data["endpoint"] }
          var token: String { __data["token"] }
        }
      }
    }
  }

}