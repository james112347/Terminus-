import Foundation

/// Represents a single app usage record
struct AppUsageRecord: Identifiable, Codable {
    let id: UUID
    let appName: String
    let bundleIdentifier: String
    let category: AppCategory
    let startTime: Date
    let endTime: Date
    let date: Date

    var duration: TimeInterval {
        endTime.timeIntervalSince(startTime)
    }

    var durationMinutes: Int {
        Int(duration / 60)
    }

    var durationFormatted: String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }

    init(
        id: UUID = UUID(),
        appName: String,
        bundleIdentifier: String,
        category: AppCategory,
        startTime: Date,
        endTime: Date,
        date: Date = Date()
    ) {
        self.id = id
        self.appName = appName
        self.bundleIdentifier = bundleIdentifier
        self.category = category
        self.startTime = startTime
        self.endTime = endTime
        self.date = date
    }
}

/// App categories for classification
enum AppCategory: String, Codable, CaseIterable {
    case socialMedia = "Social Media"
    case entertainment = "Intrattenimento"
    case productivity = "Produttività"
    case gaming = "Gaming"
    case communication = "Comunicazione"
    case news = "Notizie"
    case education = "Educazione"
    case health = "Salute"
    case utilities = "Utilità"
    case other = "Altro"

    var icon: String {
        switch self {
        case .socialMedia: return "person.2.fill"
        case .entertainment: return "play.rectangle.fill"
        case .productivity: return "briefcase.fill"
        case .gaming: return "gamecontroller.fill"
        case .communication: return "message.fill"
        case .news: return "newspaper.fill"
        case .education: return "book.fill"
        case .health: return "heart.fill"
        case .utilities: return "wrench.fill"
        case .other: return "square.grid.2x2.fill"
        }
    }

    var riskLevel: RiskLevel {
        switch self {
        case .socialMedia: return .high
        case .entertainment: return .medium
        case .gaming: return .high
        case .news: return .medium
        case .communication: return .low
        case .productivity: return .low
        case .education: return .low
        case .health: return .low
        case .utilities: return .low
        case .other: return .medium
        }
    }

    var color: String {
        switch self {
        case .socialMedia: return "red"
        case .entertainment: return "orange"
        case .gaming: return "purple"
        case .news: return "blue"
        case .communication: return "green"
        case .productivity: return "teal"
        case .education: return "indigo"
        case .health: return "pink"
        case .utilities: return "gray"
        case .other: return "secondary"
        }
    }
}

enum RiskLevel: String, Codable, Comparable {
    case low = "Basso"
    case medium = "Medio"
    case high = "Alto"

    private var sortOrder: Int {
        switch self {
        case .low: return 0
        case .medium: return 1
        case .high: return 2
        }
    }

    static func < (lhs: RiskLevel, rhs: RiskLevel) -> Bool {
        lhs.sortOrder < rhs.sortOrder
    }
}
