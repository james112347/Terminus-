import Foundation

/// Daily wellness report generated from usage data + AI analysis
struct WellnessReport: Identifiable, Codable {
    let id: UUID
    let date: Date
    let totalScreenTime: TimeInterval
    let categoryBreakdown: [CategoryUsage]
    let moodImpactScore: Int          // 1-100 (100 = worst impact)
    let brainHealthScore: Int          // 1-100 (100 = worst impact)
    let productivityScore: Int         // 1-100 (100 = best)
    let aiAdvice: String
    let warnings: [WellnessWarning]
    let ralphLoopInsights: RalphLoopInsight

    var overallWellnessScore: Int {
        let moodComponent = 100 - moodImpactScore
        let brainComponent = 100 - brainHealthScore
        let prodComponent = productivityScore
        return (moodComponent + brainComponent + prodComponent) / 3
    }

    var wellnessLevel: WellnessLevel {
        switch overallWellnessScore {
        case 80...100: return .excellent
        case 60..<80: return .good
        case 40..<60: return .moderate
        case 20..<40: return .poor
        default: return .critical
        }
    }

    var totalScreenTimeFormatted: String {
        let hours = Int(totalScreenTime) / 3600
        let minutes = (Int(totalScreenTime) % 3600) / 60
        return "\(hours)h \(minutes)m"
    }

    init(
        id: UUID = UUID(),
        date: Date = Date(),
        totalScreenTime: TimeInterval,
        categoryBreakdown: [CategoryUsage],
        moodImpactScore: Int,
        brainHealthScore: Int,
        productivityScore: Int,
        aiAdvice: String,
        warnings: [WellnessWarning],
        ralphLoopInsights: RalphLoopInsight
    ) {
        self.id = id
        self.date = date
        self.totalScreenTime = totalScreenTime
        self.categoryBreakdown = categoryBreakdown
        self.moodImpactScore = moodImpactScore
        self.brainHealthScore = brainHealthScore
        self.productivityScore = productivityScore
        self.aiAdvice = aiAdvice
        self.warnings = warnings
        self.ralphLoopInsights = ralphLoopInsights
    }
}

enum WellnessLevel: String, Codable {
    case excellent = "Eccellente"
    case good = "Buono"
    case moderate = "Moderato"
    case poor = "Scarso"
    case critical = "Critico"

    var emoji: String {
        switch self {
        case .excellent: return "🌟"
        case .good: return "😊"
        case .moderate: return "😐"
        case .poor: return "😟"
        case .critical: return "🚨"
        }
    }

    var color: String {
        switch self {
        case .excellent: return "green"
        case .good: return "blue"
        case .moderate: return "yellow"
        case .poor: return "orange"
        case .critical: return "red"
        }
    }
}

struct CategoryUsage: Identifiable, Codable {
    let id: UUID
    let category: AppCategory
    let totalMinutes: Int
    let percentage: Double
    let appDetails: [AppUsageSummary]

    init(
        id: UUID = UUID(),
        category: AppCategory,
        totalMinutes: Int,
        percentage: Double,
        appDetails: [AppUsageSummary] = []
    ) {
        self.id = id
        self.category = category
        self.totalMinutes = totalMinutes
        self.percentage = percentage
        self.appDetails = appDetails
    }
}

struct AppUsageSummary: Identifiable, Codable {
    let id: UUID
    let appName: String
    let minutes: Int
    let pickups: Int

    init(id: UUID = UUID(), appName: String, minutes: Int, pickups: Int = 0) {
        self.id = id
        self.appName = appName
        self.minutes = minutes
        self.pickups = pickups
    }
}

struct WellnessWarning: Identifiable, Codable {
    let id: UUID
    let severity: WarningSeverity
    let title: String
    let message: String
    let category: AppCategory?
    let recommendation: String

    init(
        id: UUID = UUID(),
        severity: WarningSeverity,
        title: String,
        message: String,
        category: AppCategory? = nil,
        recommendation: String
    ) {
        self.id = id
        self.severity = severity
        self.title = title
        self.message = message
        self.category = category
        self.recommendation = recommendation
    }
}

enum WarningSeverity: String, Codable {
    case info = "Info"
    case caution = "Attenzione"
    case warning = "Avviso"
    case critical = "Critico"

    var icon: String {
        switch self {
        case .info: return "info.circle.fill"
        case .caution: return "exclamationmark.triangle.fill"
        case .warning: return "exclamationmark.circle.fill"
        case .critical: return "xmark.octagon.fill"
        }
    }
}

/// Insights generated through the Ralph Loop methodology
struct RalphLoopInsight: Codable {
    let reviewSummary: String      // What happened today
    let analysisFindings: String   // Why it matters
    let learnings: String          // What we learned
    let actionPlan: String         // What to do next
    let habitSuggestion: String    // Long-term habit to build
}
