import WidgetKit
import SwiftUI

private enum LapColor {
    static let tartan = Color(red: 1, green: 79 / 255, blue: 31 / 255)
    static let vault = Color(red: 61 / 255, green: 220 / 255, blue: 151 / 255)
}

@main
struct LapWidgets: WidgetBundle {
    var body: some Widget {
        UnlockLiveActivity()
    }
}

struct UnlockLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: UnlockAttributes.self) { context in
            HStack(spacing: 16) {
                Image(systemName: "figure.run")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(LapColor.tartan)
                    .frame(width: 48, height: 48)
                    .background(LapColor.tartan.opacity(0.14), in: Capsule())
                VStack(alignment: .leading, spacing: 3) {
                    Text("APPS OPEN")
                        .font(.caption2.weight(.heavy))
                        .tracking(2)
                        .foregroundStyle(LapColor.vault)
                    Text(timerInterval: .now...context.state.unlockUntil, countsDown: true)
                        .font(.system(.title, design: .rounded, weight: .black).monospacedDigit())
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(context.attributes.totalLaps)")
                        .font(.system(.title3, design: .rounded, weight: .bold))
                    Text("LAPS RUN")
                        .font(.caption2.weight(.bold))
                        .tracking(1)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(16)
            .activityBackgroundTint(.black)
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label("LAP", systemImage: "figure.run")
                        .font(.caption.weight(.heavy))
                        .foregroundStyle(LapColor.tartan)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("APPS OPEN")
                        .font(.caption2.weight(.heavy))
                        .foregroundStyle(LapColor.vault)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(timerInterval: .now...context.state.unlockUntil, countsDown: true)
                        .font(.system(.largeTitle, design: .rounded, weight: .black).monospacedDigit())
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Apps lock at zero · \(context.attributes.totalLaps) laps run")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } compactLeading: {
                Image(systemName: "figure.run")
                    .foregroundStyle(LapColor.tartan)
            } compactTrailing: {
                Text(timerInterval: .now...context.state.unlockUntil, countsDown: true)
                    .monospacedDigit()
                    .foregroundStyle(LapColor.vault)
                    .frame(maxWidth: 44)
            } minimal: {
                Image(systemName: "figure.run")
                    .foregroundStyle(LapColor.tartan)
            }
        }
    }
}
