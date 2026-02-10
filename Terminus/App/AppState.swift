import SwiftUI
import Combine

/// Central app state manager following GSD (Get Stuff Done) methodology
/// Tracks current phase: Capture -> Clarify -> Organize -> Reflect -> Engage
final class AppState: ObservableObject {

    enum GSDPhase: String, CaseIterable {
        case capture = "Capture"
        case clarify = "Clarify"
        case organize = "Organize"
        case reflect = "Reflect"
        case engage = "Engage"

        var description: String {
            switch self {
            case .capture: return "Raccolta dati utilizzo app"
            case .clarify: return "Analisi pattern di utilizzo"
            case .organize: return "Organizzazione report benessere"
            case .reflect: return "Riflessione sugli effetti"
            case .engage: return "Azioni per migliorare"
            }
        }

        var icon: String {
            switch self {
            case .capture: return "tray.and.arrow.down"
            case .clarify: return "magnifyingglass"
            case .organize: return "folder"
            case .reflect: return "brain.head.profile"
            case .engage: return "bolt.fill"
            }
        }
    }

    /// Ralph Loop phases: Review -> Analyze -> Learn -> Plan -> Habituate
    enum RalphLoopPhase: String, CaseIterable {
        case review = "Review"
        case analyze = "Analyze"
        case learn = "Learn"
        case plan = "Plan"
        case habituate = "Habituate"

        var description: String {
            switch self {
            case .review: return "Revisione tempo schermo giornaliero"
            case .analyze: return "Analisi impatto su umore e cervello"
            case .learn: return "Apprendimento dai pattern"
            case .plan: return "Pianificazione limiti sani"
            case .habituate: return "Costruzione abitudini positive"
            }
        }
    }

    @Published var currentGSDPhase: GSDPhase = .capture
    @Published var currentRalphPhase: RalphLoopPhase = .review
    @Published var isOnboardingComplete: Bool = false
    @Published var hasScreenTimePermission: Bool = false
    @Published var selectedTab: Tab = .dashboard

    enum Tab: Int {
        case dashboard = 0
        case reports = 1
        case wellness = 2
        case settings = 3
    }

    func advanceGSDPhase() {
        let phases = GSDPhase.allCases
        guard let currentIndex = phases.firstIndex(of: currentGSDPhase),
              currentIndex + 1 < phases.count else {
            currentGSDPhase = .capture
            return
        }
        currentGSDPhase = phases[currentIndex + 1]
    }

    func advanceRalphLoop() {
        let phases = RalphLoopPhase.allCases
        guard let currentIndex = phases.firstIndex(of: currentRalphPhase),
              currentIndex + 1 < phases.count else {
            currentRalphPhase = .review
            return
        }
        currentRalphPhase = phases[currentIndex + 1]
    }
}
