import SwiftUI

/// Multi-step onboarding wizard for user profiling
/// Provides real-time health feedback on habits (positive and negative)
struct UserProfileSetupView: View {
    @EnvironmentObject var monitor: UsageMonitorViewModel
    @Binding var isPresented: Bool

    @State private var currentStep: Int = 0
    @State private var name: String = ""
    @State private var lifestyle = LifestyleProfile.default
    @State private var feedbacks: [HabitFeedback] = []
    @State private var showFeedback: Bool = false

    private let totalSteps = 6

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress bar
                ProgressView(value: Double(currentStep + 1), total: Double(totalSteps))
                    .tint(.indigo)
                    .padding(.horizontal)
                    .padding(.top, 8)

                Text("Passo \(currentStep + 1) di \(totalSteps)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.top, 4)

                // Step content
                TabView(selection: $currentStep) {
                    step1NameAndAge.tag(0)
                    step2WorkLife.tag(1)
                    step3SleepSchedule.tag(2)
                    step4LifestyleAndStress.tag(3)
                    step5DigitalHabits.tag(4)
                    step6GoalsAndReview.tag(5)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut, value: currentStep)

                // Navigation buttons
                HStack(spacing: 16) {
                    if currentStep > 0 {
                        Button {
                            withAnimation { currentStep -= 1 }
                        } label: {
                            HStack {
                                Image(systemName: "chevron.left")
                                Text("Indietro")
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(.ultraThinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }

                    Button {
                        if currentStep < totalSteps - 1 {
                            withAnimation { currentStep += 1 }
                            updateFeedbacks()
                        } else {
                            saveProfile()
                        }
                    } label: {
                        HStack {
                            Text(currentStep < totalSteps - 1 ? "Avanti" : "Completa Profilo")
                            Image(systemName: currentStep < totalSteps - 1 ? "chevron.right" : "checkmark.circle.fill")
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(.indigo)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                .padding()
            }
            .navigationTitle("Il Tuo Profilo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Salta") {
                        saveProfileSkipped()
                    }
                    .foregroundStyle(.secondary)
                }
            }
        }
    }

    // MARK: - Step 1: Name & Age

    private var step1NameAndAge: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                SectionHeader(
                    icon: "person.crop.circle.fill",
                    title: "Chi sei?",
                    subtitle: "Aiutaci a conoscerti per personalizzare i consigli."
                )

                VStack(alignment: .leading, spacing: 8) {
                    Text("Come ti chiami?")
                        .font(.subheadline.weight(.semibold))
                    TextField("Il tuo nome", text: $name)
                        .textFieldStyle(.roundedBorder)
                        .autocorrectionDisabled()
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Fascia d'eta")
                        .font(.subheadline.weight(.semibold))
                    ForEach(AgeRange.allCases, id: \.self) { age in
                        SelectableRow(
                            title: age.label,
                            isSelected: lifestyle.ageRange == age,
                            action: { lifestyle.ageRange = age }
                        )
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Come ti descrivi?")
                        .font(.subheadline.weight(.semibold))
                    ForEach(PersonalityType.allCases, id: \.self) { type in
                        SelectableIconRow(
                            icon: type.icon,
                            title: type.label,
                            isSelected: lifestyle.personalityType == type,
                            action: { lifestyle.personalityType = type }
                        )
                    }
                }
            }
            .padding()
        }
    }

    // MARK: - Step 2: Work Life

    private var step2WorkLife: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                SectionHeader(
                    icon: "briefcase.fill",
                    title: "La tua vita lavorativa",
                    subtitle: "Il lavoro influenza molto il rapporto con lo schermo."
                )

                VStack(alignment: .leading, spacing: 8) {
                    Text("Occupazione")
                        .font(.subheadline.weight(.semibold))
                    ForEach(Occupation.allCases, id: \.self) { occ in
                        SelectableIconRow(
                            icon: occ.icon,
                            title: occ.label,
                            isSelected: lifestyle.occupation == occ,
                            action: { lifestyle.occupation = occ }
                        )
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Orario di lavoro")
                        .font(.subheadline.weight(.semibold))
                    ForEach(WorkSchedule.allCases, id: \.self) { sched in
                        SelectableRow(
                            title: sched.label,
                            isSelected: lifestyle.workSchedule == sched,
                            action: { lifestyle.workSchedule = sched }
                        )
                    }
                }
            }
            .padding()
        }
    }

    // MARK: - Step 3: Sleep Schedule

    private var step3SleepSchedule: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                SectionHeader(
                    icon: "bed.double.fill",
                    title: "Il tuo sonno",
                    subtitle: "Il sonno e fondamentale per la salute cerebrale e il benessere digitale."
                )

                VStack(alignment: .leading, spacing: 8) {
                    Text("A che ora ti svegli di solito?")
                        .font(.subheadline.weight(.semibold))
                    HStack {
                        Image(systemName: "sunrise.fill")
                            .foregroundStyle(.orange)
                        Stepper("Ore \(lifestyle.wakeUpTime):00",
                                value: $lifestyle.wakeUpTime, in: 4...12)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("A che ora vai a dormire?")
                        .font(.subheadline.weight(.semibold))
                    HStack {
                        Image(systemName: "moon.fill")
                            .foregroundStyle(.indigo)
                        // Allow 20-23 and 0-4 (late night)
                        Picker("Ora", selection: $lifestyle.bedTime) {
                            ForEach([20, 21, 22, 23, 0, 1, 2, 3, 4], id: \.self) { hour in
                                Text("Ore \(hour):00").tag(hour)
                            }
                        }
                        .pickerStyle(.wheel)
                        .frame(height: 120)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Sei un...")
                        .font(.subheadline.weight(.semibold))
                    ForEach(Chronotype.allCases, id: \.self) { chrono in
                        SelectableIconRow(
                            icon: chrono.icon,
                            title: chrono.label,
                            isSelected: lifestyle.chronotype == chrono,
                            action: { lifestyle.chronotype = chrono }
                        )
                    }
                }

                // Real-time sleep feedback
                let sleepHours = lifestyle.calculateSleepHours()
                sleepFeedbackCard(hours: sleepHours)
            }
            .padding()
        }
    }

    // MARK: - Step 4: Lifestyle & Stress

    private var step4LifestyleAndStress: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                SectionHeader(
                    icon: "heart.fill",
                    title: "Il tuo stile di vita",
                    subtitle: "Attivita fisica e stress influenzano l'uso digitale."
                )

                VStack(alignment: .leading, spacing: 8) {
                    Text("Con chi vivi?")
                        .font(.subheadline.weight(.semibold))
                    ForEach(SocialContext.allCases, id: \.self) { ctx in
                        SelectableIconRow(
                            icon: ctx.icon,
                            title: ctx.label,
                            isSelected: lifestyle.socialContext == ctx,
                            action: { lifestyle.socialContext = ctx }
                        )
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Livello di attivita fisica")
                        .font(.subheadline.weight(.semibold))
                    ForEach(ActivityLevel.allCases, id: \.self) { level in
                        SelectableIconRow(
                            icon: level.icon,
                            title: level.label,
                            isSelected: lifestyle.activityLevel == level,
                            action: { lifestyle.activityLevel = level }
                        )
                    }
                }

                // Inline activity feedback
                activityFeedbackCard

                VStack(alignment: .leading, spacing: 8) {
                    Text("Livello di stress attuale")
                        .font(.subheadline.weight(.semibold))
                    ForEach(StressLevel.allCases, id: \.self) { level in
                        SelectableRow(
                            title: level.label,
                            isSelected: lifestyle.stressLevel == level,
                            action: { lifestyle.stressLevel = level }
                        )
                    }
                }

                // Inline stress feedback
                stressFeedbackCard

                VStack(alignment: .leading, spacing: 8) {
                    Text("Cosa fai nel tempo libero?")
                        .font(.subheadline.weight(.semibold))
                    Text("Seleziona tutte le attivita che pratichi")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        ForEach(FreeTimePreference.allCases, id: \.self) { pref in
                            MultiSelectChip(
                                icon: pref.icon,
                                title: pref.label,
                                isSelected: lifestyle.freeTimePreferences.contains(pref),
                                action: {
                                    if lifestyle.freeTimePreferences.contains(pref) {
                                        lifestyle.freeTimePreferences.removeAll { $0 == pref }
                                    } else {
                                        lifestyle.freeTimePreferences.append(pref)
                                    }
                                }
                            )
                        }
                    }
                }
            }
            .padding()
        }
    }

    // MARK: - Step 5: Digital Habits

    private var step5DigitalHabits: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                SectionHeader(
                    icon: "iphone",
                    title: "Le tue abitudini digitali",
                    subtitle: "Capire come usi il telefono ci aiuta a darti consigli mirati."
                )

                VStack(alignment: .leading, spacing: 8) {
                    Text("Cosa fai principalmente sullo smartphone?")
                        .font(.subheadline.weight(.semibold))
                    Text("Seleziona le attivita principali")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        ForEach(DigitalActivity.allCases, id: \.self) { activity in
                            MultiSelectChip(
                                icon: activity.icon,
                                title: activity.label,
                                isSelected: lifestyle.mainDigitalActivities.contains(activity),
                                action: {
                                    if lifestyle.mainDigitalActivities.contains(activity) {
                                        lifestyle.mainDigitalActivities.removeAll { $0 == activity }
                                    } else {
                                        lifestyle.mainDigitalActivities.append(activity)
                                    }
                                }
                            )
                        }
                    }
                }

                // Digital habits feedback
                digitalHabitsFeedbackCard
            }
            .padding()
        }
    }

    // MARK: - Step 6: Goals & Review

    private var step6GoalsAndReview: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                SectionHeader(
                    icon: "target",
                    title: "I tuoi obiettivi",
                    subtitle: "Cosa vorresti migliorare? Questi obiettivi guidano l'analisi AI."
                )

                VStack(alignment: .leading, spacing: 8) {
                    Text("Seleziona i tuoi obiettivi")
                        .font(.subheadline.weight(.semibold))
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        ForEach(WellnessGoal.allCases, id: \.self) { goal in
                            MultiSelectChip(
                                icon: goal.icon,
                                title: goal.label,
                                isSelected: lifestyle.primaryGoals.contains(goal),
                                action: {
                                    if lifestyle.primaryGoals.contains(goal) {
                                        lifestyle.primaryGoals.removeAll { $0 == goal }
                                    } else {
                                        lifestyle.primaryGoals.append(goal)
                                    }
                                }
                            )
                        }
                    }
                }

                // Final feedback summary
                Divider()

                VStack(alignment: .leading, spacing: 12) {
                    Text("Analisi del tuo profilo")
                        .font(.headline)

                    let allFeedbacks = HabitFeedback.evaluate(lifestyle: lifestyle)
                    let positives = allFeedbacks.filter(\.isPositive)
                    let negatives = allFeedbacks.filter { !$0.isPositive }

                    if !positives.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Punti di forza")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.green)
                            ForEach(Array(positives.enumerated()), id: \.offset) { _, fb in
                                FeedbackCard(feedback: fb)
                            }
                        }
                    }

                    if !negatives.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Aree di miglioramento")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.orange)
                            ForEach(Array(negatives.enumerated()), id: \.offset) { _, fb in
                                FeedbackCard(feedback: fb)
                            }
                        }
                    }
                }
            }
            .padding()
        }
    }

    // MARK: - Inline Feedback Cards

    private func sleepFeedbackCard(hours: Int) -> some View {
        Group {
            if hours < 6 {
                InlineFeedback(
                    isPositive: false,
                    message: "~\(hours) ore di sonno sono poche!",
                    detail: "Dormire meno di 7 ore compromette memoria e concentrazione. Prova ad anticipare l'orario."
                )
            } else if hours >= 7 && hours <= 9 {
                InlineFeedback(
                    isPositive: true,
                    message: "~\(hours) ore di sonno: perfetto!",
                    detail: "7-9 ore ottimizzano rigenerazione cellulare e memoria."
                )
            } else if hours > 9 {
                InlineFeedback(
                    isPositive: false,
                    message: "~\(hours) ore potrebbero essere troppe.",
                    detail: "Dormire piu di 9 ore e associato a rischio cardiovascolare."
                )
            }
        }
    }

    private var activityFeedbackCard: some View {
        Group {
            switch lifestyle.activityLevel {
            case .sedentary:
                InlineFeedback(
                    isPositive: false,
                    message: "Sedentarieta: rischio salute",
                    detail: "Aumenta del 50% il rischio depressione. Anche 20 minuti di camminata al giorno fanno la differenza!"
                )
            case .active, .veryActive:
                InlineFeedback(
                    isPositive: true,
                    message: "Ottima attivita fisica!",
                    detail: "L'esercizio aumenta la neurogenesi e migliora la memoria del 20%."
                )
            default:
                EmptyView()
            }
        }
    }

    private var stressFeedbackCard: some View {
        Group {
            if lifestyle.stressLevel == .high || lifestyle.stressLevel == .veryHigh {
                InlineFeedback(
                    isPositive: false,
                    message: "Stress alto: attenzione allo smartphone",
                    detail: "Lo stress cronico aumenta l'uso compulsivo del telefono come meccanismo di coping. Terminus ti aiutera a monitorare questo pattern."
                )
            } else if lifestyle.stressLevel == .low || lifestyle.stressLevel == .veryLow {
                InlineFeedback(
                    isPositive: true,
                    message: "Stress sotto controllo!",
                    detail: "Bassi livelli di stress migliorano il controllo degli impulsi digitali."
                )
            }
        }
    }

    private var digitalHabitsFeedbackCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            if lifestyle.mainDigitalActivities.contains(.socialScrolling) {
                InlineFeedback(
                    isPositive: false,
                    message: "Scrolling passivo rilevato",
                    detail: "Attiva il circuito della dopamina come il gioco d'azzardo. Terminus ti aiutera a ridurlo gradualmente."
                )
            }
            if lifestyle.mainDigitalActivities.contains(.learning) {
                InlineFeedback(
                    isPositive: true,
                    message: "Usi il telefono per imparare!",
                    detail: "L'apprendimento attivo stimola la corteccia prefrontale, a differenza del consumo passivo."
                )
            }
            if lifestyle.mainDigitalActivities.contains(.gaming) {
                InlineFeedback(
                    isPositive: false,
                    message: "Gaming: gestisci il tempo",
                    detail: "Il gaming puo essere positivo in dosi moderate, ma sessioni lunghe riducono la dopamina basale e la motivazione."
                )
            }
        }
    }

    // MARK: - Actions

    private func updateFeedbacks() {
        feedbacks = HabitFeedback.evaluate(lifestyle: lifestyle)
    }

    private func saveProfile() {
        var profile = UsageDataStore.shared.userProfile
        profile.name = name
        profile.lifestyle = lifestyle
        profile.isProfileCompleted = true
        profile.lastUpdated = Date()
        UsageDataStore.shared.updateProfile(profile)
        isPresented = false
    }

    private func saveProfileSkipped() {
        var profile = UsageDataStore.shared.userProfile
        profile.isProfileCompleted = true
        profile.lastUpdated = Date()
        UsageDataStore.shared.updateProfile(profile)
        isPresented = false
    }
}

// MARK: - Reusable Components

struct SectionHeader: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(.indigo)
                Text(title)
                    .font(.title2.bold())
            }
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

struct SelectableRow: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Text(title)
                    .foregroundStyle(isSelected ? .white : .primary)
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark")
                        .foregroundStyle(.white)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(isSelected ? Color.indigo : Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}

struct SelectableIconRow: View {
    let icon: String
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .frame(width: 24)
                    .foregroundStyle(isSelected ? .white : .indigo)
                Text(title)
                    .foregroundStyle(isSelected ? .white : .primary)
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark")
                        .foregroundStyle(.white)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(isSelected ? Color.indigo : Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}

struct MultiSelectChip: View {
    let icon: String
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                Text(title)
                    .font(.caption)
                    .lineLimit(1)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity)
            .background(isSelected ? Color.indigo : Color(.systemGray6))
            .foregroundStyle(isSelected ? .white : .primary)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}

struct InlineFeedback: View {
    let isPositive: Bool
    let message: String
    let detail: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: isPositive ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                .foregroundStyle(isPositive ? .green : .orange)
                .font(.title3)
            VStack(alignment: .leading, spacing: 4) {
                Text(message)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(isPositive ? .green : .orange)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isPositive ? Color.green.opacity(0.08) : Color.orange.opacity(0.08))
        )
    }
}

struct FeedbackCard: View {
    let feedback: HabitFeedback

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: feedback.icon)
                .foregroundStyle(feedback.isPositive ? .green : .orange)
            VStack(alignment: .leading, spacing: 4) {
                Text(feedback.message)
                    .font(.subheadline.weight(.medium))
                Text(feedback.healthFact)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(feedback.isPositive ? Color.green.opacity(0.08) : Color.orange.opacity(0.08))
        )
    }
}
