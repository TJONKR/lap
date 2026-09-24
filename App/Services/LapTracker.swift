import Foundation
import CoreLocation
import Observation

/// GPS run tracker. A lap = `lapMeters` of distance covered, or returning to the start point after at least half a lap.
@Observable
final class LapTracker: NSObject, CLLocationManagerDelegate {
    var running = false
    var distance: CLLocationDistance = 0
    var laps = 0
    var startedAt: Date?
    var lastLapAt: Date?
    var lapMeters: CLLocationDistance = Shared.defaults.object(forKey: Shared.Key.lapMeters) as? Double ?? 400 {
        didSet { Shared.defaults.set(lapMeters, forKey: Shared.Key.lapMeters) }
    }
    var permission: CLAuthorizationStatus
    var route: [CLLocationCoordinate2D] = []
    var startCoordinate: CLLocationCoordinate2D? { start?.coordinate }

    private let manager = CLLocationManager()
    private var last: CLLocation?
    private var start: CLLocation?
    private var distanceAtLapStart: CLLocationDistance = 0
    private var awayFromStart = false
    private let maximumRunningSpeed: CLLocationSpeed = 12

    override init() {
        permission = manager.authorizationStatus
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        manager.activityType = .fitness
        manager.distanceFilter = 3
        manager.allowsBackgroundLocationUpdates = true
        manager.pausesLocationUpdatesAutomatically = false
    }

    var progress: Double { min(1, (distance - distanceAtLapStart) / lapMeters) }
    var elapsed: TimeInterval { startedAt.map { Date.now.timeIntervalSince($0) } ?? 0 }

    func requestPermission() { manager.requestWhenInUseAuthorization() }

    func startRun() {
        distance = 0; laps = 0; last = nil; start = nil; route = []
        distanceAtLapStart = 0; awayFromStart = false
        startedAt = .now; lastLapAt = nil
        running = true
        manager.startUpdatingLocation()
    }

    /// Stops and returns laps completed this run.
    @discardableResult
    func stopRun() -> Int {
        manager.stopUpdatingLocation()
        running = false
        return laps
    }

    func locationManagerDidChangeAuthorization(_ m: CLLocationManager) { permission = m.authorizationStatus }

    func locationManager(_ m: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard running, let startedAt else { return }
        for loc in locations where loc.horizontalAccuracy > 0
            && loc.horizontalAccuracy < 30
            && loc.timestamp >= startedAt
            && loc.timestamp <= Date.now.addingTimeInterval(5) {
            if let last {
                let elapsed = loc.timestamp.timeIntervalSince(last.timestamp)
                guard elapsed > 0 else { continue }
                let movement = loc.distance(from: last)
                let noiseFloor = max(5, min(12, (loc.horizontalAccuracy + last.horizontalAccuracy) / 2))
                guard movement >= noiseFloor, movement / elapsed <= maximumRunningSpeed else { continue }
                distance += movement
            }
            if start == nil { start = loc }
            last = loc
            route.append(loc.coordinate)
            checkLap(at: loc)
        }
    }

    private func checkLap(at loc: CLLocation) {
        let sinceLap = distance - distanceAtLapStart
        if let start {
            let fromStart = loc.distance(from: start)
            if fromStart > 40 { awayFromStart = true }
            if awayFromStart, fromStart < 20, sinceLap >= lapMeters * 0.5 {
                completeLap(); return
            }
        }
        if sinceLap >= lapMeters { completeLap() }
    }

    private func completeLap() {
        laps += 1
        lastLapAt = .now
        distanceAtLapStart = distance
        awayFromStart = false
    }

    #if DEBUG
    /// Simulator has no real GPS loops; fake a lap so the flow can be demoed.
    func debugLap() { distance += lapMeters; completeLap() }
    #endif
}
