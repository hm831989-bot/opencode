import { createEffect, createSignal, onCleanup } from "solid-js"
import { useTheme } from "../context/theme"
import { voiceState } from "../jarvis/voice"

const FRAMES = [
  ["    ·  ◌  ·    ", "  ·  ◉◎◉  ·  ", "·  ◉◎◎◎◉  ·", "  ·  ◉◎◉  ·  ", "    ·  ◌  ·    "],
  ["   ·  ◌◎◌  ·   ", " ·  ◉◎◎◎◉  · ", "· ◉◎◉◉◉◎◉ ·", " ·  ◉◎◎◎◉  · ", "   ·  ◌◎◌  ·   "],
  ["  · ◌◎◎◎◌ ·  ", " ·◉◎◎◎◎◎◉· ", "·◉◎◉◎◎◉◎◉·", " ·◉◎◎◎◎◎◉· ", "  · ◌◎◎◎◌ ·  "],
  ["   ·  ◌◎◌  ·   ", " ·  ◉◎◎◎◉  · ", "· ◉◎◉◉◉◎◉ ·", " ·  ◉◎◎◎◉  · ", "   ·  ◌◎◌  ·   "],
]

export function JarvisOrb() {
  const { theme } = useTheme()
  const [frame, setFrame] = createSignal(0)

  createEffect(() => {
    const timer = setInterval(() => setFrame((value) => (value + 1) % FRAMES.length), voiceState() === "idle" ? 650 : 120)
    onCleanup(() => clearInterval(timer))
  })

  const lines = () => FRAMES[frame()]
  const label = () => (voiceState() === "listening" ? "LISTENING" : voiceState() === "speaking" ? "SPEAKING" : voiceState() === "error" ? "VOICE ERROR" : "JARVIS CORE")

  return (
    <box flexDirection="column" alignItems="center" height={7} minHeight={7}>
      <text fg={voiceState() === "listening" ? theme.success : theme.primary} selectable={false}>
        {lines().join("\n")}
      </text>
      <text fg={theme.primary} selectable={false}>{`◈ ${label()} ◈`}</text>
    </box>
  )
}
