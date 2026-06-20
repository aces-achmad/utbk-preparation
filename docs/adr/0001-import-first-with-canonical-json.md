# Import-first with canonical JSON contract

We are making content ingestion `import-first`: questions, subjects, and topics enter the system primarily through a strict canonical JSON payload that is validated, previewed, and committed via `Import Session`. We chose this over web-first authoring or multiple input formats because the project is internal, content will be prepared outside the app, and a single stable contract gives us a cleaner seam for validation, upsert by `external_id`, audit, and future tooling.
