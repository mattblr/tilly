// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension NotificationAPI {
  nonisolated struct SaveNotificationSettingsInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      artReady: Bool,
      communityUpdates: Bool,
      reminderHour: Int32,
      streakReminders: Bool,
      timeZone: String
    ) {
      __data = InputDict([
        "artReady": artReady,
        "communityUpdates": communityUpdates,
        "reminderHour": reminderHour,
        "streakReminders": streakReminders,
        "timeZone": timeZone
      ])
    }

    var artReady: Bool {
      get { __data["artReady"] }
      set { __data["artReady"] = newValue }
    }

    var communityUpdates: Bool {
      get { __data["communityUpdates"] }
      set { __data["communityUpdates"] = newValue }
    }

    var reminderHour: Int32 {
      get { __data["reminderHour"] }
      set { __data["reminderHour"] = newValue }
    }

    var streakReminders: Bool {
      get { __data["streakReminders"] }
      set { __data["streakReminders"] = newValue }
    }

    var timeZone: String {
      get { __data["timeZone"] }
      set { __data["timeZone"] = newValue }
    }
  }

}