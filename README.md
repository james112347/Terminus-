# Terminus - App Usage Wellness Monitor

**Terminus** is an iOS app that monitors your screen time and provides AI-powered wellness advice about how smartphone usage affects your mood, brain health, and daily productivity.

## Features

- **Screen Time Monitoring** - Tracks app usage via Apple's DeviceActivity/FamilyControls framework
- **AI Wellness Analysis** - Uses Groq AI (Llama 3.3 70B) to generate personalized wellness insights in Italian
- **Mood & Brain Impact Scores** - Quantifies how screen time affects your emotional state and cognitive function
- **Smart Notifications** - Alerts when you exceed limits, use phone late at night, or hit critical thresholds
- **Historical Reports** - Weekly trends and daily breakdown with detailed category analysis

## Methodologies

### GSD (Get Stuff Done)
Five-phase data processing pipeline:
1. **Capture** - Collect raw screen time data
2. **Clarify** - Categorize and process usage patterns
3. **Organize** - Structure findings into actionable reports with AI
4. **Reflect** - Evaluate impact on health and productivity
5. **Engage** - Deliver advice and take action

### Ralph Loop
Continuous improvement cycle:
1. **Review** - Daily screen time review
2. **Analyze** - Pattern and impact analysis
3. **Learn** - Extract insights from data
4. **Plan** - Create concrete action plans
5. **Habituate** - Build positive long-term habits

### BMAD Framework
Architectural framework: Build, Measure, Analyze, Decide

## Tech Stack

- **Language**: Swift 5.9
- **UI**: SwiftUI (iOS 17+)
- **Architecture**: MVVM
- **AI Backend**: Groq API (Llama 3.3 70B Versatile)
- **Screen Time**: DeviceActivity + FamilyControls frameworks
- **Notifications**: UserNotifications framework
- **Storage**: UserDefaults (local persistence)

## Project Structure

```
Terminus/
├── App/
│   ├── TerminusApp.swift          # App entry point
│   └── AppState.swift             # Central state (GSD + Ralph Loop phases)
├── Models/
│   ├── AppUsageRecord.swift       # Usage data model
│   ├── WellnessReport.swift       # Report & warning models
│   └── UserProfile.swift          # User settings & goals
├── Views/
│   ├── ContentView.swift          # Tab navigation
│   ├── DashboardView.swift        # Main dashboard with scores
│   ├── ReportsView.swift          # Historical reports & trends
│   ├── WellnessView.swift         # Brain health & Ralph Loop
│   ├── ReportDetailView.swift     # Single report detail
│   └── SettingsView.swift         # Goals, limits, methodology info
├── ViewModels/
│   └── UsageMonitorViewModel.swift # Main ViewModel
├── Services/
│   ├── ScreenTimeService.swift    # Apple Screen Time API
│   ├── GroqAIService.swift        # Groq AI integration
│   ├── UsageDataStore.swift       # Local data persistence
│   ├── NotificationService.swift  # Push notifications
│   └── WellnessEngine.swift       # Core analysis engine (GSD pipeline)
└── Resources/
    ├── Info.plist
    ├── Assets.xcassets/
    └── Secrets.plist.template     # API key template
```

## Setup

### Prerequisites
- Xcode 15+
- iOS 17+ device (Screen Time APIs require a physical device)
- Groq API key

### Installation

1. Clone the repository
2. Open `Terminus.xcodeproj` in Xcode
3. Copy `Terminus/Resources/Secrets.plist.template` to `Terminus/Resources/Secrets.plist`
4. Add your Groq API key to `Secrets.plist`
5. Set your Development Team in Xcode signing settings
6. Enable the "Family Controls" capability in your Apple Developer account
7. Build and run on a physical iPhone

### API Key Setup

The app uses the Groq API for AI-powered wellness analysis. Get your key at [console.groq.com](https://console.groq.com).

> **Security Note**: Never commit `Secrets.plist` to version control. It's already in `.gitignore`.

## Requirements

- iOS 17.0+
- iPhone only
- Physical device required for Screen Time features

## License

Private project.
