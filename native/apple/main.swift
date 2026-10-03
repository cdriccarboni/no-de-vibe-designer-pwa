import Foundation
import FoundationModels
import AppIntents

struct OpenProjectIntent: AppIntent {
    static var title: LocalizedStringResource = "Ouvrir un projet"
    static var openAppWhenRun: Bool = true
    @Parameter(title: "Projet") var project: String

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        .result(value: actionJSON("open-project", ["project": project]))
    }
}

struct FireCueIntent: AppIntent {
    static var title: LocalizedStringResource = "Lancer une cue"
    static var openAppWhenRun: Bool = true
    @Parameter(title: "Cue") var cue: String

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        .result(value: actionJSON("cue", ["cue": cue]))
    }
}

struct ApplyPresetIntent: AppIntent {
    static var title: LocalizedStringResource = "Appliquer un preset"
    static var openAppWhenRun: Bool = true
    @Parameter(title: "Preset") var preset: String

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        .result(value: actionJSON("preset", ["preset": preset]))
    }
}

private func jsonString(_ value: String) -> String {
    let data = try! JSONSerialization.data(withJSONObject: [value])
    let text = String(data: data, encoding: .utf8)!
    return String(text.dropFirst().dropLast())
}

private func actionJSON(_ action: String, _ fields: [String: String]) -> String {
    var payload: [String: String] = ["action": action]
    for (key, value) in fields { payload[key] = value }
    let data = try! JSONSerialization.data(withJSONObject: payload)
    return String(data: data, encoding: .utf8)!
}

@main
struct AppleProvider {
    static func main() async {
        let command = CommandLine.arguments.dropFirst().first ?? "status"
        let model = SystemLanguageModel.default
        switch model.availability {
        case .available:
            if command == "respond" {
                let prompt = CommandLine.arguments.dropFirst().dropFirst().joined(separator: " ")
                guard !prompt.isEmpty else {
                    emit(["ok": false, "compiled": true, "availability": "available", "error": "prompt absent"])
                    return
                }
                do {
                    let session = LanguageModelSession()
                    let response = try await session.respond(to: prompt)
                    emit([
                        "ok": true,
                        "compiled": true,
                        "ran": true,
                        "availability": "available",
                        "content": response.content
                    ])
                } catch {
                    emit(["ok": false, "compiled": true, "ran": true, "availability": "available", "error": String(describing: error)])
                }
            } else {
                emit(["ok": true, "compiled": true, "ran": true, "availability": "available"])
            }
        case .unavailable(let reason):
            emit([
                "ok": false,
                "compiled": true,
                "ran": true,
                "availability": "unavailable",
                "reason": reasonLabel(reason)
            ])
        @unknown default:
            emit(["ok": false, "compiled": true, "ran": true, "availability": "unknown"])
        }
    }
}

private func reasonLabel(_ reason: SystemLanguageModel.Availability.UnavailableReason) -> String {
    switch reason {
    case .deviceNotEligible: return "deviceNotEligible"
    case .appleIntelligenceNotEnabled: return "appleIntelligenceNotEnabled"
    case .modelNotReady: return "modelNotReady"
    @unknown default: return "unknown"
    }
}

private func emit(_ payload: [String: Any]) {
    var object = payload
    object["os"] = ProcessInfo.processInfo.operatingSystemVersionString
    let data = try! JSONSerialization.data(withJSONObject: object)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data([0x0A]))
}
