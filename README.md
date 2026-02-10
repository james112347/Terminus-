# Terminus - App Usage Wellness Monitor

**Terminus** is an iOS app that monitors your screen time and provides AI-powered wellness advice about how smartphone usage affects your mood, brain health, and daily productivity.

## Features

- **Screen Time Monitoring** - Tracks app usage via Apple's DeviceActivity/FamilyControls framework
- **AI Wellness Analysis** - Uses Groq AI (Llama 3.3 70B) to generate personalized wellness insights in Italian
- **Mood & Brain Impact Scores** - Quantifies how screen time affects your emotional state and cognitive function
- **Smart Notifications** - Alerts when you exceed limits, use phone late at night, or hit critical thresholds
- **Historical Reports** - Weekly trends and daily breakdown with detailed category analysis
- **In-App API Key Setup** - Configure your Groq API key directly from Settings

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

- **Language**: Swift 6.0
- **UI**: SwiftUI (iOS 18+)
- **Target Device**: iPhone 17 and later
- **Architecture**: MVVM
- **AI Backend**: Groq API (Llama 3.3 70B Versatile) with retry + exponential backoff
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
│   └── SettingsView.swift         # Goals, limits, API key, methodology info
├── ViewModels/
│   └── UsageMonitorViewModel.swift # Main ViewModel
├── Services/
│   ├── ScreenTimeService.swift    # Apple Screen Time API (conditional compilation)
│   ├── GroqAIService.swift        # Groq AI integration (retry + secure key loading)
│   ├── UsageDataStore.swift       # Local data persistence
│   ├── NotificationService.swift  # Push notifications
│   └── WellnessEngine.swift       # Core analysis engine (GSD pipeline)
└── Resources/
    ├── Info.plist
    ├── Assets.xcassets/
    └── Secrets.plist.template     # API key template
```

## Setup for iPhone 17

### Prerequisites
- Xcode 16+
- iPhone 17 with iOS 18+
- Apple Developer account (for FamilyControls entitlement)
- Groq API key (free at console.groq.com)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/james112347/Terminus-.git
   cd Terminus-
   ```

2. Open `Terminus.xcodeproj` in Xcode 16+

3. **Configure API Key** (choose one method):

   **Method A - In-App (Recommended):**
   - Build and run the app
   - Go to Settings tab
   - Paste your Groq API key in the "Groq AI" section
   - Tap "Salva Chiave API"

   **Method B - Secrets.plist:**
   - Copy `Terminus/Resources/Secrets.plist.template` to `Terminus/Resources/Secrets.plist`
   - Replace `YOUR_GROQ_API_KEY_HERE` with your actual key
   - Add `Secrets.plist` to your Xcode project (it's gitignored)

4. **Xcode Signing:**
   - Select the Terminus target
   - Go to Signing & Capabilities
   - Set your Development Team
   - Enable "Family Controls" capability

5. **Connect iPhone 17** and build (Cmd+R)

### Groq API Key

Get your free API key at [console.groq.com](https://console.groq.com):
1. Create account
2. Go to API Keys
3. Create new key
4. Copy and paste into the app

> **Security**: The API key is stored locally on your device (UserDefaults) or in Secrets.plist (gitignored). It is never committed to the repository.

## Requirements

- iOS 18.0+
- iPhone only (optimized for iPhone 17)
- Physical device required for Screen Time features
- Groq API key for AI analysis

## License

Private project.
