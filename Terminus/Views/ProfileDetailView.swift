import SwiftUI

/// Detailed view showing the user's full lifestyle profile with feedback
struct ProfileDetailView: View {
    let profile: UserProfile
    @State private var showEditSheet: Bool = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                profileHeader

                // Lifestyle cards
                personalInfoCard
                workCard
                sleepCard
                lifestyleCard
                digitalHabitsCard
                goalsCard

                // Health feedback
                feedbackSection
            }
            .padding()
        }
        .navigationTitle("Il Tuo Profilo")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showEditSheet = true
                } label: {
                    Image(systemName: "pencil.circle")
                }
            }
        }
        .sheet(isPresented: $showEditSheet) {
            UserProfileSetupView(isPresented: $showEditSheet)
        }
    }

    // MARK: - Header

    private var profileHeader: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.crop.circle.fill")
                .font(.system(size: 60))
                .foregroundStyle(.indigo)

            Text(profile.name.isEmpty ? "Utente" : profile.name)
                .font(.title2.bold())

            HStack(spacing: 12) {
                ProfileTag(icon: profile.lifestyle.occupation.icon, text: profile.lifestyle.occupation.label)
                ProfileTag(icon: "calendar", text: profile.lifestyle.ageRange.label)
            }

            Text("Profilo aggiornato: \(profile.lastUpdated.formatted(date: .abbreviated, time: .shortened))")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.indigo.opacity(0.06))
        )
    }

    // MARK: - Personal Info Card

    private var personalInfoCard: some View {
        ProfileCard(title: "Personalita", icon: "brain.head.profile") {
            ProfileRow(label: "Eta", value: profile.lifestyle.ageRange.label, icon: "calendar")
            ProfileRow(label: "Tipo", value: profile.lifestyle.personalityType.label, icon: profile.lifestyle.personalityType.icon)
            ProfileRow(label: "Contesto", value: profile.lifestyle.socialContext.label, icon: profile.lifestyle.socialContext.icon)
        }
    }

    // MARK: - Work Card

    private var workCard: some View {
        ProfileCard(title: "Lavoro", icon: "briefcase.fill") {
            ProfileRow(label: "Occupazione", value: profile.lifestyle.occupation.label, icon: profile.lifestyle.occupation.icon)
            ProfileRow(label: "Orario", value: profile.lifestyle.workSchedule.label, icon: "clock")
        }
    }

    // MARK: - Sleep Card

    private var sleepCard: some View {
        ProfileCard(title: "Sonno", icon: "bed.double.fill") {
            ProfileRow(label: "Sveglia", value: "Ore \(profile.lifestyle.wakeUpTime):00", icon: "sunrise.fill")
            ProfileRow(label: "A letto", value: "Ore \(profile.lifestyle.bedTime):00", icon: "moon.fill")
            ProfileRow(label: "Durata", value: "~\(profile.lifestyle.calculateSleepHours())h", icon: "clock.fill")
            ProfileRow(label: "Cronotipo", value: profile.lifestyle.chronotype.label, icon: profile.lifestyle.chronotype.icon)
        }
    }

    // MARK: - Lifestyle Card

    private var lifestyleCard: some View {
        ProfileCard(title: "Stile di Vita", icon: "heart.fill") {
            ProfileRow(label: "Attivita fisica", value: profile.lifestyle.activityLevel.label, icon: profile.lifestyle.activityLevel.icon)
            ProfileRow(label: "Stress", value: profile.lifestyle.stressLevel.label, icon: "bolt.heart.fill")

            if !profile.lifestyle.freeTimePreferences.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Tempo libero")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    FlowLayout(spacing: 6) {
                        ForEach(profile.lifestyle.freeTimePreferences, id: \.self) { pref in
                            HStack(spacing: 4) {
                                Image(systemName: pref.icon)
                                    .font(.caption2)
                                Text(pref.label)
                                    .font(.caption2)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.indigo.opacity(0.1))
                            .clipShape(Capsule())
                        }
                    }
                }
                .padding(.top, 4)
            }
        }
    }

    // MARK: - Digital Habits Card

    private var digitalHabitsCard: some View {
        ProfileCard(title: "Abitudini Digitali", icon: "iphone") {
            if profile.lifestyle.mainDigitalActivities.isEmpty {
                Text("Nessuna attivita selezionata")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                FlowLayout(spacing: 6) {
                    ForEach(profile.lifestyle.mainDigitalActivities, id: \.self) { activity in
                        HStack(spacing: 4) {
                            Image(systemName: activity.icon)
                                .font(.caption2)
                            Text(activity.label)
                                .font(.caption2)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.purple.opacity(0.1))
                        .clipShape(Capsule())
                    }
                }
            }
        }
    }

    // MARK: - Goals Card

    private var goalsCard: some View {
        ProfileCard(title: "Obiettivi", icon: "target") {
            if profile.lifestyle.primaryGoals.isEmpty {
                Text("Nessun obiettivo selezionato")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(profile.lifestyle.primaryGoals, id: \.self) { goal in
                    HStack(spacing: 8) {
                        Image(systemName: goal.icon)
                            .foregroundStyle(.indigo)
                            .frame(width: 20)
                        Text(goal.label)
                            .font(.subheadline)
                    }
                }
            }
        }
    }

    // MARK: - Feedback Section

    private var feedbackSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "stethoscope")
                    .foregroundStyle(.indigo)
                Text("Valutazione Abitudini")
                    .font(.headline)
            }

            let feedbacks = HabitFeedback.evaluate(lifestyle: profile.lifestyle)
            let positives = feedbacks.filter(\.isPositive)
            let negatives = feedbacks.filter { !$0.isPositive }

            if !positives.isEmpty {
                Text("Punti di forza")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.green)
                ForEach(Array(positives.enumerated()), id: \.offset) { _, fb in
                    FeedbackCard(feedback: fb)
                }
            }

            if !negatives.isEmpty {
                Text("Aree di miglioramento")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.orange)
                    .padding(.top, positives.isEmpty ? 0 : 8)
                ForEach(Array(negatives.enumerated()), id: \.offset) { _, fb in
                    FeedbackCard(feedback: fb)
                }
            }

            if feedbacks.isEmpty {
                Text("Completa il profilo per ricevere una valutazione delle tue abitudini.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemGray6))
        )
    }
}

// MARK: - Profile Card Container

struct ProfileCard<Content: View>: View {
    let title: String
    let icon: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .foregroundStyle(.indigo)
                Text(title)
                    .font(.subheadline.weight(.bold))
            }

            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color(.systemGray6))
        )
    }
}

// MARK: - Profile Row

struct ProfileRow: View {
    let label: String
    let value: String
    let icon: String

    var body: some View {
        HStack {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(width: 16)
                Text(label)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(value)
                .font(.subheadline.weight(.medium))
        }
    }
}

// MARK: - Flow Layout for tags

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, subview) in subviews.enumerated() {
            if index < result.positions.count {
                subview.place(at: CGPoint(
                    x: bounds.minX + result.positions[index].x,
                    y: bounds.minY + result.positions[index].y
                ), proposal: .unspecified)
            }
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (positions: [CGPoint], size: CGSize) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth && currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            positions.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
            maxX = max(maxX, currentX)
        }

        return (positions, CGSize(width: maxX, height: currentY + lineHeight))
    }
}
