import Foundation

#if canImport(ActivityKit)
import ActivityKit

/// Shared by the app (starts/updates the activity) and the widget extension (renders it).
struct UnlockAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var unlockUntil: Date
    }
    var totalLaps: Int
}
#endif
