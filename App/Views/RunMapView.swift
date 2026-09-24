import SwiftUI
import MapKit

struct RunMapView: View {
    let tracker: LapTracker

    @State private var camera: MapCameraPosition = .userLocation(fallback: .automatic)

    private var regionSpan: CLLocationDistance { max(tracker.lapMeters * 2, 400) }

    var body: some View {
        Map(position: $camera) {
            if let start = tracker.startCoordinate {
                MapCircle(center: start, radius: tracker.lapMeters / 4)
                    .foregroundStyle(Color.tartanDim)
                    .stroke(Color.tartan.opacity(0.7), lineWidth: 1.5)
                Annotation("Start", coordinate: start) {
                    Circle()
                        .fill(Color.ink)
                        .overlay(Circle().strokeBorder(Color.tartan, lineWidth: 2))
                        .frame(width: 14, height: 14)
                }
            }
            if tracker.route.count > 1 {
                MapPolyline(coordinates: tracker.route)
                    .stroke(Color.tartan.opacity(0.3), lineWidth: 8)
                MapPolyline(coordinates: tracker.route)
                    .stroke(Color.tartan, lineWidth: 3.5)
            }
            UserAnnotation()
        }
        .mapStyle(.standard(elevation: .flat, emphasis: .muted))
        .onChange(of: tracker.route.count) { _, count in
            if count == 1, let start = tracker.startCoordinate {
                camera = .region(MKCoordinateRegion(
                    center: start,
                    latitudinalMeters: regionSpan,
                    longitudinalMeters: regionSpan))
            }
        }
    }
}
