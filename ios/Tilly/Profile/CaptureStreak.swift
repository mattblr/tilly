import Foundation

/// One ordinary streak across all captures; post highlights never create another streak.
struct CaptureStreak: Equatable, Sendable {
    let current: Int
    let best: Int
    let caughtToday: Bool

    init(_ dates: [Date], now: Date = .now, calendar: Calendar = .current) {
        let days = Set(dates.filter { $0 <= now }.map { calendar.startOfDay(for: $0) })
        let today = calendar.startOfDay(for: now)
        caughtToday = days.contains(today)
        var day = caughtToday ? today : calendar.date(byAdding: .day, value: -1, to: today)!
        var run = 0
        while days.contains(day) {
            run += 1
            day = calendar.date(byAdding: .day, value: -1, to: day)!
        }
        current = run
        var longest = 0, length = 0
        var previous: Date?
        for day in days.sorted() {
            length = previous.flatMap { calendar.date(byAdding: .day, value: 1, to: $0) } == day ? length + 1 : 1
            longest = max(longest, length)
            previous = day
        }
        best = longest
    }
}
