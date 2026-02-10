import Foundation

/// User profile with wellness goals, preferences, and lifestyle data
struct UserProfile: Codable {
    var name: String
    var dailyScreenTimeGoal: TimeInterval  // in seconds
    var categoryLimits: [AppCategory: TimeInterval]
    var notificationsEnabled: Bool
    var warningThresholds: WarningThresholds
    var weeklyGoals: [WeeklyGoal]
    var createdAt: Date
    var lastUpdated: Date

    // MARK: - Lifestyle Profile

    var isProfileCompleted: Bool
    var lifestyle: LifestyleProfile

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
        lastUpdated: Date = Date(),
        isProfileCompleted: Bool = false,
        lifestyle: LifestyleProfile = .default
    ) {
        self.name = name
        self.dailyScreenTimeGoal = dailyScreenTimeGoal
        self.categoryLimits = categoryLimits
        self.notificationsEnabled = notificationsEnabled
        self.warningThresholds = warningThresholds
        self.weeklyGoals = weeklyGoals
        self.createdAt = createdAt
        self.lastUpdated = lastUpdated
        self.isProfileCompleted = isProfileCompleted
        self.lifestyle = lifestyle
    }

    static let `default` = UserProfile()
}

// MARK: - Lifestyle Profile

struct LifestyleProfile: Codable {
    var ageRange: AgeRange
    var occupation: Occupation
    var workSchedule: WorkSchedule
    var wakeUpTime: Int          // hour (0-23)
    var bedTime: Int             // hour (0-23)
    var chronotype: Chronotype   // mattiniero/nottambulo
    var socialContext: SocialContext
    var activityLevel: ActivityLevel
    var stressLevel: StressLevel
    var primaryGoals: [WellnessGoal]
    var mainDigitalActivities: [DigitalActivity]
    var personalityType: PersonalityType
    var freeTimePreferences: [FreeTimePreference]

    static let `default` = LifestyleProfile(
        ageRange: .adult2635,
        occupation: .employee,
        workSchedule: .standard,
        wakeUpTime: 7,
        bedTime: 23,
        chronotype: .neutral,
        socialContext: .alone,
        activityLevel: .moderate,
        stressLevel: .moderate,
        primaryGoals: [],
        mainDigitalActivities: [],
        personalityType: .ambivert,
        freeTimePreferences: []
    )

    /// Generate a textual summary for AI context
    var aiContextDescription: String {
        var parts: [String] = []

        parts.append("Eta: \(ageRange.label)")
        parts.append("Occupazione: \(occupation.label)")
        parts.append("Orario lavoro: \(workSchedule.label)")
        parts.append("Sveglia: ore \(wakeUpTime):00, A letto: ore \(bedTime):00")
        parts.append("Cronotipo: \(chronotype.label)")
        parts.append("Contesto sociale: \(socialContext.label)")
        parts.append("Attivita fisica: \(activityLevel.label)")
        parts.append("Livello stress: \(stressLevel.label)")
        parts.append("Personalita: \(personalityType.label)")

        if !primaryGoals.isEmpty {
            parts.append("Obiettivi: \(primaryGoals.map(\.label).joined(separator: ", "))")
        }
        if !mainDigitalActivities.isEmpty {
            parts.append("Attivita digitali principali: \(mainDigitalActivities.map(\.label).joined(separator: ", "))")
        }
        if !freeTimePreferences.isEmpty {
            parts.append("Tempo libero: \(freeTimePreferences.map(\.label).joined(separator: ", "))")
        }

        let sleepHours = calculateSleepHours()
        parts.append("Ore di sonno stimate: \(sleepHours)h")

        return parts.joined(separator: "\n")
    }

    /// Calculate estimated sleep duration
    func calculateSleepHours() -> Int {
        if wakeUpTime > bedTime {
            return wakeUpTime - bedTime
        } else {
            return (24 - bedTime) + wakeUpTime
        }
    }
}

// MARK: - Lifestyle Enums

enum AgeRange: String, Codable, CaseIterable {
    case teen1317 = "teen_13_17"
    case young1825 = "young_18_25"
    case adult2635 = "adult_26_35"
    case adult3645 = "adult_36_45"
    case mature4660 = "mature_46_60"
    case senior60plus = "senior_60_plus"

    var label: String {
        switch self {
        case .teen1317: return "13-17 anni"
        case .young1825: return "18-25 anni"
        case .adult2635: return "26-35 anni"
        case .adult3645: return "36-45 anni"
        case .mature4660: return "46-60 anni"
        case .senior60plus: return "60+ anni"
        }
    }
}

enum Occupation: String, Codable, CaseIterable {
    case student = "student"
    case employee = "employee"
    case freelance = "freelance"
    case entrepreneur = "entrepreneur"
    case unemployed = "unemployed"
    case homemaker = "homemaker"
    case retired = "retired"

    var label: String {
        switch self {
        case .student: return "Studente"
        case .employee: return "Lavoratore dipendente"
        case .freelance: return "Freelance"
        case .entrepreneur: return "Imprenditore"
        case .unemployed: return "Disoccupato"
        case .homemaker: return "Casalingo/a"
        case .retired: return "Pensionato/a"
        }
    }

    var icon: String {
        switch self {
        case .student: return "graduationcap.fill"
        case .employee: return "building.2.fill"
        case .freelance: return "laptopcomputer"
        case .entrepreneur: return "briefcase.fill"
        case .unemployed: return "magnifyingglass"
        case .homemaker: return "house.fill"
        case .retired: return "leaf.fill"
        }
    }
}

enum WorkSchedule: String, Codable, CaseIterable {
    case standard = "standard"       // 9-18
    case shifts = "shifts"           // turni
    case flexible = "flexible"       // flessibile
    case night = "night"             // notturno
    case partTime = "part_time"
    case notWorking = "not_working"

    var label: String {
        switch self {
        case .standard: return "Standard (9-18)"
        case .shifts: return "Turni"
        case .flexible: return "Flessibile"
        case .night: return "Notturno"
        case .partTime: return "Part-time"
        case .notWorking: return "Non lavoro"
        }
    }
}

enum Chronotype: String, Codable, CaseIterable {
    case earlyBird = "early_bird"
    case neutral = "neutral"
    case nightOwl = "night_owl"

    var label: String {
        switch self {
        case .earlyBird: return "Mattiniero"
        case .neutral: return "Neutro"
        case .nightOwl: return "Nottambulo"
        }
    }

    var icon: String {
        switch self {
        case .earlyBird: return "sunrise.fill"
        case .neutral: return "sun.max.fill"
        case .nightOwl: return "moon.stars.fill"
        }
    }
}

enum SocialContext: String, Codable, CaseIterable {
    case alone = "alone"
    case partner = "partner"
    case family = "family"
    case roommates = "roommates"

    var label: String {
        switch self {
        case .alone: return "Vivo da solo/a"
        case .partner: return "In coppia"
        case .family: return "Con famiglia"
        case .roommates: return "Con coinquilini"
        }
    }

    var icon: String {
        switch self {
        case .alone: return "person.fill"
        case .partner: return "heart.fill"
        case .family: return "figure.2.and.child.holdinghands"
        case .roommates: return "person.3.fill"
        }
    }
}

enum ActivityLevel: String, Codable, CaseIterable {
    case sedentary = "sedentary"
    case light = "light"
    case moderate = "moderate"
    case active = "active"
    case veryActive = "very_active"

    var label: String {
        switch self {
        case .sedentary: return "Sedentario"
        case .light: return "Leggero"
        case .moderate: return "Moderato"
        case .active: return "Attivo"
        case .veryActive: return "Molto attivo"
        }
    }

    var icon: String {
        switch self {
        case .sedentary: return "figure.seated.seatbelt"
        case .light: return "figure.walk"
        case .moderate: return "figure.hiking"
        case .active: return "figure.run"
        case .veryActive: return "figure.highintensity.intervaltraining"
        }
    }
}

enum StressLevel: String, Codable, CaseIterable {
    case veryLow = "very_low"
    case low = "low"
    case moderate = "moderate"
    case high = "high"
    case veryHigh = "very_high"

    var label: String {
        switch self {
        case .veryLow: return "Molto basso"
        case .low: return "Basso"
        case .moderate: return "Moderato"
        case .high: return "Alto"
        case .veryHigh: return "Molto alto"
        }
    }
}

enum PersonalityType: String, Codable, CaseIterable {
    case introvert = "introvert"
    case ambivert = "ambivert"
    case extrovert = "extrovert"

    var label: String {
        switch self {
        case .introvert: return "Introverso"
        case .ambivert: return "Ambiverso"
        case .extrovert: return "Estroverso"
        }
    }

    var icon: String {
        switch self {
        case .introvert: return "book.fill"
        case .ambivert: return "person.2.fill"
        case .extrovert: return "party.popper.fill"
        }
    }
}

enum WellnessGoal: String, Codable, CaseIterable {
    case reduceSocial = "reduce_social"
    case betterSleep = "better_sleep"
    case moreProductivity = "more_productivity"
    case lessAnxiety = "less_anxiety"
    case moreExercise = "more_exercise"
    case betterFocus = "better_focus"
    case digitalDetox = "digital_detox"
    case balancedLife = "balanced_life"

    var label: String {
        switch self {
        case .reduceSocial: return "Ridurre social media"
        case .betterSleep: return "Dormire meglio"
        case .moreProductivity: return "Piu produttivita"
        case .lessAnxiety: return "Meno ansia"
        case .moreExercise: return "Piu attivita fisica"
        case .betterFocus: return "Piu concentrazione"
        case .digitalDetox: return "Digital detox"
        case .balancedLife: return "Vita equilibrata"
        }
    }

    var icon: String {
        switch self {
        case .reduceSocial: return "hand.raised.fill"
        case .betterSleep: return "bed.double.fill"
        case .moreProductivity: return "bolt.fill"
        case .lessAnxiety: return "heart.circle.fill"
        case .moreExercise: return "figure.run"
        case .betterFocus: return "target"
        case .digitalDetox: return "iphone.slash"
        case .balancedLife: return "scale.3d"
        }
    }
}

enum DigitalActivity: String, Codable, CaseIterable {
    case socialScrolling = "social_scrolling"
    case messaging = "messaging"
    case gaming = "gaming"
    case streaming = "streaming"
    case news = "news"
    case workEmail = "work_email"
    case learning = "learning"
    case shopping = "shopping"

    var label: String {
        switch self {
        case .socialScrolling: return "Scrolling social"
        case .messaging: return "Messaggistica"
        case .gaming: return "Gaming"
        case .streaming: return "Streaming video"
        case .news: return "Notizie"
        case .workEmail: return "Email/Lavoro"
        case .learning: return "Apprendimento"
        case .shopping: return "Shopping online"
        }
    }

    var icon: String {
        switch self {
        case .socialScrolling: return "arrow.up.arrow.down"
        case .messaging: return "bubble.left.and.bubble.right.fill"
        case .gaming: return "gamecontroller.fill"
        case .streaming: return "play.tv.fill"
        case .news: return "newspaper.fill"
        case .workEmail: return "envelope.fill"
        case .learning: return "book.fill"
        case .shopping: return "cart.fill"
        }
    }
}

enum FreeTimePreference: String, Codable, CaseIterable {
    case sport = "sport"
    case reading = "reading"
    case socializing = "socializing"
    case nature = "nature"
    case cooking = "cooking"
    case music = "music"
    case crafts = "crafts"
    case meditation = "meditation"

    var label: String {
        switch self {
        case .sport: return "Sport"
        case .reading: return "Lettura"
        case .socializing: return "Socializzare"
        case .nature: return "Natura"
        case .cooking: return "Cucina"
        case .music: return "Musica"
        case .crafts: return "Hobby manuali"
        case .meditation: return "Meditazione"
        }
    }

    var icon: String {
        switch self {
        case .sport: return "sportscourt.fill"
        case .reading: return "book.fill"
        case .socializing: return "person.3.fill"
        case .nature: return "leaf.fill"
        case .cooking: return "fork.knife"
        case .music: return "music.note"
        case .crafts: return "paintbrush.fill"
        case .meditation: return "figure.mind.and.body"
        }
    }
}

// MARK: - Habit Feedback System

struct HabitFeedback {
    let isPositive: Bool
    let message: String
    let healthFact: String
    let icon: String

    static func evaluate(lifestyle: LifestyleProfile) -> [HabitFeedback] {
        var feedbacks: [HabitFeedback] = []

        // Sleep evaluation
        let sleepHours = lifestyle.calculateSleepHours()
        if sleepHours < 6 {
            feedbacks.append(HabitFeedback(
                isPositive: false,
                message: "Dormi solo ~\(sleepHours) ore. Troppo poco!",
                healthFact: "Dormire meno di 7 ore aumenta del 12% il rischio di morte prematura e compromette memoria, concentrazione e sistema immunitario.",
                icon: "exclamationmark.triangle.fill"
            ))
        } else if sleepHours >= 7 && sleepHours <= 9 {
            feedbacks.append(HabitFeedback(
                isPositive: true,
                message: "Ottimo! ~\(sleepHours) ore di sonno sono ideali.",
                healthFact: "7-9 ore di sonno ottimizzano la rigenerazione cellulare, il consolidamento della memoria e l'equilibrio ormonale.",
                icon: "checkmark.circle.fill"
            ))
        } else if sleepHours > 9 {
            feedbacks.append(HabitFeedback(
                isPositive: false,
                message: "Dormi ~\(sleepHours) ore. Potrebbe essere troppo.",
                healthFact: "Dormire piu di 9 ore regolarmente e associato a un aumento del rischio cardiovascolare e a sintomi depressivi.",
                icon: "info.circle.fill"
            ))
        }

        // Bedtime evaluation
        if lifestyle.bedTime >= 1 && lifestyle.bedTime <= 4 {
            feedbacks.append(HabitFeedback(
                isPositive: false,
                message: "Vai a letto molto tardi (ore \(lifestyle.bedTime):00).",
                healthFact: "Andare a dormire dopo mezzanotte altera il ritmo circadiano, riducendo la qualita del sonno REM e aumentando i livelli di cortisolo.",
                icon: "moon.zzz.fill"
            ))
        } else if lifestyle.bedTime >= 22 && lifestyle.bedTime <= 23 {
            feedbacks.append(HabitFeedback(
                isPositive: true,
                message: "Buon orario per andare a dormire!",
                healthFact: "Andare a letto tra le 22 e le 23 sincronizza il ciclo circadiano con la luce naturale, migliorando la qualita del sonno.",
                icon: "checkmark.circle.fill"
            ))
        }

        // Activity level
        switch lifestyle.activityLevel {
        case .sedentary:
            feedbacks.append(HabitFeedback(
                isPositive: false,
                message: "Stile di vita sedentario rilevato.",
                healthFact: "La sedentarieta aumenta del 50% il rischio di depressione e riduce la produzione di BDNF, proteina essenziale per la salute cerebrale.",
                icon: "exclamationmark.triangle.fill"
            ))
        case .active, .veryActive:
            feedbacks.append(HabitFeedback(
                isPositive: true,
                message: "Eccellente livello di attivita fisica!",
                healthFact: "L'esercizio regolare aumenta la neurogenesi, migliora la memoria del 20% e riduce ansia e stress attraverso le endorfine.",
                icon: "star.fill"
            ))
        default:
            break
        }

        // Stress level
        if lifestyle.stressLevel == .veryHigh || lifestyle.stressLevel == .high {
            feedbacks.append(HabitFeedback(
                isPositive: false,
                message: "Livello di stress \(lifestyle.stressLevel.label.lowercased()).",
                healthFact: "Lo stress cronico riduce il volume dell'ippocampo, compromette la memoria e aumenta l'uso compulsivo dello smartphone come meccanismo di coping.",
                icon: "bolt.heart.fill"
            ))
        } else if lifestyle.stressLevel == .veryLow || lifestyle.stressLevel == .low {
            feedbacks.append(HabitFeedback(
                isPositive: true,
                message: "Buon livello di stress, ben gestito!",
                healthFact: "Bassi livelli di stress favoriscono la neuroplasticita e migliorano la capacita decisionale e il controllo degli impulsi.",
                icon: "checkmark.circle.fill"
            ))
        }

        // Night owl + late bedtime combo
        if lifestyle.chronotype == .nightOwl && (lifestyle.bedTime >= 1 && lifestyle.bedTime <= 4) {
            feedbacks.append(HabitFeedback(
                isPositive: false,
                message: "Nottambulo con orario tardivo: attenzione!",
                healthFact: "I nottambuli che dormono dopo le 2 hanno un rischio del 25% maggiore di sviluppare disturbi metabolici e dell'umore.",
                icon: "exclamationmark.triangle.fill"
            ))
        }

        // Digital activities
        if lifestyle.mainDigitalActivities.contains(.socialScrolling) {
            feedbacks.append(HabitFeedback(
                isPositive: false,
                message: "Lo scrolling passivo e la tua attivita principale.",
                healthFact: "Lo scrolling passivo sui social attiva il circuito della dopamina in modo simile al gioco d'azzardo, creando dipendenza e riducendo la soddisfazione nella vita reale.",
                icon: "arrow.up.arrow.down"
            ))
        }
        if lifestyle.mainDigitalActivities.contains(.learning) {
            feedbacks.append(HabitFeedback(
                isPositive: true,
                message: "Usi il digitale per imparare, ottimo!",
                healthFact: "L'apprendimento digitale attivo stimola la corteccia prefrontale e rafforza le connessioni sinaptiche, a differenza del consumo passivo di contenuti.",
                icon: "star.fill"
            ))
        }

        // Free time with real-world activities
        let offlineActivities: [FreeTimePreference] = [.sport, .nature, .reading, .meditation]
        let hasOfflineHobbies = lifestyle.freeTimePreferences.contains(where: { offlineActivities.contains($0) })
        if hasOfflineHobbies {
            feedbacks.append(HabitFeedback(
                isPositive: true,
                message: "Hai hobby offline: un grande vantaggio!",
                healthFact: "Attivita offline come sport, lettura e meditazione riducono il cortisolo, aumentano la serotonina e bilanciano l'effetto della sovraesposizione digitale.",
                icon: "leaf.fill"
            ))
        }

        return feedbacks
    }
}

// MARK: - Warning Thresholds

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
