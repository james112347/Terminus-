import Foundation

/// Service for communicating with Groq AI API to generate wellness advice.
///
/// API key is loaded from Secrets.plist (not committed to git).
/// Setup: copy Secrets.plist.template -> Secrets.plist and add your key.
final class GroqAIService: ObservableObject {

    static let shared = GroqAIService()

    private let baseURL = "https://api.groq.com/openai/v1/chat/completions"
    private let model = "llama-3.3-70b-versatile"
    private let maxRetries = 3

    /// API key loaded securely from Secrets.plist at runtime
    private var apiKey: String {
        // 1. Try Secrets.plist (recommended - file is in .gitignore)
        if let path = Bundle.main.path(forResource: "Secrets", ofType: "plist"),
           let dict = NSDictionary(contentsOfFile: path),
           let key = dict["GROQ_API_KEY"] as? String,
           !key.isEmpty,
           key != "YOUR_GROQ_API_KEY_HERE" {
            return key
        }
        // 2. Try environment variable (for CI/testing)
        if let envKey = ProcessInfo.processInfo.environment["GROQ_API_KEY"],
           !envKey.isEmpty {
            return envKey
        }
        // 3. Try UserDefaults (set from Settings)
        if let savedKey = UserDefaults.standard.string(forKey: "terminus.groq.apikey"),
           !savedKey.isEmpty {
            return savedKey
        }
        return ""
    }

    /// Allow setting API key from Settings UI
    func setAPIKey(_ key: String) {
        UserDefaults.standard.set(key, forKey: "terminus.groq.apikey")
    }

    var hasAPIKey: Bool {
        !apiKey.isEmpty
    }

    @Published var isLoading: Bool = false
    @Published var lastError: String?

    // MARK: - Wellness Analysis

    /// Analyze usage data and generate wellness advice using Ralph Loop methodology
    func analyzeUsage(_ usageData: UsageAnalysisRequest) async throws -> WellnessAIResponse {
        let systemPrompt = """
        Sei un esperto di benessere digitale e neuroscienze. Analizza i dati di utilizzo \
        dello smartphone e fornisci consigli personalizzati in italiano.

        Considera gli effetti su:
        1. UMORE: Come il tempo schermo influenza serotonina, dopamina e stato emotivo
        2. CERVELLO: Impatto su attenzione, memoria, qualità del sonno, neuroplasticità
        3. GIORNATA: Produttività, relazioni sociali, attività fisica, tempo libero

        Usa il metodo RALPH Loop:
        - Review: Rivedi i dati di oggi
        - Analyze: Analizza i pattern problematici
        - Learn: Cosa possiamo imparare
        - Plan: Piano d'azione concreto
        - Habituate: Suggerisci un'abitudine positiva da costruire

        Rispondi SEMPRE in formato JSON valido con questa struttura esatta (senza markdown, solo JSON puro):
        {
            "moodImpactScore": <1-100>,
            "brainHealthScore": <1-100>,
            "productivityScore": <1-100>,
            "advice": "<consiglio principale in italiano>",
            "warnings": [
                {
                    "severity": "<info|caution|warning|critical>",
                    "title": "<titolo>",
                    "message": "<messaggio>",
                    "recommendation": "<raccomandazione>"
                }
            ],
            "ralphLoop": {
                "review": "<revisione>",
                "analyze": "<analisi>",
                "learn": "<apprendimento>",
                "plan": "<piano>",
                "habituate": "<abitudine>"
            }
        }
        """

        let userMessage = """
        Dati di utilizzo smartphone di oggi:

        Tempo totale schermo: \(usageData.totalMinutes) minuti

        Dettaglio per categoria:
        \(usageData.categoryDetails.map { "- \($0.category): \($0.minutes) minuti (\($0.pickups) aperture)" }.joined(separator: "\n"))

        Orario di utilizzo più intenso: \(usageData.peakUsageTime)
        Utilizzo dopo le 23:00: \(usageData.lateNightMinutes) minuti
        Numero totale sblocchi: \(usageData.totalPickups)

        Media settimanale precedente: \(usageData.weeklyAverageMinutes) minuti/giorno
        Trend: \(usageData.trend)

        Obiettivo giornaliero utente: \(usageData.dailyGoalMinutes) minuti
        """

        let response = try await sendRequest(
            systemPrompt: systemPrompt,
            userMessage: userMessage
        )

        return try parseWellnessResponse(response)
    }

    /// Generate a quick tip based on current usage
    func generateQuickTip(currentMinutes: Int, category: String) async throws -> String {
        let systemPrompt = """
        Sei un coach di benessere digitale. Dai un consiglio breve e motivante \
        in italiano (max 2 frasi) sull'utilizzo dello smartphone.
        """

        let userMessage = """
        L'utente ha usato \(currentMinutes) minuti di \(category) oggi. \
        Dai un consiglio rapido e specifico.
        """

        return try await sendRequest(
            systemPrompt: systemPrompt,
            userMessage: userMessage
        )
    }

    /// Generate weekly summary with deep insights
    func generateWeeklySummary(_ weekData: WeeklySummaryRequest) async throws -> String {
        let systemPrompt = """
        Sei un neuroscienziato e psicologo specializzato in benessere digitale. \
        Genera un report settimanale dettagliato in italiano che includa:

        1. Analisi dei pattern di utilizzo della settimana
        2. Impatto stimato su umore e funzioni cognitive
        3. Confronto con la settimana precedente
        4. 3 azioni concrete per la prossima settimana (metodo GSD)
        5. Un insight scientifico su come lo schermo influenza il cervello

        Sii specifico, usa dati e sii empatico ma onesto.
        """

        let userMessage = """
        Report settimanale:
        \(weekData.dailySummaries.enumerated().map { i, day in
            "Giorno \(i+1): \(day.totalMinutes)min totali, Social: \(day.socialMinutes)min, Gaming: \(day.gamingMinutes)min"
        }.joined(separator: "\n"))

        Media giornaliera: \(weekData.averageMinutes) minuti
        Giorno peggiore: \(weekData.worstDay)
        Giorno migliore: \(weekData.bestDay)
        Obiettivo settimanale: \(weekData.weeklyGoalMinutes) minuti/giorno
        """

        return try await sendRequest(
            systemPrompt: systemPrompt,
            userMessage: userMessage
        )
    }

    // MARK: - Network Layer with Retry

    private func sendRequest(systemPrompt: String, userMessage: String) async throws -> String {
        guard !apiKey.isEmpty else {
            throw GroqError.missingAPIKey
        }

        let body: [String: Any] = [
            "model": model,
            "messages": [
                ["role": "system", "content": systemPrompt],
                ["role": "user", "content": userMessage]
            ],
            "temperature": 0.7,
            "max_tokens": 2048,
            "top_p": 0.9,
            "response_format": ["type": "json_object"]
        ]

        let bodyData = try JSONSerialization.data(withJSONObject: body)

        await MainActor.run { self.isLoading = true }
        defer { Task { @MainActor in self.isLoading = false } }

        // Retry with exponential backoff
        var lastError: Error?
        for attempt in 0..<maxRetries {
            do {
                return try await executeRequest(bodyData: bodyData)
            } catch let error as GroqError {
                // Don't retry on auth or parsing errors
                switch error {
                case .missingAPIKey, .parsingError:
                    throw error
                case .apiError(let code, _) where code == 401 || code == 403:
                    throw error
                default:
                    lastError = error
                }
            } catch {
                lastError = error
            }

            if attempt < maxRetries - 1 {
                let delay = UInt64(pow(2.0, Double(attempt))) * 1_000_000_000
                try await Task.sleep(nanoseconds: delay)
            }
        }

        throw lastError ?? GroqError.invalidResponse
    }

    private func executeRequest(bodyData: Data) async throws -> String {
        guard let url = URL(string: baseURL) else {
            throw GroqError.invalidResponse
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = bodyData
        request.timeoutInterval = 30

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GroqError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw GroqError.apiError(statusCode: httpResponse.statusCode, message: errorBody)
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let choices = json?["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let message = firstChoice["message"] as? [String: Any],
              let content = message["content"] as? String else {
            throw GroqError.parsingError
        }

        return content
    }

    private func parseWellnessResponse(_ response: String) throws -> WellnessAIResponse {
        // Extract JSON from response (handle possible markdown code blocks)
        var jsonString = response.trimmingCharacters(in: .whitespacesAndNewlines)

        // Remove markdown code block markers if present
        if jsonString.hasPrefix("```json") {
            jsonString = String(jsonString.dropFirst(7))
        } else if jsonString.hasPrefix("```") {
            jsonString = String(jsonString.dropFirst(3))
        }
        if jsonString.hasSuffix("```") {
            jsonString = String(jsonString.dropLast(3))
        }
        jsonString = jsonString.trimmingCharacters(in: .whitespacesAndNewlines)

        // Find the outermost JSON object
        if let startIndex = jsonString.firstIndex(of: "{"),
           let endIndex = jsonString.lastIndex(of: "}") {
            jsonString = String(jsonString[startIndex...endIndex])
        }

        guard let data = jsonString.data(using: .utf8) else {
            throw GroqError.parsingError
        }

        do {
            return try JSONDecoder().decode(WellnessAIResponse.self, from: data)
        } catch {
            print("JSON parsing failed: \(error)")
            print("Response was: \(jsonString.prefix(500))")
            throw GroqError.parsingError
        }
    }
}

// MARK: - Request/Response Models

struct UsageAnalysisRequest {
    let totalMinutes: Int
    let categoryDetails: [CategoryDetail]
    let peakUsageTime: String
    let lateNightMinutes: Int
    let totalPickups: Int
    let weeklyAverageMinutes: Int
    let trend: String
    let dailyGoalMinutes: Int

    struct CategoryDetail {
        let category: String
        let minutes: Int
        let pickups: Int
    }
}

struct WeeklySummaryRequest {
    let dailySummaries: [DaySummary]
    let averageMinutes: Int
    let worstDay: String
    let bestDay: String
    let weeklyGoalMinutes: Int

    struct DaySummary {
        let totalMinutes: Int
        let socialMinutes: Int
        let gamingMinutes: Int
    }
}

struct WellnessAIResponse: Codable {
    let moodImpactScore: Int
    let brainHealthScore: Int
    let productivityScore: Int
    let advice: String
    let warnings: [AIWarning]
    let ralphLoop: RalphLoopResponse

    struct AIWarning: Codable {
        let severity: String
        let title: String
        let message: String
        let recommendation: String
    }

    struct RalphLoopResponse: Codable {
        let review: String
        let analyze: String
        let learn: String
        let plan: String
        let habituate: String
    }
}

// MARK: - Errors

enum GroqError: LocalizedError {
    case missingAPIKey
    case invalidResponse
    case apiError(statusCode: Int, message: String)
    case parsingError

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "API key Groq mancante. Vai in Impostazioni e inserisci la tua chiave API."
        case .invalidResponse:
            return "Risposta non valida dal server Groq."
        case .apiError(let code, let message):
            return "Errore API Groq (\(code)): \(message)"
        case .parsingError:
            return "Errore nell'analisi della risposta AI. Riprova."
        }
    }
}
