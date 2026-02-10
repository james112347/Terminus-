import Foundation
import Combine

/// Core wellness monitoring engine that combines Screen Time data with AI analysis
/// Uses GSD methodology for task flow and Ralph Loop for continuous improvement
final class WellnessEngine: ObservableObject {

    static let shared = WellnessEngine()

    @Published var currentAlert: WellnessWarning?
    @Published var isAnalyzing: Bool = false

    private let groqService = GroqAIService.shared
    private let dataStore = UsageDataStore.shared
    private let notificationService = NotificationService.shared
    private var cancellables = Set<AnyCancellable>()
    private var monitorTimer: Timer?

    // MARK: - GSD Phase: Capture -> Clarify -> Organize -> Reflect -> Engage

    /// GSD Phase 1: Capture - Collect raw usage data
    func captureUsageData() -> [AppUsageRecord] {
        return dataStore.getRecords(for: Date())
    }

    /// GSD Phase 2: Clarify - Process and categorize the data
    func clarifyUsagePatterns(_ records: [AppUsageRecord]) -> UsageAnalysisRequest {
        let totalMinutes = records.reduce(0) { $0 + $1.durationMinutes }
        let categoryBreakdown = Dictionary(grouping: records, by: \.category)

        let categoryDetails = categoryBreakdown.map { category, records in
            UsageAnalysisRequest.CategoryDetail(
                category: category.rawValue,
                minutes: records.reduce(0) { $0 + $1.durationMinutes },
                pickups: records.count
            )
        }.sorted { $0.minutes > $1.minutes }

        // Find peak usage hour
        let hourFormatter = DateFormatter()
        hourFormatter.dateFormat = "HH:mm"
        let peakHour = findPeakUsageHour(records)

        // Calculate late night usage (after 11 PM)
        let lateNightMinutes = records
            .filter { Calendar.current.component(.hour, from: $0.startTime) >= 23 }
            .reduce(0) { $0 + $1.durationMinutes }

        let weeklyAvg = dataStore.getWeeklyAverage()
        let trend = totalMinutes > weeklyAvg ? "in aumento" :
                    totalMinutes < weeklyAvg ? "in diminuzione" : "stabile"

        return UsageAnalysisRequest(
            totalMinutes: totalMinutes,
            categoryDetails: categoryDetails,
            peakUsageTime: peakHour,
            lateNightMinutes: lateNightMinutes,
            totalPickups: records.count,
            weeklyAverageMinutes: weeklyAvg,
            trend: trend,
            dailyGoalMinutes: Int(dataStore.userProfile.dailyScreenTimeGoal / 60)
        )
    }

    /// GSD Phase 3: Organize - Structure findings into actionable report
    func organizeIntoReport(
        usageData: UsageAnalysisRequest,
        aiResponse: WellnessAIResponse
    ) -> WellnessReport {
        let categoryUsages = usageData.categoryDetails.map { detail in
            CategoryUsage(
                category: AppCategory(rawValue: detail.category) ?? .other,
                totalMinutes: detail.minutes,
                percentage: Double(detail.minutes) / Double(max(usageData.totalMinutes, 1)) * 100
            )
        }

        let warnings = aiResponse.warnings.map { warning in
            WellnessWarning(
                severity: mapSeverity(warning.severity),
                title: warning.title,
                message: warning.message,
                recommendation: warning.recommendation
            )
        }

        let ralphInsight = RalphLoopInsight(
            reviewSummary: aiResponse.ralphLoop.review,
            analysisFindings: aiResponse.ralphLoop.analyze,
            learnings: aiResponse.ralphLoop.learn,
            actionPlan: aiResponse.ralphLoop.plan,
            habitSuggestion: aiResponse.ralphLoop.habituate
        )

        return WellnessReport(
            totalScreenTime: TimeInterval(usageData.totalMinutes * 60),
            categoryBreakdown: categoryUsages,
            moodImpactScore: aiResponse.moodImpactScore,
            brainHealthScore: aiResponse.brainHealthScore,
            productivityScore: aiResponse.productivityScore,
            aiAdvice: aiResponse.advice,
            warnings: warnings,
            ralphLoopInsights: ralphInsight
        )
    }

    /// GSD Phase 4: Reflect - Evaluate the report and generate insights
    func reflect(on report: WellnessReport) {
        // Check for critical conditions
        if report.overallWellnessScore < 30 {
            notificationService.sendCriticalAlert(
                totalMinutes: Int(report.totalScreenTime / 60),
                goalMinutes: Int(dataStore.userProfile.dailyScreenTimeGoal / 60)
            )
        }

        // Check category limits
        let profile = dataStore.userProfile
        for usage in report.categoryBreakdown {
            if let limit = profile.categoryLimits[usage.category],
               usage.totalMinutes > Int(limit / 60) {
                notificationService.sendUsageWarning(
                    category: usage.category,
                    currentMinutes: usage.totalMinutes,
                    limitMinutes: Int(limit / 60)
                )
            }
        }

        // Check late night usage
        let hour = Calendar.current.component(.hour, from: Date())
        if hour >= profile.warningThresholds.lateNightCutoffHour {
            notificationService.sendLateNightWarning()
        }
    }

    /// GSD Phase 5: Engage - Take action on findings
    func engage(with report: WellnessReport) {
        // Save report
        dataStore.saveReport(report)

        // Send daily summary
        let topCategory = report.categoryBreakdown
            .sorted { $0.totalMinutes > $1.totalMinutes }
            .first?.category.rawValue ?? "N/A"

        notificationService.sendDailySummary(
            totalMinutes: Int(report.totalScreenTime / 60),
            wellnessScore: report.overallWellnessScore,
            topCategory: topCategory
        )
    }

    // MARK: - Full Analysis Pipeline

    /// Run the complete GSD + Ralph Loop analysis pipeline
    func runFullAnalysis() async throws -> WellnessReport {
        await MainActor.run { self.isAnalyzing = true }
        defer { Task { @MainActor in self.isAnalyzing = false } }

        // GSD Phase 1: Capture
        let records = captureUsageData()

        // GSD Phase 2: Clarify
        let usageData = clarifyUsagePatterns(records)

        // GSD Phase 3: Organize (with AI analysis via Ralph Loop)
        let aiResponse = try await groqService.analyzeUsage(usageData)
        let report = organizeIntoReport(usageData: usageData, aiResponse: aiResponse)

        // GSD Phase 4: Reflect
        reflect(on: report)

        // GSD Phase 5: Engage
        engage(with: report)

        return report
    }

    // MARK: - Real-time Monitoring

    /// Start periodic monitoring (checks every 15 minutes)
    func startPeriodicMonitoring() {
        monitorTimer?.invalidate()
        monitorTimer = Timer.scheduledTimer(withTimeInterval: 900, repeats: true) { [weak self] _ in
            Task {
                try? await self?.checkThresholds()
            }
        }
    }

    func stopPeriodicMonitoring() {
        monitorTimer?.invalidate()
        monitorTimer = nil
    }

    /// Quick threshold check without full AI analysis
    private func checkThresholds() async throws {
        let records = captureUsageData()
        let breakdown = dataStore.getCategoryBreakdown(for: Date())
        let profile = dataStore.userProfile

        // Check social media threshold
        let socialMinutes = breakdown[.socialMedia] ?? 0
        if socialMinutes > profile.warningThresholds.socialMediaMinutes {
            let tip = try await groqService.generateQuickTip(
                currentMinutes: socialMinutes,
                category: "Social Media"
            )
            await MainActor.run {
                self.currentAlert = WellnessWarning(
                    severity: .warning,
                    title: "Social Media: \(socialMinutes)min",
                    message: tip,
                    category: .socialMedia,
                    recommendation: "Prova a fare una pausa di 10 minuti."
                )
            }
        }

        // Check total screen time
        let totalMinutes = records.reduce(0) { $0 + $1.durationMinutes }
        if totalMinutes > profile.warningThresholds.totalScreenMinutes {
            notificationService.sendCriticalAlert(
                totalMinutes: totalMinutes,
                goalMinutes: Int(profile.dailyScreenTimeGoal / 60)
            )
        }
    }

    // MARK: - Helpers

    private func findPeakUsageHour(_ records: [AppUsageRecord]) -> String {
        let hourCounts = Dictionary(
            grouping: records,
            by: { Calendar.current.component(.hour, from: $0.startTime) }
        ).mapValues { $0.reduce(0) { $0 + $1.durationMinutes } }

        let peakHour = hourCounts.max(by: { $0.value < $1.value })?.key ?? 12
        return String(format: "%02d:00", peakHour)
    }

    private func mapSeverity(_ severity: String) -> WarningSeverity {
        switch severity.lowercased() {
        case "info": return .info
        case "caution": return .caution
        case "warning": return .warning
        case "critical": return .critical
        default: return .info
        }
    }
}
