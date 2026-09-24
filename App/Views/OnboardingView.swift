import SwiftUI
import FamilyControls

extension Shared.Key {
    static let hasCompletedOnboarding = "hasCompletedOnboarding"
}

struct OnboardingView: View {
    @Environment(ScreenTime.self) private var st
    @Environment(LapTracker.self) private var tracker
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var step = 0
    @State private var showPicker = false

    var onDone: () -> Void = {}

    var body: some View {
        VStack(spacing: 24) {
            dots
            Group {
                switch step {
                case 0: pitch
                case 1: authorize
                case 2: pickApps
                default: deal
                }
            }
            .id(step)
            .transition(.opacity)
            .frame(maxHeight: .infinity)
            controls
        }
        .padding(24)
        .background(Color.void.ignoresSafeArea())
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.2), value: step)
        .familyActivityPicker(isPresented: $showPicker, selection: Bindable(st).selection)
    }

    private var dots: some View {
        HStack(spacing: 8) {
            ForEach(0..<4, id: \.self) { i in
                Capsule()
                    .fill(i == step ? Color.tartan : Color.hairline)
                    .frame(width: i == step ? 24 : 8, height: 8)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var pitch: some View {
        VStack(spacing: 16) {
            Spacer()
            ZStack {
                LapOval(color: .tartan)
                    .frame(height: 180)
                Image(systemName: "figure.run")
                    .font(.system(size: 72))
                    .foregroundStyle(Color.tartan)
            }
            Text("Want your screen time back?\nRun a lap.")
                .font(.system(size: 32, weight: .black, design: .rounded))
                .multilineTextAlignment(.center)
            Text("Your distracting apps stay locked. Every lap you run banks minutes to spend on them.")
                .foregroundStyle(Color.inkSecondary)
                .multilineTextAlignment(.center)
            Spacer()
        }
    }

    private var authorize: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "hourglass")
                .font(.system(size: 64))
                .foregroundStyle(Color.tartan)
            Text("Allow Screen Time")
                .font(.system(size: 30, weight: .black, design: .rounded))
            Text("Lap uses Apple's Screen Time API to shield your apps. Your data never leaves the phone.")
                .foregroundStyle(Color.inkSecondary)
                .multilineTextAlignment(.center)
            if st.authorized {
                Label("Screen Time allowed", systemImage: "checkmark.circle.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.vault)
            }
            Spacer()
        }
    }

    private var pickApps: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "apps.iphone")
                .font(.system(size: 64))
                .foregroundStyle(Color.tartan)
            Text("Choose what to block")
                .font(.system(size: 30, weight: .black, design: .rounded))
            Text("Pick the apps and categories you have to run for.")
                .foregroundStyle(Color.inkSecondary)
                .multilineTextAlignment(.center)
            if st.hasSelection {
                Label("\(st.selection.applicationTokens.count) apps, \(st.selection.categoryTokens.count) categories",
                      systemImage: "checkmark.circle.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.vault)
                Button("Change selection") { showPicker = true }
                    .font(.footnote.weight(.semibold))
            }
            Spacer()
        }
    }

    private var deal: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "timer")
                .font(.system(size: 64))
                .foregroundStyle(Color.tartan)
            Text("The deal")
                .font(.system(size: 30, weight: .black, design: .rounded))
            Text("How far is a lap, and how much does it earn?")
                .foregroundStyle(Color.inkSecondary)
            VStack {
                Stepper("Lap length: \(Format.meters(tracker.lapMeters))",
                        value: Bindable(tracker).lapMeters, in: 200...2000, step: 100)
                Stepper("Per lap: \(Format.minutes(st.secondsPerLap))",
                        value: Bindable(st).secondsPerLap, in: 300...3600, step: 300)
            }
            .padding()
            .background(Color.surface1, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.hairline, lineWidth: 1))
            if !st.authorized || !st.hasSelection {
                Text("Nothing is blocked yet — you can finish setup later in Settings.")
                    .font(.footnote)
                    .foregroundStyle(Color.tartan)
                    .multilineTextAlignment(.center)
            }
            Spacer()
        }
    }

    private var controls: some View {
        VStack(spacing: 12) {
            Button(action: primary) {
                Text(primaryTitle)
                    .font(.title2.weight(.black))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.tartan)
            if (step == 1 && !st.authorized) || (step == 2 && !st.hasSelection) {
                Button("Skip for now") { step += 1 }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.inkSecondary)
                Text("Nothing gets blocked without this.")
                    .font(.caption)
                    .foregroundStyle(Color.tartan)
            }
        }
    }

    private var primaryTitle: String {
        switch step {
        case 0: return "LET'S GO"
        case 1: return st.authorized ? "CONTINUE" : "ALLOW SCREEN TIME"
        case 2: return st.hasSelection ? "CONTINUE" : "PICK APPS"
        default: return "START RUNNING"
        }
    }

    private func primary() {
        switch step {
        case 1:
            if st.authorized { step += 1 } else { Task { await st.requestAuthorization() } }
        case 2:
            if st.hasSelection { step += 1 } else { showPicker = true }
        case 3:
            Shared.defaults.set(true, forKey: Shared.Key.hasCompletedOnboarding)
            onDone()
        default:
            step += 1
        }
    }
}
