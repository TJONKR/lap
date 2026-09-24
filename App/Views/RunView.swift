import SwiftUI
import CoreLocation
import UIKit

struct RunView: View {
    @Environment(ScreenTime.self) private var st
    @Environment(LapTracker.self) private var tracker
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var now = Date.now
    @State private var showCoach = false

    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    private var elapsed: TimeInterval { tracker.startedAt.map { now.timeIntervalSince($0) } ?? 0 }

    var body: some View {
        GeometryReader { geo in
            VStack(spacing: 0) {
                ZStack {
                    RunMapView(tracker: tracker)
                    LinearGradient(stops: [
                        .init(color: .black.opacity(0.4), location: 0),
                        .init(color: .clear, location: 0.25),
                        .init(color: .clear, location: 0.75),
                        .init(color: .black.opacity(0.45), location: 1)
                    ], startPoint: .top, endPoint: .bottom)
                    .allowsHitTesting(false)
                    VStack {
                        HStack {
                            Button("Close") { finish() }
                            Spacer()
                            Text(Format.clock(elapsed)).monospacedDigit().font(.headline)
                        }
                        .padding()
                        Spacer()
                        ZStack {
                            Capsule().stroke(Color.tartanDim, lineWidth: 16)
                            Capsule().trim(from: 0, to: tracker.progress)
                                .stroke(Color.tartan, style: .init(lineWidth: 16, lineCap: .round))
                                .animation(reduceMotion ? nil : .easeOut, value: tracker.progress)
                            VStack {
                                Text("\(tracker.laps)").font(.system(size: 72, weight: .black, design: .rounded))
                                Text(tracker.laps == 1 ? "LAP" : "LAPS").font(.caption.weight(.heavy)).foregroundStyle(.secondary)
                            }
                        }
                        .frame(width: 300, height: 210)
                        Spacer()
                    }
                }
                .frame(height: geo.size.height * 0.55)
                .clipped()
                .overlay(alignment: .top) {
                    if showCoach {
                        coach
                            .padding(.top, 58)
                            .transition(reduceMotion ? .opacity : .opacity.combined(with: .move(edge: .top)))
                    }
                }
                VStack(spacing: 16) {
                    VStack(spacing: 4) {
                        Text(Format.meters(tracker.distance)).font(.title2.weight(.semibold))
                        Text("earned \(Format.minutes(Double(tracker.laps) * st.secondsPerLap))")
                            .foregroundStyle(Color.vault)
                    }
                    .padding(.top, 16)
                    Spacer()
                    if tracker.permission == .denied || tracker.permission == .restricted {
                        Text("Location is off. Enable it in Settings to count laps.").foregroundStyle(.red).padding()
                    } else if !tracker.running {
                        Button {
                            if tracker.permission == .notDetermined { tracker.requestPermission() }
                            tracker.startRun()
                        } label: { Text("START").font(.title.weight(.black)).frame(maxWidth: .infinity).padding(.vertical, 18) }
                        .buttonStyle(.borderedProminent).tint(Color.tartan).padding(.horizontal)
                    } else {
                        Button { finish() } label: {
                            Text("FINISH & BANK").font(.title.weight(.black)).frame(maxWidth: .infinity).padding(.vertical, 18)
                        }
                        .buttonStyle(.borderedProminent).tint(Color.vault).padding(.horizontal)
                    }
                    #if DEBUG
                    if tracker.running {
                        Button("simulate lap") { tracker.debugLap() }.font(.footnote).foregroundStyle(.secondary)
                    }
                    #endif
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .padding(.bottom)
            .onReceive(tick) { now = $0 }
            .onChange(of: tracker.laps) { previous, current in
                guard current > previous else { return }
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                if previous == 0, current == 1, st.totalLaps == 0 {
                    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) {
                        showCoach = true
                    }
                }
            }
            .task(id: showCoach) {
                guard showCoach else { return }
                try? await Task.sleep(for: .seconds(8))
                if !Task.isCancelled {
                    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) {
                        showCoach = false
                    }
                }
            }
            .interactiveDismissDisabled(tracker.running)
        }
    }

    private var coach: some View {
        HStack(spacing: 12) {
            LapCoachCameo()
                .frame(width: 72, height: 72)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 5) {
                LapLabel(text: "PIXEL COACH · PARODY", color: .tartan)
                Text("Haha, motherfucker, first run lap. Watch more videos of me.")
                    .font(.system(.subheadline, design: .rounded, weight: .semibold))
                    .foregroundStyle(Color.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(Color.surface1, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.tartan.opacity(0.45), lineWidth: 1))
        .padding(.horizontal, 18)
        .accessibilityElement(children: .combine)
    }

    private func finish() {
        if tracker.running {
            let laps = tracker.stopRun()
            if laps > 0 { st.deposit(laps: laps) }
        }
        dismiss()
    }
}
