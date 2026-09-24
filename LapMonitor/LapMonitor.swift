import DeviceActivity
import ManagedSettings

/// Re-applies the shield when an unlock window ends, even if the app is not running.
final class LapMonitor: DeviceActivityMonitor {
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        guard activity == Shared.unlockActivity else { return }
        Shield.block()
    }
}
