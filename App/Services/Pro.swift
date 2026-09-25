import Foundation
import Observation
import RevenueCat

extension Shared.Key {
    static let creatorCode = "creatorCode"
    static let heardFrom = "heardFrom"
}

/// Lap Pro: one entitlement in front of spending. Laps bank without it; the vault only opens with it.
@Observable
final class Pro {
    static let entitlement = "pro"
    static let termsURL = URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!
    static let privacyURL = URL(string: "https://lerai.nl/lap/privacy")!

    private(set) var configured = false
    private(set) var entitled = false
    private(set) var planProductID: String?
    var showPaywall = false

    var isPro: Bool {
        #if DEBUG
        if !configured { return true }
        #endif
        return entitled
    }

    /// Reads `RevenueCatAPIKey` from Info.plist (set `REVENUECAT_API_KEY` when running xcodegen).
    func configure() {
        guard !Purchases.isConfigured else { return }
        let key = Bundle.main.object(forInfoDictionaryKey: "RevenueCatAPIKey") as? String ?? ""
        guard key.hasPrefix("appl_") else {
            print("Pro: RevenueCatAPIKey missing — purchases disabled")
            return
        }
        #if DEBUG
        Purchases.logLevel = .debug
        #endif
        Purchases.configure(withAPIKey: key)
        configured = true
        replayAttribution()
        Task { [weak self] in
            for await info in Purchases.shared.customerInfoStream {
                self?.apply(info)
            }
        }
    }

    /// Tags this customer for the affiliate service. First value wins; later calls are ignored.
    func attribute(creatorCode: String?, heardFrom: String?) {
        let code = Self.normalize(creatorCode)
        if Shared.defaults.string(forKey: Shared.Key.creatorCode) == nil, let code {
            Shared.defaults.set(code, forKey: Shared.Key.creatorCode)
        }
        if Shared.defaults.string(forKey: Shared.Key.heardFrom) == nil, let heardFrom, !heardFrom.isEmpty {
            Shared.defaults.set(heardFrom, forKey: Shared.Key.heardFrom)
        }
        replayAttribution()
    }

    static func normalize(_ raw: String?) -> String? {
        let code = (raw ?? "").uppercased().filter { $0.isLetter || $0.isNumber }
        return code.isEmpty ? nil : code
    }

    func offerings() async -> [Package] {
        guard configured else { return [] }
        let offering = try? await Purchases.shared.offerings().current
        return offering?.availablePackages ?? []
    }

    /// Returns true if the customer now holds the entitlement.
    func purchase(_ package: Package) async throws -> Bool {
        let result = try await Purchases.shared.purchase(package: package)
        apply(result.customerInfo)
        return !result.userCancelled && entitled
    }

    func restore() async throws -> Bool {
        apply(try await Purchases.shared.restorePurchases())
        return entitled
    }

    private func apply(_ info: CustomerInfo) {
        let e = info.entitlements[Self.entitlement]
        entitled = e?.isActive == true
        planProductID = e?.isActive == true ? e?.productIdentifier : nil
    }

    private func replayAttribution() {
        guard configured else { return }
        var attributes: [String: String] = [:]
        if let code = Shared.defaults.string(forKey: Shared.Key.creatorCode) {
            attributes["creator_code"] = code
            Purchases.shared.attribution.setCampaign(code)
        }
        if let heardFrom = Shared.defaults.string(forKey: Shared.Key.heardFrom) {
            attributes["heard_from"] = heardFrom
        }
        if !attributes.isEmpty { Purchases.shared.attribution.setAttributes(attributes) }
    }
}
