import SwiftUI

/// Main tab-based navigation view
struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var usageMonitor: UsageMonitorViewModel

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "gauge.with.dots.needle.33percent")
                }
                .tag(AppState.Tab.dashboard)

            ReportsView()
                .tabItem {
                    Label("Report", systemImage: "chart.bar.doc.horizontal")
                }
                .tag(AppState.Tab.reports)

            WellnessView()
                .tabItem {
                    Label("Benessere", systemImage: "brain.head.profile")
                }
                .tag(AppState.Tab.wellness)

            SettingsView()
                .tabItem {
                    Label("Impostazioni", systemImage: "gear")
                }
                .tag(AppState.Tab.settings)
        }
        .tint(.indigo)
    }
}
