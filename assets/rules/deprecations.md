# Deprecations

> **What this is:** everything kept alive only so already-released client builds keep working. Without this register nothing ever gets deleted, because nobody can prove what still reads it.
> **Add an entry** when a breaking change lands after the first store release — whatever caused it: a phase feature, an issue fix, or any other update.
> **Statuses:** `deprecated` — released builds may still read it · `removable` — the minimum supported version has been raised above every build that reads it and those builds have stopped calling, so nothing can reach it.
> **Remove an entry** when the thing itself is deleted, in a build session. Git keeps the history.
> **Graduating to `removable`:** follow the graduation steps in the backend building skill. Never mark an entry `removable` from request counts alone.

| What | Kind | Replaced by | Deprecated on | Status |
| --- | --- | --- | --- | --- |
