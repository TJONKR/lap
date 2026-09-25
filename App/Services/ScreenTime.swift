import Foundation
import FamilyControls
import DeviceActivity
import Observation
import UserNotifications
#if canImport(ActivityKit)
import ActivityKit
#endif

/// Owns the time bank: laps deposit seconds, spending them lifts the shield for that long.
@Observable
final class ScreenTime {
    var authorized = AuthorizationCenter.shared.authorizationStatus == .approved
    var selection = Shield.selection() { didSet { Shield.save(selection); if unlockedUntil == nil { Shield.block() } } }
    var bankSeconds: TimeInterval = Shared.defaults.double(forKey: Shared.Key.bankSeconds) {
        didSet { Shared.defaults.set(bankSeconds, forKey: Shared.Key.bankSeconds) }
    }
    var unlockedUntil: Date? = Shield.unlockedUntil
    var unlockError: String?
    var secondsPerLap: TimeInterval = Shared.defaults.object(forKey: Shared.Key.secondsPerLap) as? Double ?? 15 * 60 {
        didSet { Shared.defaults.set(secondsPerLap, forKey: Shared.Key.secondsPerLap) }
    }
    var totalLaps: Int = Shared.defaults.integer(forKey: Shared.Key.totalLaps) {
        didSet { Shared.defaults.set(totalLaps, forKey: Shared.Key.totalLaps) }
    }

    /// DeviceActivity schedules must span at least 15 minutes.
    static let minimumSpend: TimeInterval = 15 * 60

    /// Spending is behind Lap Pro. Banking laps is not. Fail-closed: without the entitlement the shield stays up.
    var entitled: () -> Bool = { true }
    var onPaywallNeeded: () -> Void = {}

    var hasSelection: Bool {
        !(selection.applicationTokens.isEmpty && selection.categoryTokens.isEmpty && selection.webDomainTokens.isEmpty)
    }

    func requestAuthorization() async {
        do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            authorized = true
            if unlockedUntil == nil { Shield.block() }
        } catch {
            authorized = false
        }
    }

    /// The first banked lap is when the paywall shows: the runner has felt both sides of the deal.
    func deposit(laps: Int) {
        let firstEver = totalLaps == 0 && laps > 0
        totalLaps += laps
        bankSeconds += Double(laps) * secondsPerLap
        if firstEver, !entitled() { onPaywallNeeded() }
    }

    /// Spend `seconds` from the bank: shield lifts now and the monitor extension re-applies it when the window ends.
    func spend(_ seconds: TimeInterval) {
        let amount = min(seconds, bankSeconds)
        guard amount >= Self.minimumSpend, unlockedUntil == nil, authorized, hasSelection else { return }
        guard entitled() else { onPaywallNeeded(); return }
        let until = Date.now.addingTimeInterval(amount)
        do {
            try scheduleRelock(at: until)
        } catch {
            unlockError = "Couldn’t schedule the lock. Your apps are still blocked and your time is safe. Try again."
            return
        }
        unlockError = nil
        bankSeconds -= amount
        Shield.unblock(until: until)
        unlockedUntil = until
        startLiveActivity(until: until)
        scheduleLockedNotification(at: until)
    }

    func relockNow() {
        DeviceActivityCenter().stopMonitoring([Shared.unlockActivity])
        Shield.block()
        unlockedUntil = nil
        endLiveActivity()
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["lap.locked"])
    }

    /// Called on foreground: if the window expired while we were away, reflect that.
    func refresh() {
        authorized = AuthorizationCenter.shared.authorizationStatus == .approved
        unlockedUntil = Shield.unlockedUntil
        if unlockedUntil == nil, authorized, hasSelection { Shield.block() }
    }

    /// "Time's up" ping when the extension re-locks in the background.
    private func scheduleLockedNotification(at date: Date) {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { _, _ in }
        let content = UNMutableNotificationContent()
        content.title = "Time's up"
        content.body = "Apps are locked again. Run a lap to earn more."
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, date.timeIntervalSinceNow), repeats: false)
        center.removePendingNotificationRequests(withIdentifiers: ["lap.locked"])
        center.add(UNNotificationRequest(identifier: "lap.locked", content: content, trigger: trigger))
    }

    // MARK: - Live Activity

    #if canImport(ActivityKit)
    private func startLiveActivity(until: Date) {
        endLiveActivity()
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let state = UnlockAttributes.ContentState(unlockUntil: until)
        _ = try? Activity<UnlockAttributes>.request(
            attributes: UnlockAttributes(totalLaps: totalLaps),
            content: .init(state: state, staleDate: until),
            pushType: nil)
    }

    private func endLiveActivity() {
        for activity in Activity<UnlockAttributes>.activities {
            Task { await activity.end(nil, dismissalPolicy: .immediate) }
        }
    }
    #else
    private func startLiveActivity(until: Date) {}
    private func endLiveActivity() {}
    #endif

    private func scheduleRelock(at date: Date) throws {
        let cal = Calendar.current
        let start = cal.dateComponents([.hour, .minute, .second], from: .now)
        let end = cal.dateComponents([.hour, .minute, .second], from: date)
        let schedule = DeviceActivitySchedule(intervalStart: start, intervalEnd: end, repeats: false)
        let center = DeviceActivityCenter()
        center.stopMonitoring([Shared.unlockActivity])
        try center.startMonitoring(Shared.unlockActivity, during: schedule)
    }
}
