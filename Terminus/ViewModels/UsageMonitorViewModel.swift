import Foundation
import Combine
import SwiftUI

/// Main ViewModel for the usage monitor - bridges services to views
@MainActor
final class UsageMonitorViewModel: ObservableObject {

    // MARK: - Published State

    @Published var todayTotalMinutes: Int = 0
    @Published var dailyGoalMinutes: Int = 120
    @Published var wellnessScore: Int = 75
    @Published var categoryBreakdown: [CategoryUsage] = []
    @Published var latestReport: WellnessReport?
    @Published var recentReports: [WellnessReport] = []
    @Published var currentWarnings: [WellnessWarning] = []
    @Published var aiAdvice: String = ""
    @Published var quickTip: String = ""
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var hasPermission: Bool = false

    // Ralph Loop state
    @Published var ralphInsight: RalphLoopInsight?

    // GSD state
    @Published var gsdPhase: AppState.GSDPhase = .capture

    // Weekly stats
    @Published var weeklyAverage: Int = 0
    @Published var weeklyTrend: String = "stabile"
    @Published var weekDayUsages: [(day: String, minutes: Int)] = []

    // MARK: - Services

    private let screenTimeService = ScreenTimeService.shared
    private let wellnessEngine = WellnessEngine.shared
    private let dataStore = UsageDataStore.shared
    private let groqService = GroqAIService.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        setupBindings()
        loadDemoDataIfNeeded()
    }

    // MARK: - Setup

    private func setupBindings() {
        dataStore.$todayRecords
            .receive(on: DispatchQueue.main)
            .sink { [weak self] records in
                self?.todayTotalMinutes = records.reduce(0) { $0 + $1.durationMinutes }
            }
            .store(in: &cancellables)

        dataStore.$reports
            .receive(on: DispatchQueue.main)
            .sink { [weak self] reports in
                self?.recentReports = Array(reports.sorted { $0.date > $1.date }.prefix(7))
                self?.latestReport = reports.sorted { $0.date > $1.date }.first
            }
            .store(in: &cancellables)
    }

    // MARK: - Screen Time Permission

    func requestScreenTimePermission() {
        Task {
            hasPermission = await screenTimeService.requestAuthorization()
            if hasPermission {
                let notifGranted = await NotificationService.shared.requestAuthorization()
                if notifGranted {
                    NotificationService.shared.scheduleWellnessCheckIn(hour: 21, minute: 0)
                }
            }
        }
    }

    // MARK: - Monitoring

    func startMonitoring() {
        screenTimeService.startMonitoring()
        wellnessEngine.startPeriodicMonitoring()
        refreshData()
    }

    func stopMonitoring() {
        screenTimeService.stopMonitoring()
        wellnessEngine.stopPeriodicMonitoring()
    }

    // MARK: - Data Refresh

    func refreshData() {
        let breakdown = dataStore.getCategoryBreakdown(for: Date())
        let totalMinutes = breakdown.values.reduce(0, +)

        categoryBreakdown = breakdown.map { category, minutes in
            CategoryUsage(
                category: category,
                totalMinutes: minutes,
                percentage: Double(minutes) / Double(max(totalMinutes, 1)) * 100
            )
        }.sorted { $0.totalMinutes > $1.totalMinutes }

        weeklyAverage = dataStore.getWeeklyAverage()
        weeklyTrend = todayTotalMinutes > weeklyAverage ? "in aumento" :
                      todayTotalMinutes < weeklyAverage ? "in diminuzione" : "stabile"
        dailyGoalMinutes = Int(dataStore.userProfile.dailyScreenTimeGoal / 60)

        if let report = latestReport {
            wellnessScore = report.overallWellnessScore
            currentWarnings = report.warnings
            aiAdvice = report.aiAdvice
            ralphInsight = report.ralphLoopInsights
        }
    }

    // MARK: - AI Analysis

    func runAnalysis() async {
        isLoading = true
        errorMessage = nil
        gsdPhase = .capture

        do {
            gsdPhase = .clarify
            let report = try await wellnessEngine.runFullAnalysis()

            gsdPhase = .organize
            latestReport = report
            wellnessScore = report.overallWellnessScore
            currentWarnings = report.warnings
            aiAdvice = report.aiAdvice
            ralphInsight = report.ralphLoopInsights
            categoryBreakdown = report.categoryBreakdown

            gsdPhase = .reflect
            // Brief pause for UI feedback
            try await Task.sleep(nanoseconds: 500_000_000)

            gsdPhase = .engage
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    func fetchQuickTip(for category: AppCategory) async {
        do {
            let minutes = categoryBreakdown.first { $0.category == category }?.totalMinutes ?? 0
            quickTip = try await groqService.generateQuickTip(
                currentMinutes: minutes,
                category: category.rawValue,
                userProfile: dataStore.userProfile
            )
        } catch {
            quickTip = "Non è stato possibile ottenere un consiglio in questo momento."
        }
    }

    // MARK: - Goal Management

    func updateDailyGoal(minutes: Int) {
        var profile = dataStore.userProfile
        profile.dailyScreenTimeGoal = TimeInterval(minutes * 60)
        dataStore.updateProfile(profile)
        dailyGoalMinutes = minutes
    }

    func setCategoryLimit(category: AppCategory, minutes: Int) {
        var profile = dataStore.userProfile
        profile.categoryLimits[category] = TimeInterval(minutes * 60)
        dataStore.updateProfile(profile)
    }

    // MARK: - Progress Calculation

    var goalProgress: Double {
        guard dailyGoalMinutes > 0 else { return 0 }
        return min(Double(todayTotalMinutes) / Double(dailyGoalMinutes), 1.5)
    }

    var isOverGoal: Bool {
        todayTotalMinutes > dailyGoalMinutes
    }

    var goalStatus: String {
        let remaining = dailyGoalMinutes - todayTotalMinutes
        if remaining > 0 {
            return "\(remaining)min rimasti"
        } else {
            return "\(abs(remaining))min oltre il limite"
        }
    }

    // MARK: - Demo Data

    private func loadDemoDataIfNeeded() {
        guard dataStore.todayRecords.isEmpty else { return }

        let now = Date()
        let calendar = Calendar.current

        let demoRecords: [AppUsageRecord] = [
            AppUsageRecord(
                appName: "Instagram",
                bundleIdentifier: "com.instagram.app",
                category: .socialMedia,
                startTime: calendar.date(byAdding: .hour, value: -6, to: now)!,
                endTime: calendar.date(byAdding: .minute, value: -310, to: now)!
            ),
            AppUsageRecord(
                appName: "TikTok",
                bundleIdentifier: "com.tiktok.app",
                category: .socialMedia,
                startTime: calendar.date(byAdding: .hour, value: -4, to: now)!,
                endTime: calendar.date(byAdding: .minute, value: -195, to: now)!
            ),
            AppUsageRecord(
                appName: "YouTube",
                bundleIdentifier: "com.google.youtube",
                category: .entertainment,
                startTime: calendar.date(byAdding: .hour, value: -3, to: now)!,
                endTime: calendar.date(byAdding: .minute, value: -135, to: now)!
            ),
            AppUsageRecord(
                appName: "WhatsApp",
                bundleIdentifier: "com.whatsapp.app",
                category: .communication,
                startTime: calendar.date(byAdding: .hour, value: -5, to: now)!,
                endTime: calendar.date(byAdding: .minute, value: -275, to: now)!
            ),
            AppUsageRecord(
                appName: "Safari",
                bundleIdentifier: "com.apple.safari",
                category: .utilities,
                startTime: calendar.date(byAdding: .hour, value: -2, to: now)!,
                endTime: calendar.date(byAdding: .minute, value: -100, to: now)!
            ),
            AppUsageRecord(
                appName: "Candy Crush",
                bundleIdentifier: "com.king.candycrush",
                category: .gaming,
                startTime: calendar.date(byAdding: .hour, value: -1, to: now)!,
                endTime: calendar.date(byAdding: .minute, value: -25, to: now)!
            ),
        ]

        dataStore.saveRecords(demoRecords)
        refreshData()
    }
}
