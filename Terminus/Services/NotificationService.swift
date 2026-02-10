import Foundation
import UserNotifications

/// Service for managing wellness notifications and usage alerts
final class NotificationService {

    static let shared = NotificationService()

    private let center = UNUserNotificationCenter.current()

    // MARK: - Authorization

    func requestAuthorization() async -> Bool {
        do {
            let granted = try await center.requestAuthorization(
                options: [.alert, .badge, .sound]
            )
            return granted
        } catch {
            print("Notification authorization failed: \(error.localizedDescription)")
            return false
        }
    }

    // MARK: - Usage Warnings

    /// Send an immediate warning when usage threshold is exceeded
    func sendUsageWarning(
        category: AppCategory,
        currentMinutes: Int,
        limitMinutes: Int
    ) {
        let content = UNMutableNotificationContent()
        content.title = "⚠️ Avviso Tempo Schermo"
        content.body = "Hai usato \(category.rawValue) per \(currentMinutes) minuti oggi. " +
            "Il tuo limite è \(limitMinutes) minuti. " +
            "Ricorda: l'uso eccessivo può influenzare il tuo umore e la concentrazione."
        content.sound = .default
        content.categoryIdentifier = "USAGE_WARNING"

        let request = UNNotificationRequest(
            identifier: "usage_warning_\(category.rawValue)_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil  // Immediate
        )

        center.add(request)
    }

    /// Send a critical alert for excessive total screen time
    func sendCriticalAlert(totalMinutes: Int, goalMinutes: Int) {
        let content = UNMutableNotificationContent()
        content.title = "🚨 Allerta Benessere Digitale"
        content.body = "Tempo schermo totale: \(totalMinutes) minuti (obiettivo: \(goalMinutes)min). " +
            "L'esposizione prolungata può causare affaticamento mentale, " +
            "disturbi del sonno e riduzione della produttività."
        content.sound = UNNotificationSound.defaultCriticalSound(withAudioVolume: 1.0)
        content.categoryIdentifier = "CRITICAL_ALERT"

        let request = UNNotificationRequest(
            identifier: "critical_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )

        center.add(request)
    }

    /// Schedule periodic wellness check-in
    func scheduleWellnessCheckIn(hour: Int, minute: Int) {
        let content = UNMutableNotificationContent()
        content.title = "🧠 Check-in Benessere"
        content.body = "Come ti senti oggi? Apri Terminus per vedere il tuo report " +
            "e scoprire come il tempo schermo sta influenzando la tua giornata."
        content.sound = .default
        content.categoryIdentifier = "WELLNESS_CHECKIN"

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(
            dateMatching: dateComponents,
            repeats: true
        )

        let request = UNNotificationRequest(
            identifier: "wellness_checkin",
            content: content,
            trigger: trigger
        )

        center.add(request)
    }

    /// Send late night usage warning
    func sendLateNightWarning() {
        let content = UNMutableNotificationContent()
        content.title = "🌙 Utilizzo Notturno"
        content.body = "Stai usando il telefono tardi. La luce blu dello schermo " +
            "può disturbare la produzione di melatonina e ridurre la qualità del sonno. " +
            "Prova a mettere via il telefono e rilassarti."
        content.sound = .default
        content.categoryIdentifier = "LATE_NIGHT"

        let request = UNNotificationRequest(
            identifier: "late_night_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )

        center.add(request)
    }

    /// Send daily summary notification
    func sendDailySummary(totalMinutes: Int, wellnessScore: Int, topCategory: String) {
        let content = UNMutableNotificationContent()
        content.title = "📊 Riepilogo Giornaliero"
        content.body = "Oggi: \(totalMinutes)min di schermo | " +
            "Benessere: \(wellnessScore)/100 | " +
            "Top: \(topCategory). Apri per i dettagli."
        content.sound = .default
        content.categoryIdentifier = "DAILY_SUMMARY"

        let request = UNNotificationRequest(
            identifier: "daily_summary_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )

        center.add(request)
    }

    // MARK: - Cleanup

    func removeAllPending() {
        center.removeAllPendingNotificationRequests()
    }

    func removePending(identifiers: [String]) {
        center.removePendingNotificationRequests(withIdentifiers: identifiers)
    }
}
