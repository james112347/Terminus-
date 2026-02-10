import SwiftUI

@main
struct TerminusApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var usageMonitor = UsageMonitorViewModel()
    @State private var showProfileSetup = false

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environmentObject(usageMonitor)
                .onAppear {
                    usageMonitor.requestScreenTimePermission()
                    usageMonitor.startMonitoring()
                    // Show profile setup on first launch
                    if !UsageDataStore.shared.userProfile.isProfileCompleted {
                        showProfileSetup = true
                    }
                }
                .sheet(isPresented: $showProfileSetup) {
                    UserProfileSetupView(isPresented: $showProfileSetup)
                        .environmentObject(usageMonitor)
                        .interactiveDismissDisabled()
                }
        }
    }
}
