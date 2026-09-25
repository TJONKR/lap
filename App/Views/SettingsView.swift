import SwiftUI
import FamilyControls

struct SettingsView: View {
    @Environment(ScreenTime.self) private var st
    @Environment(LapTracker.self) private var tracker
    @Environment(Pro.self) private var pro
    @Environment(\.dismiss) private var dismiss
    @State private var showPicker = false
    @State private var showPaywall = false
    @State private var restoring = false
    @State private var restoreMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 32) {
                    header
                    apps
                    membership
                    deal
                    record
                    Text("A lap in the legs. Minutes in the bank.")
                        .font(.footnote)
                        .foregroundStyle(Color.inkTertiary)
                        .frame(maxWidth: .infinity)
                        .padding(.bottom, 24)
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)
            }
            .scrollIndicators(.hidden)
            .background(Color.void.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
            .familyActivityPicker(isPresented: $showPicker, selection: Bindable(st).selection)
            .sheet(isPresented: $showPaywall) { PaywallView() }
            .alert("Restore purchases", isPresented: Binding(
                get: { restoreMessage != nil },
                set: { if !$0 { restoreMessage = nil } }
            )) {
                Button("OK") { restoreMessage = nil }
            } message: {
                Text(restoreMessage ?? "")
            }
        }
    }

    private var planName: String {
        switch pro.planProductID {
        case let id? where id.hasSuffix(".monthly"): return "Monthly"
        case let id? where id.hasSuffix(".annual"): return "Annual"
        case let id? where id.hasSuffix(".lifetime"): return "Forever"
        case .some: return "Active"
        case nil: return "Not active"
        }
    }

    private var membership: some View {
        VStack(alignment: .leading, spacing: 12) {
            LapLabel(text: "LAP PRO")
            VStack(alignment: .leading, spacing: 17) {
                HStack(alignment: .top, spacing: 14) {
                    Image(systemName: pro.entitled ? "checkmark.seal.fill" : "seal")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(pro.entitled ? Color.vault : Color.tartan)
                        .frame(width: 28)
                    VStack(alignment: .leading, spacing: 5) {
                        Text(planName)
                            .font(.headline)
                            .foregroundStyle(Color.ink)
                        Text(pro.entitled ? "The bank is open. Spend what you run." : "Laps bank without it. Spending needs it.")
                            .font(.subheadline)
                            .foregroundStyle(Color.inkSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                Rectangle().fill(Color.hairline).frame(height: 1)
                HStack {
                    Button {
                        showPaywall = true
                    } label: {
                        HStack {
                            Text(pro.entitled ? "SEE THE DEAL" : "TAKE THE DEAL")
                            Image(systemName: "arrow.up.right")
                        }
                        .font(.system(size: 13, weight: .black, design: .rounded))
                        .tracking(0.6)
                        .foregroundStyle(Color.vault)
                        .contentShape(Rectangle())
                    }
                    Spacer()
                    Button {
                        Task { await restore() }
                    } label: {
                        Text(restoring ? "RESTORING…" : "RESTORE PURCHASES")
                            .font(.system(size: 13, weight: .black, design: .rounded))
                            .tracking(0.6)
                            .foregroundStyle(Color.inkSecondary)
                            .contentShape(Rectangle())
                    }
                    .disabled(restoring || !pro.configured)
                }
            }
            .padding(20)
            .background(Color.surface1, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.hairline, lineWidth: 1))
        }
    }

    private func restore() async {
        restoring = true
        defer { restoring = false }
        do {
            restoreMessage = try await pro.restore() ? "Lap Pro is back on this device." : "No Lap Pro found on this Apple ID."
        } catch {
            restoreMessage = "Couldn't reach the store. Try again."
        }
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 7) {
                LapLabel(text: "BEHIND THE SCENES", color: .tartan)
                Text("Settings")
                    .font(.system(size: 36, weight: .heavy, design: .rounded))
                    .foregroundStyle(Color.ink)
            }
            Spacer()
            Button("Done") { dismiss() }
                .font(.system(.subheadline, design: .rounded, weight: .bold))
                .foregroundStyle(Color.ink)
                .padding(.horizontal, 18)
                .frame(height: 44)
                .background(Color.surface2, in: Capsule())
                .accessibilityLabel("Close settings")
        }
    }

    private var apps: some View {
        VStack(alignment: .leading, spacing: 12) {
            LapLabel(text: "THE SHIELD")
            VStack(alignment: .leading, spacing: 17) {
                HStack(alignment: .top, spacing: 14) {
                    Image(systemName: st.authorized ? "lock.shield.fill" : "lock.shield")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(st.authorized ? Color.vault : Color.tartan)
                        .frame(width: 28)
                    VStack(alignment: .leading, spacing: 5) {
                        Text(st.hasSelection ? "Apps picked" : "No apps picked yet")
                            .font(.headline)
                            .foregroundStyle(Color.ink)
                        Text(st.authorized ? "Choose the apps that wait behind your shield." : "Allow Screen Time access to choose the apps you want to shield.")
                            .font(.subheadline)
                            .foregroundStyle(Color.inkSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                Rectangle().fill(Color.hairline).frame(height: 1)
                Button {
                    if st.authorized {
                        showPicker = true
                    } else {
                        Task { await st.requestAuthorization() }
                    }
                } label: {
                    HStack {
                        Text(st.authorized ? (st.hasSelection ? "CHANGE APPS" : "PICK APPS") : "ALLOW ACCESS")
                        Spacer()
                        Image(systemName: "arrow.up.right")
                    }
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .tracking(0.6)
                    .foregroundStyle(Color.tartan)
                    .contentShape(Rectangle())
                }
            }
            .padding(20)
            .background(Color.surface1, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.hairline, lineWidth: 1))
        }
    }

    private var deal: some View {
        VStack(alignment: .leading, spacing: 12) {
            LapLabel(text: "THE DEAL")
            LapDealChip(meters: tracker.lapMeters, seconds: st.secondsPerLap)
            VStack(spacing: 0) {
                Stepper(value: Bindable(tracker).lapMeters, in: 200...2000, step: 100) {
                    VStack(alignment: .leading, spacing: 5) {
                        LapLabel(text: "LAP LENGTH", color: .tartan)
                        Text(Format.meters(tracker.lapMeters))
                            .font(.system(size: 22, weight: .heavy, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(Color.ink)
                    }
                }
                .tint(.tartan)
                .accessibilityLabel("Lap length, \(Format.meters(tracker.lapMeters))")
                Rectangle().fill(Color.hairline).frame(height: 1).padding(.vertical, 20)
                Stepper(value: Bindable(st).secondsPerLap, in: 300...3600, step: 300) {
                    VStack(alignment: .leading, spacing: 5) {
                        LapLabel(text: "PER LAP", color: .vault)
                        Text(Format.minutes(st.secondsPerLap))
                            .font(.system(size: 22, weight: .heavy, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(Color.ink)
                    }
                }
                .tint(.vault)
                .accessibilityLabel("Minutes per lap, \(Format.minutes(st.secondsPerLap))")
            }
            .padding(20)
            .background(Color.surface1, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.hairline, lineWidth: 1))
        }
    }

    private var record: some View {
        VStack(alignment: .leading, spacing: 12) {
            LapLabel(text: "YOUR RECORD")
            HStack(spacing: 0) {
                statistic("LAPS RUN", value: "\(st.totalLaps)", color: .ink)
                Rectangle().fill(Color.hairline).frame(width: 1, height: 54)
                statistic("IN THE BANK", value: Format.minutes(st.bankSeconds), color: .vault)
            }
            .padding(.vertical, 20)
            .background(Color.surface1, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.hairline, lineWidth: 1))
        }
    }

    private func statistic(_ title: String, value: String, color: Color) -> some View {
        VStack(spacing: 8) {
            LapLabel(text: title)
            Text(value)
                .font(.system(size: 24, weight: .black, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }
}
