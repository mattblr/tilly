import Foundation

extension Foir {
    /// Uploads a photo the signed-in user took and answers its file id.
    ///
    /// Fóir hands out a slot, the bytes go straight to storage, and the slot is
    /// then closed on its landing route, which is when the file exists.
    func upload(jpeg: Data, filename: String, ifIdentity expected: TokenStore.Identity? = nil) async throws -> String {
        let identity = if let expected { expected } else { await tokens.identity }
        let begun = try await perform(FoirAPI.BeginUploadMutation(filename: filename, mimeType: "image/jpeg", size: Int32(jpeg.count)), ifIdentity: identity)
        guard let slot = begun.uploadFile, let storage = URL(string: slot.uploadUrl) else {
            throw FoirError(message: "There was nowhere to upload the photo.", code: nil)
        }

        var put = URLRequest(url: storage)
        put.httpMethod = "PUT"
        put.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")
        try Self.expectSuccess(try await URLSession.shared.upload(for: put, from: jpeg), doing: "upload the photo")

        guard let landing = URL(string: slot.landed.endpoint, relativeTo: config.graphQLURL)?.absoluteURL else {
            throw FoirError(message: "The upload had no landing route.", code: nil)
        }
        var landed = URLRequest(url: landing)
        landed.httpMethod = "POST"
        landed.setValue("application/json", forHTTPHeaderField: "Content-Type")
        landed.setValue(config.appKey, forHTTPHeaderField: "x-api-key")
        landed.setValue(slot.landed.token, forHTTPHeaderField: "X-Foir-Token")
        if let token = try await tokens.accessToken(ifIdentity: identity) {
            landed.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        landed.httpBody = Data("{}".utf8)
        let finished = try await URLSession.shared.data(for: landed)
        guard await tokens.identity == identity else { throw TokenStore.SessionError.changed }
        try Self.expectSuccess(finished, doing: "finish the upload")
        struct UploadedFile: Decodable { let id: String }
        let file = try JSONDecoder().decode(UploadedFile.self, from: finished.0)
        guard !file.id.isEmpty else { throw FoirError(message: "The upload returned no file.", code: nil) }
        return file.id
    }

    private static func expectSuccess(_ result: (Data, URLResponse), doing what: String) throws {
        let status = (result.1 as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            throw FoirError(message: "Couldn't \(what) (HTTP \(status)).", code: nil)
        }
    }
}
