import SwiftUI

@main
struct LapApp: App {
    @State private var screenTime = ScreenTime()
    @State private var tracker = LapTracker()
    @State private var onboarded = Shared.defaults.bool(forKey: Shared.Key.hasCompletedOnboarding)
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            if onboarded {
                HomeView()
                    .environment(screenTime)
                    .environment(tracker)
                    .preferredColorScheme(.dark)
                    .onChange(of: phase) { _, p in if p == .active { screenTime.refresh() } }
            } else {
                OnboardingView { onboarded = true }
                    .environment(screenTime)
                    .environment(tracker)
                    .preferredColorScheme(.dark)
            }
        }
    }
}

enum Format {
    static func minutes(_ s: TimeInterval) -> String {
        let m = Int(s / 60)
        return m >= 60 ? "\(m / 60)h \(m % 60)m" : "\(m) min"
    }
    static func clock(_ s: TimeInterval) -> String {
        let t = Int(s)
        return String(format: "%02d:%02d", t / 60, t % 60)
    }
    static func meters(_ d: Double) -> String {
        d >= 1000 ? String(format: "%.2f km", d / 1000) : "\(Int(d)) m"
    }
}
