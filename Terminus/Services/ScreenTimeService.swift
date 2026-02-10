import Foundation
import DeviceActivity
import FamilyControls
import ManagedSettings

/// Service to access and monitor Screen Time data using Apple's DeviceActivity framework
final class ScreenTimeService: ObservableObject {

    static let shared = ScreenTimeService()

    @Published var authorizationStatus: AuthorizationStatus = .notDetermined
    @Published var isMonitoring: Bool = false

    private let center = AuthorizationCenter.shared
    private let store = DeviceActivityCenter()

    enum AuthorizationStatus {
        case notDetermined
        case approved
        case denied
    }

    /// Request Screen Time authorization from the user
    func requestAuthorization() async -> Bool {
        do {
            try await center.requestAuthorization(for: .individual)
            await MainActor.run {
                self.authorizationStatus = .approved
            }
            return true
        } catch {
            await MainActor.run {
                self.authorizationStatus = .denied
            }
            print("Screen Time authorization failed: \(error.localizedDescription)")
            return false
        }
    }

    /// Start monitoring device activity
    func startMonitoring() {
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true
        )

        do {
            try store.startMonitoring(
                .daily,
                during: schedule
            )
            isMonitoring = true
        } catch {
            print("Failed to start monitoring: \(error.localizedDescription)")
            isMonitoring = false
        }
    }

    /// Stop monitoring device activity
    func stopMonitoring() {
        store.stopMonitoring([.daily])
        isMonitoring = false
    }
}

extension DeviceActivityName {
    static let daily = Self("terminus.daily.monitor")
}

/// DeviceActivity monitor extension handler
class TerminusDeviceActivityMonitor: DeviceActivityMonitor {

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        // New day started - reset daily counters
        NotificationCenter.default.post(
            name: .dailyMonitoringStarted,
            object: nil
        )
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        // Day ended - generate daily report
        NotificationCenter.default.post(
            name: .dailyMonitoringEnded,
            object: nil
        )
    }

    override func eventDidReachThreshold(
        _ event: DeviceActivityEvent.Name,
        activity: DeviceActivityName
    ) {
        super.eventDidReachThreshold(event, activity: activity)
        // Usage threshold reached - trigger warning
        NotificationCenter.default.post(
            name: .usageThresholdReached,
            object: event
        )
    }
}

extension Notification.Name {
    static let dailyMonitoringStarted = Notification.Name("terminus.daily.started")
    static let dailyMonitoringEnded = Notification.Name("terminus.daily.ended")
    static let usageThresholdReached = Notification.Name("terminus.threshold.reached")
}
