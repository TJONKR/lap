import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity

enum Shared {
    static let appGroup = "group.nl.lerai.lap"
    static let defaults = UserDefaults(suiteName: appGroup)!
    static let store = ManagedSettingsStore(named: .init("lap"))
    static let unlockActivity = DeviceActivityName("lap.unlock")

    enum Key {
        static let selection = "selection"
        static let bankSeconds = "bankSeconds"
        static let unlockedUntil = "unlockedUntil"
        static let secondsPerLap = "secondsPerLap"
        static let lapMeters = "lapMeters"
        static let totalLaps = "totalLaps"
    }
}

/// Applies or lifts the shield for the user's picked apps. Used by both the app and the monitor extension.
enum Shield {
    static func selection() -> FamilyActivitySelection {
        guard let data = Shared.defaults.data(forKey: Shared.Key.selection),
              let sel = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
        else { return FamilyActivitySelection() }
        return sel
    }

    static func save(_ sel: FamilyActivitySelection) {
        Shared.defaults.set(try? JSONEncoder().encode(sel), forKey: Shared.Key.selection)
    }

    static func block() {
        let sel = selection()
        Shared.store.shield.applications = sel.applicationTokens.isEmpty ? nil : sel.applicationTokens
        Shared.store.shield.applicationCategories = sel.categoryTokens.isEmpty ? nil : .specific(sel.categoryTokens)
        Shared.store.shield.webDomains = sel.webDomainTokens.isEmpty ? nil : sel.webDomainTokens
        Shared.defaults.removeObject(forKey: Shared.Key.unlockedUntil)
    }

    static func unblock(until date: Date) {
        Shared.store.shield.applications = nil
        Shared.store.shield.applicationCategories = nil
        Shared.store.shield.webDomains = nil
        Shared.defaults.set(date.timeIntervalSince1970, forKey: Shared.Key.unlockedUntil)
    }

    static var unlockedUntil: Date? {
        let t = Shared.defaults.double(forKey: Shared.Key.unlockedUntil)
        guard t > 0 else { return nil }
        let d = Date(timeIntervalSince1970: t)
        return d > .now ? d : nil
    }
}
