import SwiftUI

/// Main dashboard showing today's usage overview and wellness score
struct DashboardView: View {
    @EnvironmentObject var monitor: UsageMonitorViewModel
    @EnvironmentObject var appState: AppState
    @State private var showAnalysis = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Wellness Score Card
                    wellnessScoreCard

                    // Today's Screen Time
                    screenTimeCard

                    // GSD Phase Indicator
                    gsdPhaseCard

                    // Category Breakdown
                    categoryBreakdownCard

                    // Quick Warnings
                    if !monitor.currentWarnings.isEmpty {
                        warningsCard
                    }

                    // AI Quick Tip
                    if !monitor.aiAdvice.isEmpty {
                        aiAdviceCard
                    }

                    // Analyze Button
                    analyzeButton
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Terminus")
            .refreshable {
                await monitor.runAnalysis()
            }
        }
    }

    // MARK: - Wellness Score

    private var wellnessScoreCard: some View {
        VStack(spacing: 12) {
            Text("Benessere Digitale")
                .font(.headline)
                .foregroundStyle(.secondary)

            ZStack {
                Circle()
                    .stroke(Color.gray.opacity(0.2), lineWidth: 12)
                    .frame(width: 140, height: 140)

                Circle()
                    .trim(from: 0, to: Double(monitor.wellnessScore) / 100)
                    .stroke(
                        wellnessGradient,
                        style: StrokeStyle(lineWidth: 12, lineCap: .round)
                    )
                    .frame(width: 140, height: 140)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 1), value: monitor.wellnessScore)

                VStack(spacing: 4) {
                    Text("\(monitor.wellnessScore)")
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                        .foregroundStyle(wellnessColor)
                    Text("/ 100")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Text(wellnessMessage)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Screen Time Card

    private var screenTimeCard: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Tempo Schermo Oggi")
                        .font(.headline)
                    Text(formatMinutes(monitor.todayTotalMinutes))
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(monitor.isOverGoal ? .red : .primary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("Obiettivo")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(formatMinutes(monitor.dailyGoalMinutes))
                        .font(.title3.bold())
                        .foregroundStyle(.indigo)
                }
            }

            // Progress Bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.gray.opacity(0.15))
                        .frame(height: 12)

                    RoundedRectangle(cornerRadius: 6)
                        .fill(progressGradient)
                        .frame(
                            width: min(geometry.size.width * monitor.goalProgress, geometry.size.width),
                            height: 12
                        )
                        .animation(.easeInOut(duration: 0.8), value: monitor.goalProgress)
                }
            }
            .frame(height: 12)

            Text(monitor.goalStatus)
                .font(.caption)
                .foregroundStyle(monitor.isOverGoal ? .red : .green)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - GSD Phase Card

    private var gsdPhaseCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Metodo GSD")
                .font(.headline)

            HStack(spacing: 4) {
                ForEach(AppState.GSDPhase.allCases, id: \.self) { phase in
                    VStack(spacing: 4) {
                        Image(systemName: phase.icon)
                            .font(.system(size: 16))
                            .foregroundStyle(
                                phase == appState.currentGSDPhase ? .white : .secondary
                            )
                            .frame(width: 32, height: 32)
                            .background(
                                phase == appState.currentGSDPhase ?
                                Color.indigo : Color.gray.opacity(0.15)
                            )
                            .clipShape(Circle())

                        Text(phase.rawValue)
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(
                                phase == appState.currentGSDPhase ? .indigo : .secondary
                            )
                    }
                    .frame(maxWidth: .infinity)
                }
            }

            Text(appState.currentGSDPhase.description)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Category Breakdown

    private var categoryBreakdownCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Per Categoria")
                .font(.headline)

            ForEach(monitor.categoryBreakdown.prefix(5)) { usage in
                HStack(spacing: 12) {
                    Image(systemName: usage.category.icon)
                        .font(.system(size: 14))
                        .foregroundStyle(.white)
                        .frame(width: 28, height: 28)
                        .background(categoryColor(usage.category))
                        .clipShape(RoundedRectangle(cornerRadius: 6))

                    VStack(alignment: .leading, spacing: 2) {
                        Text(usage.category.rawValue)
                            .font(.subheadline.weight(.medium))
                        Text("\(usage.totalMinutes) min")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Text(String(format: "%.0f%%", usage.percentage))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }

            if monitor.categoryBreakdown.isEmpty {
                Text("Nessun dato disponibile")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 8)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Warnings Card

    private var warningsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Avvisi")
                .font(.headline)

            ForEach(monitor.currentWarnings.prefix(3)) { warning in
                HStack(spacing: 10) {
                    Image(systemName: warning.severity.icon)
                        .foregroundStyle(warningColor(warning.severity))
                        .font(.title3)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(warning.title)
                            .font(.subheadline.weight(.medium))
                        Text(warning.message)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - AI Advice Card

    private var aiAdviceCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(.indigo)
                Text("Consiglio AI")
                    .font(.headline)
            }

            Text(monitor.aiAdvice)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(4)
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

    // MARK: - Analyze Button

    private var analyzeButton: some View {
        Button {
            Task { await monitor.runAnalysis() }
        } label: {
            HStack(spacing: 8) {
                if monitor.isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "brain.head.profile")
                }
                Text(monitor.isLoading ? "Analisi in corso..." : "Analizza con AI")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.indigo)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .disabled(monitor.isLoading)
    }

    // MARK: - Helpers

    private func formatMinutes(_ minutes: Int) -> String {
        let h = minutes / 60
        let m = minutes % 60
        if h > 0 {
            return "\(h)h \(m)m"
        }
        return "\(m)m"
    }

    private var wellnessGradient: LinearGradient {
        let score = monitor.wellnessScore
        if score >= 70 {
            return LinearGradient(colors: [.green, .mint], startPoint: .leading, endPoint: .trailing)
        } else if score >= 40 {
            return LinearGradient(colors: [.yellow, .orange], startPoint: .leading, endPoint: .trailing)
        } else {
            return LinearGradient(colors: [.orange, .red], startPoint: .leading, endPoint: .trailing)
        }
    }

    private var wellnessColor: Color {
        let score = monitor.wellnessScore
        if score >= 70 { return .green }
        else if score >= 40 { return .orange }
        else { return .red }
    }

    private var progressGradient: LinearGradient {
        if monitor.isOverGoal {
            return LinearGradient(colors: [.orange, .red], startPoint: .leading, endPoint: .trailing)
        }
        return LinearGradient(colors: [.indigo, .purple], startPoint: .leading, endPoint: .trailing)
    }

    private var wellnessMessage: String {
        let score = monitor.wellnessScore
        if score >= 80 { return "Ottimo equilibrio digitale oggi!" }
        else if score >= 60 { return "Buono, ma puoi migliorare" }
        else if score >= 40 { return "Attenzione al tempo schermo" }
        else { return "Il tuo benessere digitale necessita attenzione" }
    }

    private func categoryColor(_ category: AppCategory) -> Color {
        switch category {
        case .socialMedia: return .red
        case .entertainment: return .orange
        case .gaming: return .purple
        case .communication: return .green
        case .productivity: return .teal
        case .education: return .indigo
        case .news: return .blue
        case .health: return .pink
        case .utilities: return .gray
        case .other: return .secondary
        }
    }

    private func warningColor(_ severity: WarningSeverity) -> Color {
        switch severity {
        case .info: return .blue
        case .caution: return .yellow
        case .warning: return .orange
        case .critical: return .red
        }
    }
}
