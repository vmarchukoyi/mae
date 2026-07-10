# NOTICE

mae borrows two small pieces from the **superpowers** plugin
([obra/superpowers](https://github.com/obra/superpowers), MIT):

- `hooks/run-hook.cmd` — the cross-platform polyglot hook wrapper (Windows-without-WSL),
  copied verbatim.
- `hooks/session-start` — the SessionStart JSON-escape + context-injection pattern (adapted
  to inject `using-mae` and check for the superpowers dependency).

Both are used under the MIT License. The `superpowers:*` skills mae depends on are **not**
vendored — they are invoked at runtime from the installed superpowers plugin. The list of
those skills and the upstream version they were last verified against lives in
`docs/superpowers-compat.md`.

The ask-when-uncertain interview doctrine baked into mae's skills is inspired by
mattpocock's "grilling" skill — the idea only; no code is vendored.
