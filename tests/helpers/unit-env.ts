// Unit tests never touch real services. Provide a valid env so modules that read it load.
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://unit:unit@localhost:5432/unit_never_connected";
process.env.BETTER_AUTH_SECRET ??= "unit-test-secret-0123456789abcdefghijklmnop";
process.env.FIELD_ENCRYPTION_KEYS ??= "v1:MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
process.env.LOG_LEVEL ??= "error";
