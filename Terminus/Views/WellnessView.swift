import SwiftUI

/// View dedicated to wellness insights, Ralph Loop, and brain health info
struct WellnessView: View {
    @EnvironmentObject var monitor: UsageMonitorViewModel
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Health Impact Scores
                    impactScoresCard

                    // Ralph Loop Progress
                    ralphLoopCard

                    // Brain Health Facts
                    brainHealthCard

                    // Ralph Loop Insights (from AI)
                    if let insight = monitor.ralphInsight {
                        ralphInsightsCard(insight)
                    }

                    // Mood & Effects Info
                    moodEffectsCard
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Benessere")
        }
    }

    // MARK: - Impact Scores

    private var impactScoresCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Impatto sulla Salute")
                .font(.headline)

            if let report = monitor.latestReport {
                ImpactGauge(
                    title: "Impatto sull'Umore",
                    score: report.moodImpactScore,
                    icon: "face.smiling",
                    description: "Come il tempo schermo influenza il tuo stato emotivo"
                )

                ImpactGauge(
                    title: "Impatto sul Cervello",
                    score: report.brainHealthScore,
                    icon: "brain",
                    description: "Effetti su attenzione, memoria e funzioni cognitive"
                )

                ImpactGauge(
                    title: "Produttività",
                    score: 100 - report.productivityScore,
                    icon: "bolt.fill",
                    description: "Quanto il telefono sta riducendo la tua produttività"
                )
            } else {
                Text("Esegui un'analisi dalla Dashboard per vedere i punteggi di impatto")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Ralph Loop

    private var ralphLoopCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .foregroundStyle(.indigo)
                Text("Ralph Loop")
                    .font(.headline)
            }

            Text("Ciclo di miglioramento continuo")
                .font(.caption)
                .foregroundStyle(.secondary)

            VStack(spacing: 8) {
                ForEach(AppState.RalphLoopPhase.allCases, id: \.self) { phase in
                    HStack(spacing: 12) {
                        Circle()
                            .fill(phase == appState.currentRalphPhase ? Color.indigo : Color.gray.opacity(0.3))
                            .frame(width: 10, height: 10)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(phase.rawValue)
                                .font(.subheadline.weight(
                                    phase == appState.currentRalphPhase ? .semibold : .regular
                                ))
                                .foregroundStyle(
                                    phase == appState.currentRalphPhase ? .primary : .secondary
                                )
                            Text(phase.description)
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }

                        Spacer()

                        if phase == appState.currentRalphPhase {
                            Image(systemName: "arrow.right.circle.fill")
                                .foregroundStyle(.indigo)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Brain Health

    private var brainHealthCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "brain.head.profile")
                    .foregroundStyle(.purple)
                Text("Salute del Cervello")
                    .font(.headline)
            }

            VStack(alignment: .leading, spacing: 10) {
                BrainFactRow(
                    icon: "exclamationmark.triangle",
                    title: "Dopamina",
                    description: "L'uso eccessivo dei social media causa picchi di dopamina " +
                        "che nel tempo riducono la sensibilità ai piaceri naturali.",
                    color: .orange
                )

                BrainFactRow(
                    icon: "moon.fill",
                    title: "Qualità del Sonno",
                    description: "La luce blu degli schermi sopprime la melatonina, " +
                        "rendendo più difficile addormentarsi e riducendo la qualità del sonno.",
                    color: .blue
                )

                BrainFactRow(
                    icon: "eye",
                    title: "Attenzione",
                    description: "Il multitasking digitale riduce la capacità di concentrazione " +
                        "prolungata fino al 40% secondo studi recenti.",
                    color: .red
                )

                BrainFactRow(
                    icon: "heart.fill",
                    title: "Stato Emotivo",
                    description: "Il confronto sociale sui social media è correlato ad " +
                        "aumento di ansia e sintomi depressivi, specialmente nei giovani.",
                    color: .pink
                )

                BrainFactRow(
                    icon: "memorychip",
                    title: "Memoria",
                    description: "Lo scrolling passivo riduce la capacità di formazione " +
                        "della memoria a lungo termine e del pensiero critico.",
                    color: .purple
                )
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Ralph Loop AI Insights

    private func ralphInsightsCard(_ insight: RalphLoopInsight) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(.indigo)
                Text("Insight AI - Ralph Loop")
                    .font(.headline)
            }

            InsightSection(phase: "Review", text: insight.reviewSummary, icon: "eye")
            InsightSection(phase: "Analyze", text: insight.analysisFindings, icon: "magnifyingglass")
            InsightSection(phase: "Learn", text: insight.learnings, icon: "lightbulb")
            InsightSection(phase: "Plan", text: insight.actionPlan, icon: "list.bullet.clipboard")
            InsightSection(phase: "Habituate", text: insight.habitSuggestion, icon: "repeat")
        }
        .padding()
        .background(
            LinearGradient(
                colors: [Color.indigo.opacity(0.05), Color.purple.opacity(0.05)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.indigo.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Mood Effects

    private var moodEffectsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "face.smiling")
                    .foregroundStyle(.yellow)
                Text("Effetti sull'Umore")
                    .font(.headline)
            }

            VStack(alignment: .leading, spacing: 8) {
                MoodEffect(
                    time: "< 1 ora",
                    effect: "Effetto minimo, umore generalmente stabile",
                    level: .low
                )
                MoodEffect(
                    time: "1-2 ore",
                    effect: "Possibile lieve riduzione della motivazione",
                    level: .medium
                )
                MoodEffect(
                    time: "2-4 ore",
                    effect: "Aumento irritabilità, riduzione energia",
                    level: .high
                )
                MoodEffect(
                    time: "> 4 ore",
                    effect: "Rischio significativo per umore e benessere mentale",
                    level: .critical
                )
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }
}

// MARK: - Subviews

struct ImpactGauge: View {
    let title: String
    let score: Int
    let icon: String
    let description: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(impactColor)
                Text(title)
                    .font(.subheadline.weight(.medium))
                Spacer()
                Text("\(score)/100")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(impactColor)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.15))
                    RoundedRectangle(cornerRadius: 4)
                        .fill(impactGradient)
                        .frame(width: geo.size.width * Double(score) / 100)
                }
            }
            .frame(height: 8)

            Text(description)
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }

    private var impactColor: Color {
        if score < 30 { return .green }
        else if score < 60 { return .orange }
        return .red
    }

    private var impactGradient: LinearGradient {
        if score < 30 {
            return LinearGradient(colors: [.green, .mint], startPoint: .leading, endPoint: .trailing)
        } else if score < 60 {
            return LinearGradient(colors: [.yellow, .orange], startPoint: .leading, endPoint: .trailing)
        }
        return LinearGradient(colors: [.orange, .red], startPoint: .leading, endPoint: .trailing)
    }
}

struct BrainFactRow: View {
    let icon: String
    let title: String
    let description: String
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .foregroundStyle(color)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

struct InsightSection: View {
    let phase: String
    let text: String
    let icon: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(.indigo)
                Text(phase)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.indigo)
            }
            Text(text)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

struct MoodEffect: View {
    let time: String
    let effect: String
    let level: RiskLevel

    var body: some View {
        HStack(spacing: 10) {
            Text(time)
                .font(.caption.weight(.bold))
                .frame(width: 60, alignment: .leading)
                .foregroundStyle(levelColor)

            Text(effect)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var levelColor: Color {
        switch level {
        case .low: return .green
        case .medium: return .orange
        case .high: return .red
        }
    }
}
