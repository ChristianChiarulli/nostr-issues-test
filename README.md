# nostr-issues

A GitHub workflow action for managing issues

## Example Usage

```yaml
name: Publish Issue to Nostr
on:
  issues:
    types:
      - reopened
      - opened
jobs:
  label_issues:
    runs-on: ubuntu-latest
    permissions:
      issues: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v2
      - name: Publish Issue to Nostr
        uses: ChristianChiarulli/nostr-issues-test@v0.0.9
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          repo: ${{ github.repository }}
          issue_number: ${{ github.event.issue.number }}
          nsec: ${{ secrets.NSEC }}
          kind: "1"
          tags: "[]"
          relays: '["wss://nos.lol", "wss://relay.damus.io"]'
```
