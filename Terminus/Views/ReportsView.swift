import SwiftUI

/// View showing historical reports and trends
struct ReportsView: View {
    @EnvironmentObject var monitor: UsageMonitorViewModel

    @State private var selectedPeriod: Period = .week
    @State private var selectedReport: WellnessReport?

    enum Period: String, CaseIterable {
        case week = "Settimana"
        case month = "Mese"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Period Selector
                    Picker("Periodo", selection: $selectedPeriod) {
                        ForEach(Period.allCases, id: \.self) { period in
                            Text(period.rawValue).tag(period)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    // Weekly Trend Chart
                    trendCard

                    // Stats Summary
                    statsGrid

                    // Report History
                    reportHistoryCard
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Report")
        }
    }

    // MARK: - Trend Chart

    private var trendCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Andamento Settimanale")
                    .font(.headline)
                Spacer()
                Text(monitor.weeklyTrend)
                    .font(.caption.weight(.medium))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(trendColor.opacity(0.15))
                    .foregroundStyle(trendColor)
                    .clipShape(Capsule())
            }

            // Simple bar chart
            HStack(alignment: .bottom, spacing: 8) {
                ForEach(weekData, id: \.day) { item in
                    VStack(spacing: 4) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(barColor(minutes: item.minutes))
                            .frame(
                                width: 30,
                                height: max(CGFloat(item.minutes) / 4, 8)
                            )
                            .animation(.easeInOut, value: item.minutes)

                        Text("\(item.minutes)")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(.secondary)

                        Text(item.day)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 150)

            HStack {
                Label("Media: \(monitor.weeklyAverage)min/giorno",
                      systemImage: "chart.line.uptrend.xyaxis")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Stats Grid

    private var statsGrid: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 12) {
            StatCard(
                title: "Media Giornaliera",
                value: formatMinutes(monitor.weeklyAverage),
                icon: "clock",
                color: .indigo
            )

            StatCard(
                title: "Punteggio Benessere",
                value: "\(monitor.wellnessScore)/100",
                icon: "heart.fill",
                color: wellnessStatColor
            )

            StatCard(
                title: "Trend",
                value: monitor.weeklyTrend.capitalized,
                icon: trendIcon,
                color: trendColor
            )

            StatCard(
                title: "Report Generati",
                value: "\(monitor.recentReports.count)",
                icon: "doc.text",
                color: .teal
            )
        }
    }

    // MARK: - Report History

    private var reportHistoryCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Storico Report")
                .font(.headline)

            if monitor.recentReports.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.largeTitle)
                        .foregroundStyle(.secondary)
                    Text("Nessun report ancora")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("Premi 'Analizza con AI' nella Dashboard per generare il primo report")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
            } else {
                ForEach(monitor.recentReports) { report in
                    Button {
                        selectedReport = report
                    } label: {
                        reportRow(report)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
        .sheet(item: $selectedReport) { report in
            ReportDetailView(report: report)
        }
    }

    private func reportRow(_ report: WellnessReport) -> some View {
        HStack(spacing: 12) {
            Text(report.wellnessLevel.emoji)
                .font(.title2)

            VStack(alignment: .leading, spacing: 2) {
                Text(report.date, style: .date)
                    .font(.subheadline.weight(.medium))
                Text("Schermo: \(report.totalScreenTimeFormatted) | Score: \(report.overallWellnessScore)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }

    // MARK: - Helpers

    private var weekData: [(day: String, minutes: Int)] {
        let days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
        // Use real data if available, otherwise demo
        if !monitor.weekDayUsages.isEmpty {
            return monitor.weekDayUsages
        }
        return days.enumerated().map { i, day in
            (day: day, minutes: [145, 180, 95, 210, 165, 230, monitor.todayTotalMinutes][i])
        }
    }

    private func formatMinutes(_ minutes: Int) -> String {
        let h = minutes / 60
        let m = minutes % 60
        return h > 0 ? "\(h)h \(m)m" : "\(m)m"
    }

    private func barColor(minutes: Int) -> Color {
        if minutes > monitor.dailyGoalMinutes {
            return .red.opacity(0.8)
        } else if minutes > Int(Double(monitor.dailyGoalMinutes) * 0.8) {
            return .orange.opacity(0.8)
        }
        return .indigo.opacity(0.8)
    }

    private var trendColor: Color {
        switch monitor.weeklyTrend {
        case "in diminuzione": return .green
        case "in aumento": return .red
        default: return .orange
        }
    }

    private var trendIcon: String {
        switch monitor.weeklyTrend {
        case "in diminuzione": return "arrow.down.right"
        case "in aumento": return "arrow.up.right"
        default: return "arrow.right"
        }
    }

    private var wellnessStatColor: Color {
        if monitor.wellnessScore >= 70 { return .green }
        else if monitor.wellnessScore >= 40 { return .orange }
        return .red
    }
}

// MARK: - Stat Card Component

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)

            Text(value)
                .font(.title3.bold())

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}
