# Company account password visibility

Managers can explicitly reveal a company account password through the CSRF-protected POST /api/work/users/:id/reveal-password route. Each access is audited without the password. Ordinary user/state responses never include ciphertext or plaintext. The UI hides a revealed password after 30 seconds.

Passwords remain scrypt-hashed for authentication. From this release, creation, administrator reset and self-service changes also store AES-256-GCM ciphertext bound to the account ID. Existing hashes are not recoverable and are not migrated or reset automatically. Users are informed on password change screens that managers can view company passwords.

The 32-byte key is generated with exclusive creation and mode 0600 at DATA_DIR/.password-vault.key, or HQ_PASSWORD_VAULT_KEY_FILE when configured. Keep this persistent file across deployments. Preserve a separate restricted backup alongside the existing database recovery procedure. It is not included in the downloadable SQLite backup. Restore the original key with the database; startup refuses to silently generate a new key when encrypted passwords exist. Never commit or share the key. A lost key does not reveal existing passwords; recovery requires restoring it or an explicit password reset/migration procedure.
