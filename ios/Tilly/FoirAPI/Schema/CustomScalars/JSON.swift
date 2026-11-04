// @generated
// This file was automatically generated and can be edited to
// implement advanced custom scalar functionality.
//
// Any changes to this file will not be overwritten by future
// code generation execution.

@_spi(Internal) @_spi(Execution) import ApolloAPI
import Foundation

extension FoirAPI {
  /// Arbitrary JSON value, held as a tree so the app reads it without casting
  /// from `Any`. A record's `content` from a location search arrives as one.
  enum JSON: CustomScalarType, Hashable, Sendable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSON])
    case object([String: JSON])

    init(_jsonValue value: JSONValue) throws {
      self = try JSON(any: value)
    }

    private init(any value: Any) throws {
      switch value {
      case is NSNull:
        self = .null
      case let number as NSNumber:
        // JSONSerialization hands booleans over as NSNumber too.
        self = CFGetTypeID(number) == CFBooleanGetTypeID() ? .bool(number.boolValue) : .number(number.doubleValue)
      case let string as String:
        self = .string(string)
      case let array as [Any]:
        self = .array(try array.map(JSON.init(any:)))
      case let object as [String: Any]:
        self = .object(try object.mapValues(JSON.init(any:)))
      default:
        throw JSONDecodingError.couldNotConvert(value: String(describing: value), to: JSON.self)
      }
    }

    var _jsonValue: JSONValue {
      switch self {
      case .null: NSNull()
      case .bool(let value): value
      case .number(let value): value
      case .string(let value): value
      case .array(let values): values.map { $0._jsonValue } as JSONValue
      case .object(let values): values.mapValues { $0._jsonValue } as JSONValue
      }
    }

    subscript(key: String) -> JSON? {
      if case .object(let values) = self { values[key] } else { nil }
    }

    var string: String? {
      if case .string(let value) = self { value } else { nil }
    }

    var number: Double? {
      if case .number(let value) = self { value } else { nil }
    }

    var array: [JSON]? {
      if case .array(let values) = self { values } else { nil }
    }
  }
}
