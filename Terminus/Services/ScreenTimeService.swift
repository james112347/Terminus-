import Foundation
#if canImport(DeviceActivity)
import DeviceActivity
#endif
#if canImport(FamilyControls)
import FamilyControls
#endif
#if canImport(ManagedSettings)
import ManagedSettings
#endif

/// Service to access and monitor Screen Time data using Apple's DeviceActivity framework
/// Requires iOS 16+ and Family Controls entitlement enabled in Apple Developer Portal
final class ScreenTimeService: ObservableObject {

    static let shared = ScreenTimeService()

    @Published var authorizationStatus: AuthorizationStatus = .notDetermined
    @Published var isMonitoring: Bool = false

    enum AuthorizationStatus {
        case notDetermined
        case approved
        case denied
    }

    /// Request Screen Time authorization from the user
    /// Must be called on a physical device - Simulator does not support FamilyControls
    func requestAuthorization() async -> Bool {
        #if canImport(FamilyControls)
        do {
            let center = AuthorizationCenter.shared
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
        #else
        await MainActor.run {
            self.authorizationStatus = .denied
        }
        return false
        #endif
    }

    /// Start monitoring device activity
    func startMonitoring() {
        #if canImport(DeviceActivity)
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true
        )

        let store = DeviceActivityCenter()
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
        #else
        print("DeviceActivity not available on this platform")
        isMonitoring = false
        #endif
    }

    /// Stop monitoring device activity
    func stopMonitoring() {
        #if canImport(DeviceActivity)
        let store = DeviceActivityCenter()
        store.stopMonitoring([.daily])
        #endif
        isMonitoring = false
    }
}

#if canImport(DeviceActivity)
extension DeviceActivityName {
    static let daily = Self("terminus.daily.monitor")
}

/// DeviceActivity monitor extension handler
/// NOTE: This must live in a separate App Extension target for production use.
/// In Xcode: File > New > Target > DeviceActivityMonitor Extension
class TerminusDeviceActivityMonitor: DeviceActivityMonitor {

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        NotificationCenter.default.post(
            name: .dailyMonitoringStarted,
            object: nil
        )
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
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
        NotificationCenter.default.post(
            name: .usageThresholdReached,
            object: event
        )
    }
}
#endif

extension Notification.Name {
    static let dailyMonitoringStarted = Notification.Name("terminus.daily.started")
    static let dailyMonitoringEnded = Notification.Name("terminus.daily.ended")
    static let usageThresholdReached = Notification.Name("terminus.threshold.reached")
}
