import Foundation
import Combine

/// Scientific energy calculation engine based on sleep science, circadian rhythm,
/// and screen time impact. Auto-updates over time.
///
/// Model: Baseline (sleep) + Activity bonus + Hydration bonus - Screen drain - Content drain
///        - Fragmentation drain - Goal penalty - Bedtime penalty, scaled by stress & circadian rhythm
final class EnergyCalculator: ObservableObject {

    static let shared = EnergyCalculator()

    @Published var currentEnergy: Int = 50
    @Published var energyLabel: String = "Moderata"
    @Published var breakdown: EnergyBreakdown = .default

    private var updateTimer: Timer?
    private let dataStore = UsageDataStore.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        recalculate()
        startAutoUpdate()

        // Recalculate when usage data changes
        dataStore.$todayRecords
            .debounce(for: .seconds(2), scheduler: DispatchQueue.main)
            .sink { [weak self] _ in self?.recalculate() }
            .store(in: &cancellables)
    }

    // MARK: - Auto Update

    /// Start timer that recalculates energy every 5 minutes
    /// (circadian rhythm changes, time passes, drain accumulates)
    func startAutoUpdate() {
        updateTimer?.invalidate()
        updateTimer = Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { [weak self] _ in
            self?.recalculate()
        }
    }

    func stopAutoUpdate() {
        updateTimer?.invalidate()
        updateTimer = nil
    }

    // MARK: - Calculation

    func recalculate() {
        let profile = dataStore.userProfile
        let records = dataStore.getRecords(for: Date())
        let totalMinutes = records.reduce(0) { $0 + $1.durationMinutes }
        let categoryBreakdown = Dictionary(grouping: records, by: \.category)

        let bd = calculateBreakdown(
            profile: profile,
            totalMinutes: totalMinutes,
            categoryRecords: categoryBreakdown,
            pickups: records.count
        )

        DispatchQueue.main.async {
            self.breakdown = bd
            self.currentEnergy = bd.finalEnergy
            self.energyLabel = Self.label(for: bd.finalEnergy)
        }
    }

    private func calculateBreakdown(
        profile: UserProfile,
        totalMinutes: Int,
        categoryRecords: [AppCategory: [AppUsageRecord]],
        pickups: Int
    ) -> EnergyBreakdown {
        let lifestyle = profile.lifestyle

        // 1. SLEEP -> baseline (most important factor)
        let sleepHours: Double
        if profile.isProfileCompleted {
            sleepHours = Double(lifestyle.calculateSleepHours())
        } else {
            sleepHours = 7.0 // default assumption
        }

        let baseline: Double
        switch sleepHours {
        case ...3: baseline = 35
        case ...4: baseline = 48
        case ...5: baseline = 60
        case ...6: baseline = 73
        case ...7: baseline = 85
        case ...8: baseline = 95
        case ...9: baseline = 98
        default: baseline = 95 // oversleep slightly reduces
        }

        // 2. PHYSICAL ACTIVITY -> energy bonus
        let activityBonus: Double
        if profile.isProfileCompleted {
            switch lifestyle.activityLevel {
            case .sedentary: activityBonus = 0
            case .light: activityBonus = 6
            case .moderate: activityBonus = 10
            case .active: activityBonus = 8
            case .veryActive: activityBonus = 5 // intense tires too
            }
        } else {
            activityBonus = 6 // default moderate
        }

        // 3. STRESS -> amplifies drain
        let stressMultiplier: Double
        if profile.isProfileCompleted {
            switch lifestyle.stressLevel {
            case .veryLow: stressMultiplier = 0.80
            case .low: stressMultiplier = 0.90
            case .moderate: stressMultiplier = 1.0
            case .high: stressMultiplier = 1.15
            case .veryHigh: stressMultiplier = 1.30
            }
        } else {
            stressMultiplier = 1.0
        }

        // 4. SCREEN DURATION -> sigmoid drain (saturates at ~35, midpoint at 5h)
        let hours = Double(totalMinutes) / 60.0
        let durationDrain = 35.0 / (1.0 + exp(-(hours - 5.0) * 0.5))

        // 5. CONTENT QUALITY -> drain with cap at 15
        let drainWeights: [AppCategory: Double] = [
            .socialMedia: 0.04, .entertainment: 0.03, .gaming: 0.03,
            .news: 0.025, .other: 0.02, .communication: 0.01,
            .productivity: 0.005, .education: 0.003, .health: 0.003, .utilities: 0.005
        ]
        var contentDrain: Double = 0
        for (category, records) in categoryRecords {
            let minutes = Double(records.reduce(0) { $0 + $1.durationMinutes })
            contentDrain += minutes * (drainWeights[category] ?? 0.02)
        }
        contentDrain = min(15, contentDrain)

        // 6. FRAGMENTATION -> pickups drain (cap at 8)
        let fragmentDrain = min(8.0, Double(pickups) * 0.06)

        // 7. GOAL -> penalty if over / bonus if under
        let goalMinutes = Int(profile.dailyScreenTimeGoal / 60)
        var goalDrain: Double = 0
        if totalMinutes > goalMinutes {
            let overMin = Double(totalMinutes - goalMinutes)
            goalDrain = min(10, sqrt(overMin / 20) * 2)
        } else if totalMinutes > 0 {
            goalDrain = -min(5, Double(goalMinutes - totalMinutes) / Double(max(goalMinutes, 1)) * 8)
        }

        // 8. CIRCADIAN RHYTHM -> time-based multiplier
        let currentHour = Calendar.current.component(.hour, from: Date())
        var circadianMult: Double = 1.0
        if currentHour >= 22 || currentHour < 6 {
            circadianMult = 1.15
        } else if currentHour >= 13 && currentHour < 15 {
            circadianMult = 1.05 // post-lunch dip
        } else if currentHour >= 20 {
            circadianMult = 1.08
        }

        // 9. BEDTIME PENALTY -> late bedtime amplifies tiredness
        var bedtimePenalty: Double = 0
        if profile.isProfileCompleted {
            let bedH = lifestyle.bedTime
            if bedH >= 0 && bedH < 5 {
                bedtimePenalty = 6.0 + Double(bedH) * 1.5
            }
        }

        // Final calculation
        let startEnergy = min(100, baseline + activityBonus)
        let totalDrain = (durationDrain + contentDrain + fragmentDrain + goalDrain + bedtimePenalty) * stressMultiplier * circadianMult
        let energy = startEnergy - totalDrain
        let finalEnergy = max(0, min(100, Int(energy.rounded())))

        // Hours until bed
        var hoursUntilBed: Double? = nil
        if profile.isProfileCompleted {
            let bedH = lifestyle.bedTime
            if currentHour < bedH {
                hoursUntilBed = Double(bedH - currentHour)
            } else if currentHour > bedH {
                hoursUntilBed = Double(24 - currentHour + bedH)
            }
        }

        return EnergyBreakdown(
            finalEnergy: finalEnergy,
            sleepHours: sleepHours,
            baseline: Int(baseline),
            activityBonus: Int(activityBonus),
            stressMultiplier: stressMultiplier,
            durationDrain: Int(durationDrain.rounded()),
            contentDrain: Int(contentDrain.rounded()),
            fragmentDrain: Int(fragmentDrain.rounded()),
            goalDrain: Int(goalDrain.rounded()),
            bedtimePenalty: Int(bedtimePenalty.rounded()),
            circadianMultiplier: circadianMult,
            startEnergy: Int(startEnergy),
            totalDrain: Int(totalDrain.rounded()),
            hoursUntilBed: hoursUntilBed,
            currentHour: currentHour
        )
    }

    // MARK: - Labels & Colors

    static func label(for energy: Int) -> String {
        switch energy {
        case 80...100: return "Alta"
        case 60..<80: return "Buona"
        case 40..<60: return "Moderata"
        case 20..<40: return "Bassa"
        default: return "Esaurita"
        }
    }

    static func colorName(for energy: Int) -> String {
        switch energy {
        case 70...100: return "green"
        case 45..<70: return "orange"
        default: return "red"
        }
    }

    /// Generate personalized tips based on current state
    func generateTips() -> [String] {
        let profile = dataStore.userProfile
        let bd = breakdown
        var tips: [String] = []

        // Sleep tips
        if bd.sleepHours < 5 {
            tips.append("Hai dormito molto poco. Evita caffeina dopo le 14 e prova un power nap di 20 min.")
        } else if bd.sleepHours < 6.5 {
            tips.append("Sonno sotto la media. Cerca di andare a letto prima stasera.")
        }

        // Activity tips
        if profile.isProfileCompleted && profile.lifestyle.activityLevel == .sedentary && bd.finalEnergy < 60 {
            tips.append("Nessuna attivita fisica. Anche 10 minuti di camminata danno un boost di energia immediato.")
        }

        // Stress tips
        if profile.isProfileCompleted && (profile.lifestyle.stressLevel == .high || profile.lifestyle.stressLevel == .veryHigh) {
            tips.append("Stress alto: amplifica l'effetto negativo del telefono. Prova 5 min di respirazione (4s inspira, 7s trattieni, 8s espira).")
        }

        // Screen tips
        if bd.durationDrain > 25 {
            tips.append("Uso schermo prolungato. Regola 20-20-20: ogni 20 min guarda a 20 metri per 20 secondi.")
        } else if bd.durationDrain > 15 {
            tips.append("Uso schermo nella media. Fai pause piu frequenti nell'ultima parte della giornata.")
        }

        // Content tips
        if bd.contentDrain > 8 {
            tips.append("Contenuti ad alto drain (social/intrattenimento). Prova a sostituire 15 min con musica o lettura.")
        }

        // Goal tips
        if bd.goalDrain > 5 {
            tips.append("Hai superato di molto l'obiettivo giornaliero. Imposta un timer per le prossime sessioni.")
        }

        // Bedtime proximity
        if let hoursLeft = bd.hoursUntilBed {
            if hoursLeft < 2 && bd.finalEnergy < 40 {
                tips.append("Manca poco a dormire e l'energia e bassa. Smetti di usare il telefono, la luce blu peggiora il sonno.")
            } else if hoursLeft > 5 && bd.finalEnergy < 30 {
                tips.append("Ancora molte ore davanti ma poca energia. Priorita: pausa schermo, idratazione, movimento.")
            }
        }

        return Array(tips.prefix(4))
    }
}

// MARK: - Energy Breakdown Model

struct EnergyBreakdown {
    let finalEnergy: Int
    let sleepHours: Double
    let baseline: Int
    let activityBonus: Int
    let stressMultiplier: Double
    let durationDrain: Int
    let contentDrain: Int
    let fragmentDrain: Int
    let goalDrain: Int
    let bedtimePenalty: Int
    let circadianMultiplier: Double
    let startEnergy: Int
    let totalDrain: Int
    let hoursUntilBed: Double?
    let currentHour: Int

    static let `default` = EnergyBreakdown(
        finalEnergy: 50, sleepHours: 7, baseline: 85, activityBonus: 6,
        stressMultiplier: 1.0, durationDrain: 0, contentDrain: 0,
        fragmentDrain: 0, goalDrain: 0, bedtimePenalty: 0,
        circadianMultiplier: 1.0, startEnergy: 91, totalDrain: 0,
        hoursUntilBed: nil, currentHour: 12
    )
}
