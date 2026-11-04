import Foundation

@main struct StreakChecks {
    static func main() {
        let parser = ISO8601DateFormatter()
        let now = parser.date(from: "2026-10-26T12:00:00Z")!
        var london = Calendar(identifier: .gregorian)
        london.timeZone = TimeZone(identifier: "Europe/London")!
        func date(_ value: String) -> Date { parser.date(from: value)! }
        let first = date("2026-10-24T23:30:00Z")
        let current = CaptureStreak([first, first, date("2026-10-25T12:00:00Z"), date("2026-10-26T10:00:00Z")], now: now, calendar: london)
        precondition(current.current == 2 && current.best == 2 && current.caughtToday)
        let yesterday = CaptureStreak([date("2026-10-25T12:00:00Z")], now: now, calendar: london)
        precondition(yesterday.current == 1 && !yesterday.caughtToday)
        let broken = CaptureStreak([date("2026-10-23T12:00:00Z"), date("2026-10-24T12:00:00Z")], now: now, calendar: london)
        precondition(broken.current == 0 && broken.best == 2)
        let future = CaptureStreak([date("2027-01-01T00:00:00Z")], now: now, calendar: london)
        precondition(future.current == 0 && future.best == 0)
        var pacific = london
        pacific.timeZone = TimeZone(identifier: "America/Los_Angeles")!
        let boundary = [date("2026-10-26T00:30:00Z")]
        precondition(!CaptureStreak(boundary, now: now, calendar: pacific).caughtToday)
        precondition(CaptureStreak(boundary, now: now, calendar: london).caughtToday)
        print("Native streak: duplicate captures, DST/time zones, yesterday grace, broken runs and future dates passed.")
    }
}
