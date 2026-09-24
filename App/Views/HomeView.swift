import SwiftUI
import FamilyControls
import UIKit
import Combine

struct HomeView: View {
    @Environment(ScreenTime.self) private var st
    @Environment(LapTracker.self) private var tracker
    @State private var showRun = false
    @State private var showSettings = false
    @State private var showPicker = false
    @State private var now = Date.now

    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    header
                    bank.padding(.top, 30)
                    LapDealChip(meters: tracker.lapMeters, seconds: st.secondsPerLap)
                        .padding(.top, 18)
                    if !st.authorized {
                        setupCard(number: "01", title: "GIVE LAP THE KEYS",
                                  detail: "Allow Screen Time access to shield your apps.", action: "ALLOW ACCESS") {
                            Task { await st.requestAuthorization() }
                        }
                        .padding(.top, 34)
                        #if targetEnvironment(simulator)
                        Text("Screen Time access needs a physical iPhone. You can still explore the track here.")
                            .font(.footnote)
                            .foregroundStyle(Color.inkSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.top, 12)
                        #endif
                    } else if !st.hasSelection {
                        setupCard(number: "02", title: "PICK YOUR APPS",
                                  detail: "Choose which apps stay behind the shield.", action: "CHOOSE APPS") {
                            showPicker = true
                        }
                        .padding(.top, 34)
                    } else {
                        actions.padding(.top, 35)
                    }
                    Spacer(minLength: 28)
                    Text("INTEREST RATE: YOUR LEGS.")
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(1.1)
                        .foregroundStyle(Color.inkTertiary)
                        .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 22)
            }
            .scrollIndicators(.hidden)
            .background(Color.void.ignoresSafeArea())
            .safeAreaInset(edge: .bottom, spacing: 0) {
                Button {
                    UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
                    showRun = true
                } label: {
                    HStack {
                        Image(systemName: "figure.run")
                            .font(.system(size: 22, weight: .bold))
                        Spacer()
                        Text("RUN A LAP")
                            .font(.system(size: 20, weight: .black, design: .rounded))
                            .tracking(0.6)
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 19, weight: .bold))
                    }
                    .padding(.horizontal, 25)
                    .frame(height: 68)
                    .contentShape(Capsule())
                }
                .buttonStyle(LapPrimaryButtonStyle())
                .padding(.horizontal, 24)
                .padding(.top, 12)
                .padding(.bottom, 8)
                .background(Color.void)
            }
            .toolbar(.hidden, for: .navigationBar)
            .familyActivityPicker(isPresented: $showPicker, selection: Bindable(st).selection)
            .fullScreenCover(isPresented: $showRun) { RunView() }
            .sheet(isPresented: $showSettings) { SettingsView() }
            .alert("Couldn't unlock apps", isPresented: Binding(
                get: { st.unlockError != nil },
                set: { if !$0 { st.unlockError = nil } }
            )) {
                Button("OK") { st.unlockError = nil }
            } message: {
                Text(st.unlockError ?? "Try again in a moment.")
            }
            .onReceive(tick) { now = $0; if st.unlockedUntil != nil { st.refresh() } }
        }
    }

    private var header: some View {
        HStack {
            HStack(spacing: 10) {
                Capsule()
                    .stroke(Color.tartan, lineWidth: 3)
                    .frame(width: 28, height: 19)
                    .rotationEffect(.degrees(-18))
                Text("lap")
                    .font(.system(size: 35, weight: .black, design: .rounded))
                    .tracking(-2)
                    .foregroundStyle(Color.ink)
            }
            .accessibilityElement(children: .combine)
            Spacer()
            Button { showSettings = true } label: {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Color.ink)
                    .frame(width: 48, height: 48)
                    .background(Color.surface1, in: Circle())
                    .overlay(Circle().stroke(Color.hairline, lineWidth: 1))
            }
            .accessibilityLabel("Settings")
        }
    }

    private var bank: some View {
        ZStack {
            LapOval(color: st.unlockedUntil == nil ? .ink : .vault)
                .frame(height: 228)
            VStack(spacing: 5) {
                LapLabel(text: st.unlockedUntil == nil ? "IN THE BANK" : "UNLOCKED",
                         color: st.unlockedUntil == nil ? .inkSecondary : .vault)
                if let until = st.unlockedUntil {
                    Text(Format.clock(max(0, until.timeIntervalSince(now))))
                        .font(.system(size: 72, weight: .black, design: .rounded))
                        .foregroundStyle(Color.vault)
                        .monospacedDigit()
                        .contentTransition(.numericText(countsDown: true))
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                        .accessibilityLabel("\(Format.clock(max(0, until.timeIntervalSince(now)))) remaining unlocked")
                    Text("UNTIL THE SHIELD RETURNS")
                        .font(.system(size: 11, weight: .bold))
                        .tracking(1)
                        .foregroundStyle(Color.inkSecondary)
                } else {
                    HStack(alignment: .firstTextBaseline, spacing: 5) {
                        Text("\(Int(st.bankSeconds / 60))")
                            .font(.system(size: 88, weight: .black, design: .rounded))
                            .monospacedDigit()
                        Text("MIN")
                            .font(.system(size: 18, weight: .black, design: .rounded))
                            .foregroundStyle(Color.vault)
                    }
                    .foregroundStyle(Color.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.55)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("\(Format.minutes(st.bankSeconds)) in the bank")
                    Text("\(st.totalLaps) \(st.totalLaps == 1 ? "lap" : "laps") run all time")
                        .font(.subheadline)
                        .foregroundStyle(Color.inkSecondary)
                }
            }
            .padding(.horizontal, 35)
        }
        .frame(height: 228)
        .frame(maxWidth: .infinity)
    }

    private var actions: some View {
        VStack(alignment: .leading, spacing: 15) {
            if st.unlockedUntil != nil {
                LapLabel(text: "THE VAULT IS OPEN", color: .vault)
                Button(role: .destructive) { st.relockNow() } label: {
                    Label("Lock apps now", systemImage: "lock.fill")
                        .font(.system(.body, design: .rounded, weight: .semibold))
                        .foregroundStyle(Color.lapRed)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .background(Color.surface1, in: RoundedRectangle(cornerRadius: 16))
                }
            } else {
                HStack {
                    LapLabel(text: "SPEND FROM THE BANK")
                    Spacer()
                    Text("MINUTES")
                        .font(.system(size: 11, weight: .bold))
                        .tracking(1)
                        .foregroundStyle(Color.inkTertiary)
                }
                HStack(spacing: 10) {
                    ForEach([15, 30, 60], id: \.self) { minutes in
                        let available = st.bankSeconds >= Double(minutes) * 60
                        Button {
                            UISelectionFeedbackGenerator().selectionChanged()
                            st.spend(Double(minutes) * 60)
                        } label: {
                            Text("\(minutes)")
                                .font(.system(size: 24, weight: .black, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(available ? Color.vault : Color.inkTertiary)
                                .frame(maxWidth: .infinity)
                                .frame(height: 65)
                                .background(available ? Color.vaultDim : Color.surface2, in: Capsule())
                                .overlay(Capsule().stroke(available ? Color.vault.opacity(0.38) : Color.hairline, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                        .disabled(!available)
                        .accessibilityLabel("Spend \(minutes) minutes")
                    }
                }
                Text(st.bankSeconds < ScreenTime.minimumSpend ? "Run a lap to put \(Format.minutes(st.secondsPerLap)) in the bank." : "Choose how long to lift the shield.")
                    .font(.subheadline)
                    .foregroundStyle(Color.inkSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func setupCard(number: String, title: String, detail: String, action: String,
                           perform: @escaping () -> Void) -> some View {
        Button(action: perform) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 10) {
                    Text(number)
                        .font(.system(size: 12, weight: .black, design: .rounded))
                        .foregroundStyle(Color.tartan)
                    LapLabel(text: title, color: .ink)
                }
                Text(detail)
                    .font(.subheadline)
                    .foregroundStyle(Color.inkSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                HStack(spacing: 6) {
                    Text(action)
                    Image(systemName: "arrow.up.right")
                }
                .font(.system(size: 12, weight: .black, design: .rounded))
                .tracking(0.8)
                .foregroundStyle(Color.tartan)
                .padding(.top, 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(Color.surface1, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.hairline, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
