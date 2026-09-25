# FULLKIN — Dependency Security Audit (P1.14)

_Datum: 25 sep 2026. Uitgangspunt: `npm audit` meldde 1 critical, 6 high, 1 moderate._

## Eindresultaat

```
found 0 vulnerabilities
```

Opgelost via een **gecontroleerde** upgrade (geen blinde `npm audit fix --force`):
`npm audit fix` voor de geneste build-dependencies, en een expliciete, **niet-major**
upgrade van Next.js (`16.2.10 → 16.3.6`). Daarna geverifieerd: `next build` ✅,
`tsc --noEmit` ✅, kerntests **76/76** ✅.

## Classificatie & afhandeling

| Pakket | Ernst | Aard | Blootstelling in Fullkin | Actie |
|---|---|---|---|---|
| **next** | **critical** | RCE (Windows/AVIF image opt.), SSRF in Server Actions, DoS, cache-confusion, proxy-bypass | **Productie-exploitbaar** — de app gebruikt App Router, Server Actions én Image Optimization | Upgrade → **16.3.6** (non-major) |
| postcss | high | XSS via stringify + path traversal via `sourceMappingURL` | Build-time CSS-verwerking (geen attacker-controlled CSS at runtime) | Meegelift met next-upgrade |
| sharp | high | libvips/libheif CVE's | Image Optimization kan aanvaller-afbeeldingen verwerken → potentieel bereikbaar | Meegelift met next-upgrade |
| browserslist | high | OOM via untrusted `browserslist-stats.json` | Build-only | `npm audit fix` |
| js-yaml | high | CPU-DoS in YAML-resolutie | Transitief (tooling); geen runtime-parsing van untrusted YAML | `npm audit fix` |
| brace-expansion | high | DoS via unbounded expansion (glob) | Transitief (build/tooling) | `npm audit fix` |
| nanoid | high | oneindige lus bij `size = 0` | Transitief; wordt niet met `size 0` aangeroepen | `npm audit fix` |
| baseline-browser-mapping | moderate | procescrash bij ongeldige input | Build-only | `npm audit fix` |

## Waarom dit veilig kon

- **Next 16.2.10 → 16.3.6** is een minor/patch binnen dezelfde majorversie. De app is
  na de upgrade volledig gebouwd (`next build` slaagt voor alle routes) en getypecheckt.
- De overige fixes waren geneste (transitieve) build-dependencies; `npm audit fix`
  (zonder `--force`) paste alleen semver-compatibele patches toe.
- Er is **geen** `--force` gebruikt en dus geen brekende major-upgrade doorgevoerd.

## Verificatie na afloop

| Check | Resultaat |
|---|---|
| `npm audit` | **0 vulnerabilities** |
| `npm run build` (next 16.3.6) | ✅ slaagt |
| `npx tsc --noEmit` | ✅ geen fouten |
| Kerntests (`npm run test:local`) | ✅ 76/76 |
| Playwright-config | ✅ compileert (live-audit draait tegen de gedeployde app) |

## Onderhoud

- Draai `npm audit` in CI-onderhoud periodiek; behandel nieuwe *critical/high* met
  productie-blootstelling met prioriteit.
- Houd Next.js bij op de laatste patch binnen de major (security-fixes komen daar het
  snelst).
