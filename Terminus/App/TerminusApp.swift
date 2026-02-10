import SwiftUI

@main
struct TerminusApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var usageMonitor = UsageMonitorViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environmentObject(usageMonitor)
                .onAppear {
                    usageMonitor.requestScreenTimePermission()
                    usageMonitor.startMonitoring()
                }
        }
    }
}
