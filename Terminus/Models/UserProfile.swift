import Foundation

/// User profile with wellness goals and preferences
struct UserProfile: Codable {
    var name: String
    var dailyScreenTimeGoal: TimeInterval  // in seconds
    var categoryLimits: [AppCategory: TimeInterval]
    var notificationsEnabled: Bool
    var warningThresholds: WarningThresholds
    var weeklyGoals: [WeeklyGoal]
    var createdAt: Date
    var lastUpdated: Date

    var dailyGoalHours: Double {
        dailyScreenTimeGoal / 3600
    }

    init(
        name: String = "",
        dailyScreenTimeGoal: TimeInterval = 7200,  // 2 hours default
        categoryLimits: [AppCategory: TimeInterval] = [:],
        notificationsEnabled: Bool = true,
        warningThresholds: WarningThresholds = .default,
        weeklyGoals: [WeeklyGoal] = [],
        createdAt: Date = Date(),
        lastUpdated: Date = Date()
    ) {
        self.name = name
        self.dailyScreenTimeGoal = dailyScreenTimeGoal
        self.categoryLimits = categoryLimits
        self.notificationsEnabled = notificationsEnabled
        self.warningThresholds = warningThresholds
        self.weeklyGoals = weeklyGoals
        self.createdAt = createdAt
        self.lastUpdated = lastUpdated
    }

    static let `default` = UserProfile()
}

struct WarningThresholds: Codable {
    var socialMediaMinutes: Int
    var gamingMinutes: Int
    var entertainmentMinutes: Int
    var totalScreenMinutes: Int
    var lateNightCutoffHour: Int  // e.g. 23 = 11 PM

    static let `default` = WarningThresholds(
        socialMediaMinutes: 60,
        gamingMinutes: 90,
        entertainmentMinutes: 120,
        totalScreenMinutes: 240,
        lateNightCutoffHour: 23
    )
}

struct WeeklyGoal: Identifiable, Codable {
    let id: UUID
    var description: String
    var targetReduction: Int  // minutes to reduce
    var category: AppCategory?
    var isCompleted: Bool
    var startDate: Date
    var endDate: Date

    init(
        id: UUID = UUID(),
        description: String,
        targetReduction: Int,
        category: AppCategory? = nil,
        isCompleted: Bool = false,
        startDate: Date = Date(),
        endDate: Date = Calendar.current.date(byAdding: .day, value: 7, to: Date()) ?? Date()
    ) {
        self.id = id
        self.description = description
        self.targetReduction = targetReduction
        self.category = category
        self.isCompleted = isCompleted
        self.startDate = startDate
        self.endDate = endDate
    }
}
