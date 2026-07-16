# Release Versioning

PacBecca uses project-wide semantic versioning in `MAJOR.MINOR.PATCH` format.

Current release:

```text
0.5.4
```

## Release Rule

Every production code push to `main` must carry an explicit PacBecca version.

Before pushing production code:

1. Update `package.json`.
2. Update `VERSION`.
3. Add a dated `CHANGELOG.md` entry.
4. Confirm the game UI displays the full version, such as `v0.5.0`, in the top-right badge.
5. Run `pnpm version:check`.

The CI and GitHub Pages workflows run the version check so the project cannot deploy with mismatched version files.

For the full production path after a release commit is ready, run:

```powershell
pnpm deploy:production
```

That helper runs the local checks, performs a GitHub Pages base-path production build, pushes `main`, waits for CI and the Pages deploy, and smoke-checks the live site.

## Version Meaning

- `MAJOR`: breaking project or hosting changes.
- `MINOR`: new gameplay, hosting, or website integration features.
- `PATCH`: fixes, documentation, release plumbing, and small non-breaking updates.

The Cloudflare leaderboard API may have separate deployment timing, but PacBecca production web pushes still follow this project version.
