import SwiftUI

/// Detailed view of a single wellness report
struct ReportDetailView: View {
    let report: WellnessReport
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    headerSection

                    // Scores
                    scoresSection

                    // Category Breakdown
                    categorySection

                    // Warnings
                    if !report.warnings.isEmpty {
                        warningsSection
                    }

                    // AI Advice
                    adviceSection

                    // Ralph Loop Insights
                    ralphLoopSection
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Dettaglio Report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Chiudi") { dismiss() }
                }
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 8) {
            Text(report.wellnessLevel.emoji)
                .font(.system(size: 48))

            Text(report.date, style: .date)
                .font(.headline)

            Text("Punteggio Benessere: \(report.overallWellnessScore)/100")
                .font(.title2.bold())
                .foregroundStyle(scoreColor)

            Text(report.wellnessLevel.rawValue)
                .font(.subheadline)
                .padding(.horizontal, 12)
                .padding(.vertical, 4)
                .background(scoreColor.opacity(0.15))
                .foregroundStyle(scoreColor)
                .clipShape(Capsule())
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Scores

    private var scoresSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Punteggi Dettagliati")
                .font(.headline)

            HStack(spacing: 16) {
                ScoreCircle(
                    label: "Umore",
                    score: 100 - report.moodImpactScore,
                    color: .pink
                )
                ScoreCircle(
                    label: "Cervello",
                    score: 100 - report.brainHealthScore,
                    color: .purple
                )
                ScoreCircle(
                    label: "Produttività",
                    score: report.productivityScore,
                    color: .teal
                )
            }
            .frame(maxWidth: .infinity)

            HStack {
                Image(systemName: "clock")
                    .foregroundStyle(.indigo)
                Text("Tempo totale: \(report.totalScreenTimeFormatted)")
                    .font(.subheadline)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Categories

    private var categorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Utilizzo per Categoria")
                .font(.headline)

            ForEach(report.categoryBreakdown) { usage in
                HStack {
                    Image(systemName: usage.category.icon)
                        .frame(width: 24)
                    Text(usage.category.rawValue)
                        .font(.subheadline)
                    Spacer()
                    Text("\(usage.totalMinutes)min")
                        .font(.subheadline.weight(.semibold))
                    Text(String(format: "(%.0f%%)", usage.percentage))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Warnings

    private var warningsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Avvisi")
                .font(.headline)

            ForEach(report.warnings) { warning in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Image(systemName: warning.severity.icon)
                            .foregroundStyle(warningColor(warning.severity))
                        Text(warning.title)
                            .font(.subheadline.weight(.medium))
                    }
                    Text(warning.message)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    HStack(spacing: 4) {
                        Image(systemName: "lightbulb")
                            .font(.caption2)
                        Text(warning.recommendation)
                            .font(.caption)
                    }
                    .foregroundStyle(.indigo)
                    .padding(8)
                    .background(Color.indigo.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .padding(.vertical, 4)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - AI Advice

    private var adviceSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(.indigo)
                Text("Consiglio AI")
                    .font(.headline)
            }
            Text(report.aiAdvice)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(
            LinearGradient(
                colors: [.indigo.opacity(0.05), .purple.opacity(0.05)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Ralph Loop

    private var ralphLoopSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .foregroundStyle(.indigo)
                Text("Ralph Loop - Ciclo di Miglioramento")
                    .font(.headline)
            }

            let insight = report.ralphLoopInsights

            RalphDetailRow(phase: "Review", text: insight.reviewSummary, icon: "eye")
            RalphDetailRow(phase: "Analyze", text: insight.analysisFindings, icon: "magnifyingglass")
            RalphDetailRow(phase: "Learn", text: insight.learnings, icon: "lightbulb")
            RalphDetailRow(phase: "Plan", text: insight.actionPlan, icon: "list.bullet.clipboard")
            RalphDetailRow(phase: "Habituate", text: insight.habitSuggestion, icon: "repeat")
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Helpers

    private var scoreColor: Color {
        let score = report.overallWellnessScore
        if score >= 70 { return .green }
        else if score >= 40 { return .orange }
        return .red
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

// MARK: - Score Circle

struct ScoreCircle: View {
    let label: String
    let score: Int
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .stroke(color.opacity(0.2), lineWidth: 6)
                    .frame(width: 60, height: 60)

                Circle()
                    .trim(from: 0, to: Double(score) / 100)
                    .stroke(color, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .frame(width: 60, height: 60)
                    .rotationEffect(.degrees(-90))

                Text("\(score)")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
            }

            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Ralph Detail Row

struct RalphDetailRow: View {
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
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.indigo)
            }
            Text(text)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.indigo.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
