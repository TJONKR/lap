import SwiftUI

extension Color {
    init(hex: UInt, opacity: Double = 1) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255,
                  opacity: opacity)
    }

    static let tartan = Color(hex: 0xFF4F1F)
    static let tartanPressed = Color(hex: 0xD64015)
    static let tartanDim = Color(hex: 0xFF4F1F, opacity: 0.14)
    static let vault = Color(hex: 0x3DDC97)
    static let vaultDim = Color(hex: 0x3DDC97, opacity: 0.14)
    static let void = Color(hex: 0x000000)
    static let surface1 = Color(hex: 0x121214)
    static let surface2 = Color(hex: 0x1D1D21)
    static let hairline = Color(hex: 0x2C2C31)
    static let ink = Color(hex: 0xF4F4F0)
    static let inkSecondary = Color(hex: 0x9A9AA3)
    static let inkTertiary = Color(hex: 0x5F5F68)
    static let amber = Color(hex: 0xFFB224)
    static let lapRed = Color(hex: 0xFF453A)
}

struct LapLabel: View {
    let text: String
    var color: Color = .inkSecondary

    var body: some View {
        Text(text)
            .font(.system(.caption, design: .default, weight: .bold))
            .tracking(1.5)
            .foregroundStyle(color)
    }
}

struct LapOval: View {
    var color: Color = .ink

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Capsule().stroke(color.opacity(0.12), lineWidth: 1)
                Capsule().stroke(color.opacity(0.09), lineWidth: 1)
                    .padding(14)
                Capsule().stroke(color.opacity(0.06), lineWidth: 1)
                    .padding(28)
                Capsule()
                    .fill(color.opacity(0.42))
                    .frame(width: 3, height: 18)
                    .rotationEffect(.degrees(-35))
                    .position(x: geometry.size.width * 0.24, y: geometry.size.height * 0.11)
            }
        }
        .accessibilityHidden(true)
    }
}

struct LapDealChip: View {
    let meters: Double
    let seconds: TimeInterval

    var body: some View {
        HStack(spacing: 11) {
            Image(systemName: "equal")
                .font(.system(size: 13, weight: .black))
                .foregroundStyle(Color.tartan)
            Text("1 LAP")
            Text("·").foregroundStyle(Color.inkTertiary)
            Text(Format.meters(meters).uppercased())
            Text("=").foregroundStyle(Color.inkTertiary)
            Text(Format.minutes(seconds).uppercased())
                .foregroundStyle(Color.vault)
        }
        .font(.system(size: 11, weight: .heavy, design: .rounded))
        .tracking(0.4)
        .foregroundStyle(Color.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
        .padding(.horizontal, 17)
        .padding(.vertical, 15)
        .frame(maxWidth: .infinity)
        .background(Color.surface1, in: Capsule())
        .overlay(Capsule().stroke(Color.hairline, lineWidth: 1))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("One lap, \(Format.meters(meters)), earns \(Format.minutes(seconds))")
    }
}

struct LapPrimaryButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(Color.void)
            .background(configuration.isPressed ? Color.tartanPressed : Color.tartan, in: Capsule())
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.14), value: configuration.isPressed)
    }
}

struct LapCoachCameo: View {
    var body: some View {
        Image("CoachCameo")
            .resizable()
            .interpolation(.none)
            .scaledToFit()
            .accessibilityLabel("Pixel art coach")
    }
}
