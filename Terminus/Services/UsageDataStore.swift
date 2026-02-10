import Foundation
import Combine

/// Local data persistence for usage records and reports
final class UsageDataStore: ObservableObject {

    static let shared = UsageDataStore()

    @Published var todayRecords: [AppUsageRecord] = []
    @Published var weekRecords: [AppUsageRecord] = []
    @Published var reports: [WellnessReport] = []
    @Published var userProfile: UserProfile = .default

    private let userDefaults = UserDefaults.standard
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    private let recordsKey = "terminus.usage.records"
    private let reportsKey = "terminus.wellness.reports"
    private let profileKey = "terminus.user.profile"

    init() {
        loadStoredData()
    }

    // MARK: - Usage Records

    func saveRecord(_ record: AppUsageRecord) {
        todayRecords.append(record)
        persistRecords()
    }

    func saveRecords(_ records: [AppUsageRecord]) {
        todayRecords.append(contentsOf: records)
        persistRecords()
    }

    func getRecords(for date: Date) -> [AppUsageRecord] {
        let calendar = Calendar.current
        return todayRecords.filter { calendar.isDate($0.date, inSameDayAs: date) }
    }

    func getRecords(from startDate: Date, to endDate: Date) -> [AppUsageRecord] {
        todayRecords.filter { $0.date >= startDate && $0.date <= endDate }
    }

    func getTotalMinutes(for date: Date) -> Int {
        getRecords(for: date).reduce(0) { $0 + $1.durationMinutes }
    }

    func getCategoryBreakdown(for date: Date) -> [AppCategory: Int] {
        var breakdown: [AppCategory: Int] = [:]
        for record in getRecords(for: date) {
            breakdown[record.category, default: 0] += record.durationMinutes
        }
        return breakdown
    }

    func getWeeklyAverage() -> Int {
        let calendar = Calendar.current
        let weekAgo = calendar.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        let records = getRecords(from: weekAgo, to: Date())

        guard !records.isEmpty else { return 0 }

        let totalMinutes = records.reduce(0) { $0 + $1.durationMinutes }
        return totalMinutes / 7
    }

    // MARK: - Wellness Reports

    func saveReport(_ report: WellnessReport) {
        reports.append(report)
        persistReports()
    }

    func getLatestReport() -> WellnessReport? {
        reports.sorted { $0.date > $1.date }.first
    }

    func getReports(last days: Int) -> [WellnessReport] {
        let calendar = Calendar.current
        let startDate = calendar.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        return reports.filter { $0.date >= startDate }.sorted { $0.date > $1.date }
    }

    // MARK: - User Profile

    func updateProfile(_ profile: UserProfile) {
        var updated = profile
        updated.lastUpdated = Date()
        userProfile = updated
        persistProfile()
    }

    // MARK: - Persistence

    private func loadStoredData() {
        if let data = userDefaults.data(forKey: recordsKey),
           let records = try? decoder.decode([AppUsageRecord].self, from: data) {
            todayRecords = records
        }

        if let data = userDefaults.data(forKey: reportsKey),
           let stored = try? decoder.decode([WellnessReport].self, from: data) {
            reports = stored
        }

        if let data = userDefaults.data(forKey: profileKey),
           let profile = try? decoder.decode(UserProfile.self, from: data) {
            userProfile = profile
        }
    }

    private func persistRecords() {
        if let data = try? encoder.encode(todayRecords) {
            userDefaults.set(data, forKey: recordsKey)
        }
    }

    private func persistReports() {
        if let data = try? encoder.encode(reports) {
            userDefaults.set(data, forKey: reportsKey)
        }
    }

    private func persistProfile() {
        if let data = try? encoder.encode(userProfile) {
            userDefaults.set(data, forKey: profileKey)
        }
    }

    /// Clear all stored data
    func resetAllData() {
        todayRecords = []
        weekRecords = []
        reports = []
        userProfile = .default
        userDefaults.removeObject(forKey: recordsKey)
        userDefaults.removeObject(forKey: reportsKey)
        userDefaults.removeObject(forKey: profileKey)
    }
}
