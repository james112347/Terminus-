import SwiftUI

/// Energy level card with animated bar, breakdown factors, and tips
struct EnergyCardView: View {
    @ObservedObject var calculator: EnergyCalculator

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("LIVELLO ENERGIA")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.secondary)
                        .tracking(0.8)

                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text("\(calculator.currentEnergy)")
                            .font(.system(size: 36, weight: .heavy, design: .rounded))
                            .foregroundStyle(energyColor)
                        Text(calculator.energyLabel)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(energyColor)
                    }
                }
                Spacer()
                Text("\(calculator.currentEnergy)%")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Energy bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color(.systemGray5))
                    RoundedRectangle(cornerRadius: 6)
                        .fill(
                            LinearGradient(
                                colors: barGradientColors,
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * CGFloat(calculator.currentEnergy) / 100)
                        .animation(.spring(response: 0.8), value: calculator.currentEnergy)
                }
            }
            .frame(height: 10)

            // Breakdown factors
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 6) {
                let bd = calculator.breakdown
                EnergyFactor(color: .blue, text: "Sonno \(Int(bd.sleepHours))h: \(bd.baseline)/100")
                EnergyFactor(color: .green, text: "Attivita: +\(bd.activityBonus)")
                EnergyFactor(color: .red, text: "Schermo: -\(bd.durationDrain)")
                EnergyFactor(color: .purple, text: "Contenuti: -\(bd.contentDrain)")
                EnergyFactor(color: .orange, text: "Interruzioni: -\(bd.fragmentDrain)")
                if bd.goalDrain > 0 {
                    EnergyFactor(color: .red, text: "Obiettivo: -\(bd.goalDrain)")
                } else {
                    EnergyFactor(color: .green, text: "Obiettivo: bonus")
                }
                if bd.bedtimePenalty > 0 {
                    EnergyFactor(color: .indigo, text: "Bedtime: -\(bd.bedtimePenalty)")
                }
                if bd.stressMultiplier != 1.0 {
                    EnergyFactor(color: .pink, text: "Stress: x\(String(format: "%.2f", bd.stressMultiplier))")
                }
            }

            // Hours until bed
            if let hoursLeft = calculator.breakdown.hoursUntilBed, hoursLeft > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "moon.fill")
                        .font(.caption2)
                        .foregroundStyle(.indigo)
                    Text("~\(Int(hoursLeft))h prima di dormire")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.06), radius: 12, y: 4)
        )
    }

    private var energyColor: Color {
        switch calculator.currentEnergy {
        case 70...100: return .green
        case 45..<70: return .orange
        default: return .red
        }
    }

    private var barGradientColors: [Color] {
        if calculator.currentEnergy >= 70 {
            return [.green, .teal]
        } else if calculator.currentEnergy >= 45 {
            return [.orange, .yellow]
        } else {
            return [.red, .orange]
        }
    }
}

/// Compact energy card for results/reports
struct EnergyCompactCard: View {
    let energy: Int
    let tips: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("ANALISI ENERGIA")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.indigo)
                    .tracking(0.8)
                Spacer()
                Text("\(energy)%")
                    .font(.title3.weight(.heavy))
                    .foregroundStyle(colorFor(energy))
                Text(EnergyCalculator.label(for: energy))
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(colorFor(energy))
            }

            // Bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(.systemGray5))
                    RoundedRectangle(cornerRadius: 4)
                        .fill(colorFor(energy))
                        .frame(width: geo.size.width * CGFloat(energy) / 100)
                }
            }
            .frame(height: 6)

            // Tips
            if !tips.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(Array(tips.enumerated()), id: \.offset) { _, tip in
                        HStack(alignment: .top, spacing: 6) {
                            Image(systemName: "lightbulb.fill")
                                .font(.caption2)
                                .foregroundStyle(.orange)
                            Text(tip)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    LinearGradient(
                        colors: [Color.indigo.opacity(0.04), Color.teal.opacity(0.03)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.indigo.opacity(0.15), lineWidth: 1)
                )
        )
    }

    private func colorFor(_ energy: Int) -> Color {
        switch energy {
        case 70...100: return .green
        case 45..<70: return .orange
        default: return .red
        }
    }
}

struct EnergyFactor: View {
    let color: Color
    let text: String

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color)
                .frame(width: 6, height: 6)
            Text(text)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
    }
}
