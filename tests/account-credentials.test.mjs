import assert from "node:assert/strict";
import test from "node:test";

const { AccountCredentials } = await import(
  "../src/lib/security/account-credentials.ts"
);

test("sign-in accepts an omitted name", () => {
  const parsed = AccountCredentials.safeParse({
    mode: "signin",
    email: "USER@EXAMPLE.COM",
    password: "password123",
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.email, "user@example.com");
    assert.equal("name" in parsed.data, false);
  }
});

test("sign-in remains compatible with clients that send a null name", () => {
  const parsed = AccountCredentials.safeParse({
    mode: "signin",
    name: null,
    email: "user@example.com",
    password: "password123",
  });

  assert.equal(parsed.success, true);
});

test("account creation still requires a valid name", () => {
  const missing = AccountCredentials.safeParse({
    mode: "create",
    email: "user@example.com",
    password: "password123",
  });
  const valid = AccountCredentials.safeParse({
    mode: "create",
    name: "Akiiro User",
    email: "user@example.com",
    password: "password123",
  });

  assert.equal(missing.success, false);
  assert.equal(valid.success, true);
});
