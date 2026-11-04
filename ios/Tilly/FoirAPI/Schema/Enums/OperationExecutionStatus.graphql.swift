// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) import ApolloAPI

extension FoirAPI {
  /// Status of an operation execution
  nonisolated enum OperationExecutionStatus: String, EnumType {
    case running = "RUNNING"
    case completed = "COMPLETED"
    case failed = "FAILED"
    case cancelled = "CANCELLED"
    case timedOut = "TIMED_OUT"
    case pending = "PENDING"
    case dispatched = "DISPATCHED"
  }

}