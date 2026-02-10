import SwiftUI

/// Settings view for configuring goals, limits, and notifications
struct SettingsView: View {
    @EnvironmentObject var monitor: UsageMonitorViewModel
    @State private var dailyGoalHours: Double = 2.0
    @State private var socialMediaLimit: Double = 60
    @State private var gamingLimit: Double = 90
    @State private var entertainmentLimit: Double = 120
    @State private var notificationsEnabled: Bool = true
    @State private var lateNightHour: Int = 23
    @State private var showResetConfirm: Bool = false

    var body: some View {
        NavigationStack {
            Form {
                // Daily Goal
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Obiettivo Giornaliero")
                            Spacer()
                            Text(formatHours(dailyGoalHours))
                                .font(.headline)
                                .foregroundStyle(.indigo)
                        }
                        Slider(value: $dailyGoalHours, in: 0.5...8, step: 0.5)
                            .tint(.indigo)
                            .onChange(of: dailyGoalHours) { _, newValue in
                                monitor.updateDailyGoal(minutes: Int(newValue * 60))
                            }
                    }
                } header: {
                    Text("Tempo Schermo")
                } footer: {
                    Text("Gli esperti raccomandano meno di 2 ore al giorno per un uso ricreativo.")
                }

                // Category Limits
                Section("Limiti per Categoria") {
                    LimitRow(
                        title: "Social Media",
                        icon: "person.2.fill",
                        color: .red,
                        minutes: $socialMediaLimit,
                        onChange: { monitor.setCategoryLimit(category: .socialMedia, minutes: Int($0)) }
                    )

                    LimitRow(
                        title: "Gaming",
                        icon: "gamecontroller.fill",
                        color: .purple,
                        minutes: $gamingLimit,
                        onChange: { monitor.setCategoryLimit(category: .gaming, minutes: Int($0)) }
                    )

                    LimitRow(
                        title: "Intrattenimento",
                        icon: "play.rectangle.fill",
                        color: .orange,
                        minutes: $entertainmentLimit,
                        onChange: { monitor.setCategoryLimit(category: .entertainment, minutes: Int($0)) }
                    )
                }

                // Notifications
                Section("Notifiche") {
                    Toggle("Notifiche Attive", isOn: $notificationsEnabled)
                        .tint(.indigo)

                    if notificationsEnabled {
                        Stepper(
                            "Avviso notturno: ore \(lateNightHour):00",
                            value: $lateNightHour,
                            in: 20...23
                        )
                    }
                }

                // Methodologies Info
                Section("Metodologie") {
                    NavigationLink {
                        GSDInfoView()
                    } label: {
                        Label("Metodo GSD", systemImage: "checklist")
                    }

                    NavigationLink {
                        RalphLoopInfoView()
                    } label: {
                        Label("Ralph Loop", systemImage: "arrow.triangle.2.circlepath")
                    }

                    NavigationLink {
                        BMADInfoView()
                    } label: {
                        Label("BMAD Framework", systemImage: "building.columns")
                    }
                }

                // About
                Section("Info") {
                    HStack {
                        Text("Versione")
                        Spacer()
                        Text("1.0.0")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("AI Engine")
                        Spacer()
                        Text("Groq - Llama 3.3 70B")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("Target")
                        Spacer()
                        Text("iOS 18+ / iPhone 17")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text("AI Groq attiva")
                            .font(.subheadline)
                            .foregroundStyle(.green)
                    }
                }

                // Reset
                Section {
                    Button(role: .destructive) {
                        showResetConfirm = true
                    } label: {
                        Label("Resetta Tutti i Dati", systemImage: "trash")
                    }
                }
            }
            .navigationTitle("Impostazioni")
            .alert("Resettare tutti i dati?", isPresented: $showResetConfirm) {
                Button("Annulla", role: .cancel) {}
                Button("Resetta", role: .destructive) {
                    UsageDataStore.shared.resetAllData()
                }
            } message: {
                Text("Questa azione cancellerà tutti i report e le impostazioni. Non può essere annullata.")
            }
        }
    }

    private func formatHours(_ hours: Double) -> String {
        let h = Int(hours)
        let m = Int((hours - Double(h)) * 60)
        if m > 0 {
            return "\(h)h \(m)m"
        }
        return "\(h)h"
    }
}

// MARK: - Limit Row

struct LimitRow: View {
    let title: String
    let icon: String
    let color: Color
    @Binding var minutes: Double
    let onChange: (Double) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(color)
                Text(title)
                Spacer()
                Text("\(Int(minutes))min")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(color)
            }
            Slider(value: $minutes, in: 15...300, step: 15)
                .tint(color)
                .onChange(of: minutes) { _, newValue in
                    onChange(newValue)
                }
        }
    }
}

// MARK: - Info Views

struct GSDInfoView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Metodo GSD - Get Stuff Done")
                    .font(.title2.bold())

                Text("""
                Il metodo GSD (Getting Stuff Done) è una metodologia di produttività \
                che Terminus utilizza per gestire il monitoraggio del tuo benessere digitale.

                Le 5 fasi:
                """)
                .font(.subheadline)

                PhaseDescription(
                    phase: "1. Capture",
                    desc: "Raccogliamo tutti i dati di utilizzo delle app dal tuo dispositivo.",
                    icon: "tray.and.arrow.down"
                )
                PhaseDescription(
                    phase: "2. Clarify",
                    desc: "Analizziamo e categorizziamo i dati per identificare pattern.",
                    icon: "magnifyingglass"
                )
                PhaseDescription(
                    phase: "3. Organize",
                    desc: "Organizziamo le informazioni in report strutturati con l'aiuto dell'AI.",
                    icon: "folder"
                )
                PhaseDescription(
                    phase: "4. Reflect",
                    desc: "Riflettiamo sugli effetti del tempo schermo su umore e cervello.",
                    icon: "brain.head.profile"
                )
                PhaseDescription(
                    phase: "5. Engage",
                    desc: "Agiamo con consigli concreti e limiti personalizzati.",
                    icon: "bolt.fill"
                )
            }
            .padding()
        }
        .navigationTitle("Metodo GSD")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct RalphLoopInfoView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Ralph Loop")
                    .font(.title2.bold())

                Text("""
                Il Ralph Loop è un ciclo di miglioramento continuo che Terminus \
                utilizza per aiutarti a costruire abitudini digitali più sane.
                """)
                .font(.subheadline)

                PhaseDescription(
                    phase: "Review",
                    desc: "Revisione quotidiana del tempo schermo e delle abitudini.",
                    icon: "eye"
                )
                PhaseDescription(
                    phase: "Analyze",
                    desc: "Analisi approfondita dell'impatto su salute mentale e produttività.",
                    icon: "magnifyingglass"
                )
                PhaseDescription(
                    phase: "Learn",
                    desc: "Apprendimento dai pattern identificati e dalle ricerche neuroscientifiche.",
                    icon: "lightbulb"
                )
                PhaseDescription(
                    phase: "Plan",
                    desc: "Pianificazione di azioni concrete per migliorare.",
                    icon: "list.bullet.clipboard"
                )
                PhaseDescription(
                    phase: "Habituate",
                    desc: "Costruzione graduale di abitudini positive e sostenibili.",
                    icon: "repeat"
                )
            }
            .padding()
        }
        .navigationTitle("Ralph Loop")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct BMADInfoView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("BMAD Framework")
                    .font(.title2.bold())

                Text("""
                BMAD (Build, Measure, Analyze, Decide) è il framework architetturale \
                alla base di Terminus. Guida lo sviluppo e l'evoluzione dell'app.
                """)
                .font(.subheadline)

                PhaseDescription(
                    phase: "Build",
                    desc: "Costruiamo strumenti di monitoraggio e analisi del tempo schermo.",
                    icon: "hammer"
                )
                PhaseDescription(
                    phase: "Measure",
                    desc: "Misuriamo l'impatto reale dell'utilizzo su umore, sonno e produttività.",
                    icon: "ruler"
                )
                PhaseDescription(
                    phase: "Analyze",
                    desc: "Analizziamo i dati con AI (Groq) per generare insight personalizzati.",
                    icon: "chart.bar"
                )
                PhaseDescription(
                    phase: "Decide",
                    desc: "Ti aiutiamo a prendere decisioni informate sul tuo uso dello smartphone.",
                    icon: "checkmark.circle"
                )
            }
            .padding()
        }
        .navigationTitle("BMAD Framework")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PhaseDescription: View {
    let phase: String
    let desc: String
    let icon: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(.indigo)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 4) {
                Text(phase)
                    .font(.subheadline.weight(.bold))
                Text(desc)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
