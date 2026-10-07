import { createEffect, createSignal, onCleanup } from "solid-js"
import { useTheme } from "../context/theme"

const FRAMES = [
  ["      ·  ✦  ·      ", "    ·  ◉◉◉  ·    ", "  ✦ ◉◉◉◉◉ ✦  ", "    ·  ◉◉◉  ·    ", "      ·  ✦  ·      "],
  ["     · ✦✦ ·     ", "   · ◉◉◉◉◉ ·   ", " ✦ ◉◉◉◉◉◉◉ ✦ ", "   · ◉◉◉◉◉ ·   ", "     · ✦✦ ·     "],
  ["    ·  ✦  ·    ", "  ✦ ◉◉◉◉◉ ✦  ", " · ◉◉◉◉◉◉◉ · ", "  ✦ ◉◉◉◉◉ ✦  ", "    ·  ✦  ·    "],
  ["     · ✦✦ ·     ", "   · ◉◉◉◉◉ ·   ", " ✦ ◉◉◉◉◉◉◉ ✦ ", "   · ◉◉◉◉◉ ·   ", "     · ✦✦ ·     "],
]

export function PlasmaOrb(props: { active?: boolean }) {
  const { theme } = useTheme()
  const [frame, setFrame] = createSignal(0)

  createEffect(() => {
    if (props.active === false) return
    const timer = setInterval(() => setFrame((value) => (value + 1) % FRAMES.length), 140)
    onCleanup(() => clearInterval(timer))
  })

  return (
    <box flexDirection="column" alignItems="center" height={7} minHeight={7}>
      <text fg={theme.primary} selectable={false}>{"╭─────────────╮"}</text>
      {FRAMES[frame()].map((line) => (
        <text fg={theme.primary} selectable={false}>{`│${line}│`}</text>
      ))}
      <text fg={theme.primary} selectable={false}>{"╰─────────────╯"}</text>
    </box>
  )
}
