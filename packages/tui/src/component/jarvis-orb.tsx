import { createEffect, createSignal, onCleanup } from "solid-js"
import { useTheme } from "../context/theme"

const FRAMES = [
  ["    ·  ◌  ·    ", "  ·  ◉◎◉  ·  ", "·  ◉◎◎◎◉  ·", "  ·  ◉◎◉  ·  ", "    ·  ◌  ·    "],
  ["   ·  ◌◎◌  ·   ", " ·  ◉◎◎◎◉  · ", "· ◉◎◉◉◉◎◉ ·", " ·  ◉◎◎◎◉  · ", "   ·  ◌◎◌  ·   "],
  ["  · ◌◎◎◎◌ ·  ", " ·◉◎◎◎◎◎◉· ", "·◉◎◉◎◎◉◎◉·", " ·◉◎◎◎◎◎◉· ", "  · ◌◎◎◎◌ ·  "],
  ["   ·  ◌◎◌  ·   ", " ·  ◉◎◎◎◉  · ", "· ◉◎◉◉◉◎◉ ·", " ·  ◉◎◎◎◉  · ", "   ·  ◌◎◌  ·   "],
]

export function JarvisOrb(props: { active?: boolean; listening?: boolean; speaking?: boolean }) {
  const { theme } = useTheme()
  const [frame, setFrame] = createSignal(0)

  createEffect(() => {
    const timer = setInterval(() => setFrame((value) => (value + 1) % FRAMES.length), props.active === false ? 1000 : 120)
    onCleanup(() => clearInterval(timer))
  })

  const lines = () => FRAMES[frame()]
  const label = () => (props.listening ? "LISTENING" : props.speaking ? "SPEAKING" : "JARVIS CORE")

  return (
    <box flexDirection="column" alignItems="center" height={7} minHeight={7}>
      <text fg={props.listening ? theme.success : theme.primary} selectable={false}>
        {lines().join("\n")}
      </text>
      <text fg={theme.primary} selectable={false}>{`◈ ${label()} ◈`}</text>
    </box>
  )
}
