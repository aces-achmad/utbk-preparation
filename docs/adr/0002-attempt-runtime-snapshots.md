# Attempt runtime snapshots are isolated from active content

Each `Attempt` will store its own runtime snapshot of question text, options, explanation, and randomized order instead of reading live `Question` data during practice or review. We chose this because active content can change through import or manual edits, and allowing those changes to leak into an in-progress or historical attempt would break autosave consistency, review integrity, and the meaning of past results.
