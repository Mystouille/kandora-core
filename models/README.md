# Model ownership

Mongoose models are grouped by the domain that owns their schema:

- `game/`: match and replay persistence owned by `kandora-game`.
- `portal/`: content, community, and learning features owned by `kandora-portal`.
- `shared/`: identity and infrastructure used by multiple deployments.
- `tournament/`: league, scheduling, statistics, and external-platform game data owned by `kandora-tournaments`.

Ownership is not the same as exclusive access. Migration and maintenance scripts may import a model owned by another domain, but new runtime dependencies should follow the ownership boundary. Import models directly from their category; this directory intentionally has no barrel export.

Moving a model between files must not change its Mongoose model name, collection name, or schema `ref` strings unless a database migration is part of the same change.
