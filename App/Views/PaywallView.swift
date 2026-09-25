import SwiftUI
import RevenueCat

struct PaywallView: View {
    @Environment(Pro.self) private var pro
    @Environment(ScreenTime.self) private var st
    @Environment(\.dismiss) private var dismiss
    @State private var packages: [Package] = []
    @State private var selected: Package?
    @State private var loading = true
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Color.inkSecondary)
                        .frame(width: 40, height: 40)
                        .background(Color.surface1, in: Circle())
                }
                .accessibilityLabel("Close")
            }
            ScrollView {
                VStack(spacing: 0) {
                    ZStack {
                        LapOval(color: .vault).frame(height: 150)
                        Image(systemName: "lock.open.fill")
                            .font(.system(size: 44, weight: .bold))
                            .foregroundStyle(Color.vault)
                    }
                    .frame(height: 150)
                    LapLabel(text: "THE DEAL", color: .tartan).padding(.top, 24)
                    Text("THE DEAL,\nEVERY DAY")
                        .font(.system(size: 36, weight: .black, design: .rounded))
                        .tracking(-0.5)
                        .foregroundStyle(Color.ink)
                        .multilineTextAlignment(.center)
                        .padding(.top, 8)
                    Text("Your apps stay shielded. Every lap still pays \(Format.minutes(st.secondsPerLap)). Keep the bank open.")
                        .font(.subheadline)
                        .foregroundStyle(Color.inkSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.top, 12)
                    plans.padding(.top, 32)
                }
                .padding(.horizontal, 24)
            }
            .scrollIndicators(.hidden)
            footer
        }
        .padding(.top, 12)
        .background(Color.void.ignoresSafeArea())
        .task { await load() }
    }

    private var plans: some View {
        VStack(spacing: 10) {
            if loading {
                ProgressView().tint(Color.vault).frame(height: 65)
            } else if packages.isEmpty {
                Text(pro.configured ? "The store is out of reach. Try again in a moment." : "Store not configured for this build.")
                    .font(.subheadline)
                    .foregroundStyle(Color.inkSecondary)
                    .multilineTextAlignment(.center)
                    .frame(height: 65)
            } else {
                ForEach(packages, id: \.identifier) { package in
                    planChip(package)
                }
            }
        }
    }

    private func planChip(_ package: Package) -> some View {
        let isSelected = selected?.identifier == package.identifier
        return Button {
            UISelectionFeedbackGenerator().selectionChanged()
            selected = package
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(package.storeProduct.localizedPriceString)
                            .font(.system(size: 22, weight: .black, design: .rounded))
                            .monospacedDigit()
                        Text(periodLabel(package))
                            .font(.system(size: 13, weight: .heavy, design: .rounded))
                            .tracking(0.6)
                    }
                    .foregroundStyle(isSelected ? Color.vault : Color.ink)
                    if package.packageType == .lifetime {
                        Text("Buy the track once.")
                            .font(.footnote)
                            .foregroundStyle(Color.inkSecondary)
                    }
                }
                Spacer()
                if let trial = trialLabel(package) {
                    Text(trial)
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .tracking(0.8)
                        .foregroundStyle(Color.void)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.tartan, in: Capsule())
                }
            }
            .padding(.horizontal, 22)
            .frame(height: 72)
            .background(isSelected ? Color.vaultDim : Color.surface2, in: Capsule())
            .overlay(Capsule().stroke(isSelected ? Color.vault.opacity(0.38) : Color.hairline, lineWidth: 1))
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(package.storeProduct.localizedPriceString) \(periodLabel(package))\(trialLabel(package).map { ", \($0)" } ?? "")")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private var footer: some View {
        VStack(spacing: 14) {
            if let error {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(Color.tartan)
                    .multilineTextAlignment(.center)
            }
            Button {
                Task { await buy() }
            } label: {
                Group {
                    if busy { ProgressView().tint(Color.void) } else { Text("TAKE THE DEAL") }
                }
                .font(.system(size: 20, weight: .black, design: .rounded))
                .tracking(0.6)
                .frame(maxWidth: .infinity)
                .frame(height: 68)
                .foregroundStyle(Color.void)
                .background(selected == nil ? Color.inkTertiary : Color.vault, in: Capsule())
                .contentShape(Capsule())
            }
            .buttonStyle(.plain)
            .disabled(selected == nil || busy)
            Text("Interest rate: your legs.")
                .font(.footnote)
                .foregroundStyle(Color.inkTertiary)
            HStack(spacing: 18) {
                Button("Restore") { Task { await restore() } }
                Link("Terms", destination: Pro.termsURL)
                Link("Privacy", destination: Pro.privacyURL)
            }
            .font(.footnote.weight(.semibold))
            .foregroundStyle(Color.inkSecondary)
        }
        .padding(.horizontal, 24)
        .padding(.top, 16)
        .padding(.bottom, 8)
    }

    private func periodLabel(_ package: Package) -> String {
        switch package.packageType {
        case .monthly: return "/ MO"
        case .annual: return "/ YR"
        case .lifetime: return "· FOREVER"
        case .weekly: return "/ WK"
        default: return package.storeProduct.subscriptionPeriod.map { "/ \($0.value) \(unitLabel($0.unit))" } ?? ""
        }
    }

    private func unitLabel(_ unit: SubscriptionPeriod.Unit) -> String {
        switch unit {
        case .day: return "D"
        case .week: return "WK"
        case .month: return "MO"
        case .year: return "YR"
        @unknown default: return ""
        }
    }

    private func trialLabel(_ package: Package) -> String? {
        guard let intro = package.storeProduct.introductoryDiscount, intro.paymentMode == .freeTrial else { return nil }
        let p = intro.subscriptionPeriod
        let days: Int
        switch p.unit {
        case .day: days = p.value
        case .week: days = p.value * 7
        case .month: days = p.value * 30
        case .year: days = p.value * 365
        @unknown default: days = p.value
        }
        return "\(days) DAYS FREE"
    }

    private func load() async {
        packages = await pro.offerings()
        selected = packages.first { $0.packageType == .annual } ?? packages.first
        loading = false
    }

    private func buy() async {
        guard let selected else { return }
        busy = true
        defer { busy = false }
        do {
            if try await pro.purchase(selected) {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                dismiss()
            }
        } catch {
            self.error = "That didn't go through. Nothing was charged."
        }
    }

    private func restore() async {
        busy = true
        defer { busy = false }
        do {
            if try await pro.restore() { dismiss() } else { error = "No Lap Pro found on this Apple ID." }
        } catch {
            self.error = "Couldn't reach the store. Try again."
        }
    }
}
