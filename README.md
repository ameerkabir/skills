# Skills

Agent skills (Claude Code / any agent that reads `SKILL.md`).

| Skill | What it does |
| --- | --- |
| [`create-emdash-site`](create-emdash-site/SKILL.md) | Scaffold a new EmDash CMS site on the latest release from a variant, then create its GitHub repo, CI/CD and launch board. Variants: `community` (bilingual en/ar: home with hero, about, services, news, contact, member registration). |

## Install

Symlink a skill into your user skills directory so it is available in every project:

```bash
git clone https://github.com/ameerkabir/skills.git ~/code/skills
ln -s ~/code/skills/create-emdash-site ~/.claude/skills/create-emdash-site
```

Then run `/create-emdash-site` in Claude Code.

## Adding a variant

Copy `create-emdash-site/variants/community/` to a new folder and change four things:

- `VARIANT.md`: tokens, pages, config edits, acceptance
- `brief.example.json`
- `files/`: the overlay, with `%%TOKEN%%` placeholders. A `*.append` file is appended to the scaffold file of the same name.
- the variant list in `SKILL.md`

Re-run the dry run (scaffold, overlay, acceptance) before committing.
