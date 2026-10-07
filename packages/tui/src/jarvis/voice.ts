import { spawn } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

export type VoiceState = "idle" | "listening" | "speaking" | "error"

let activeProcess: ReturnType<typeof spawn> | undefined

function run(command: string, args: string[], input?: string) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] })
    activeProcess = child
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()))
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()))
    child.once("error", reject)
    child.once("close", (code) => {
      if (activeProcess === child) activeProcess = undefined
      resolve({ code: code ?? 1, stdout, stderr })
    })
    if (input !== undefined) {
      child.stdin.write(input)
      child.stdin.end()
    }
  })
}

function powershellTts(text: string) {
  const encoded = Buffer.from(text, "utf8").toString("base64")
  const script = "$t=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($args[0])); Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak($t); $s.Dispose()"
  return run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script, $encoded])
}

export async function speak(text: string) {
  const value = text.trim()
  if (!value) return
  if (process.platform === "win32") {
    const result = await powershellTts(value)
    if (result.code !== 0) throw new Error(result.stderr || "Windows TTS failed")
    return
  }

  const candidates =
    process.platform === "darwin"
      ? [["say", [] as string[]]]
      : [["spd-say", [] as string[]], ["espeak-ng", [] as string[]], ["espeak", [] as string[]]]

  let lastError = ""
  for (const [command, baseArgs] of candidates) {
    try {
      const result = await run(command, [...baseArgs, value])
      if (result.code === 0) return
      lastError = result.stderr
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }
  throw new Error(lastError || "No supported TTS engine found")
}

async function windowsMicrophoneDevice() {
  const result = await run("ffmpeg", ["-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy"])
  const match = result.stderr.match(/"([^"]+)"\s*\(audio\)/i)
  return match?.[1]
}

async function record(seconds: number, file: string) {
  if (process.env.JARVIS_STT_RECORD_COMMAND) {
    const command = process.env.JARVIS_STT_RECORD_COMMAND.replaceAll("{output}", file).replaceAll("{seconds}", String(seconds))
    const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh"
    const flag = process.platform === "win32" ? "/c" : "-lc"
    const result = await run(shell, [flag, command])
    if (result.code !== 0) throw new Error(result.stderr || "Custom STT recorder failed")
    return
  }

  if (process.platform === "win32") {
    const device = await windowsMicrophoneDevice()
    if (!device) throw new Error("No Windows microphone found. Set JARVIS_STT_RECORD_COMMAND to a recorder command.")
    const result = await run("ffmpeg", [
      "-y", "-f", "dshow", "-i", `audio=${device}`, "-t", String(seconds), "-ac", "1", "-ar", "16000", file,
    ])
    if (result.code !== 0) throw new Error(result.stderr || "Microphone recording failed")
    return
  }

  if (process.platform === "darwin") {
    const result = await run("ffmpeg", ["-y", "-f", "avfoundation", "-i", ":0", "-t", String(seconds), "-ac", "1", "-ar", "16000", file])
    if (result.code !== 0) throw new Error(result.stderr || "Microphone recording failed")
    return
  }

  const result = await run("ffmpeg", ["-y", "-f", "pulse", "-i", "default", "-t", String(seconds), "-ac", "1", "-ar", "16000", file])
  if (result.code !== 0) throw new Error(result.stderr || "Microphone recording failed")
}

export async function transcribeFile(file: string) {
  const model = process.env.JARVIS_WHISPER_MODEL
  if (!model) throw new Error("Set JARVIS_WHISPER_MODEL to a local Whisper model name/path.")
  const dir = await mkdtemp(join(tmpdir(), "jarvis-whisper-"))
  try {
    const result = await run("whisper", [file, "--model", model, "--output_format", "txt", "--output_dir", dir])
    if (result.code !== 0) throw new Error(result.stderr || "Whisper transcription failed")
    const output = join(dir, file.split(/[\\/]/).pop()!.replace(/\.[^.]+$/, "") + ".txt")
    return (await readFile(output, "utf8")).trim()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function listen(seconds = Number(process.env.JARVIS_STT_SECONDS ?? 6)) {
  const dir = await mkdtemp(join(tmpdir(), "jarvis-stt-"))
  const file = join(dir, "input.wav")
  try {
    await record(seconds, file)
    return await transcribeFile(file)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export function cancelVoice() {
  activeProcess?.kill()
  activeProcess = undefined
}
