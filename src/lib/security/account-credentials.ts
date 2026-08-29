import { z } from "zod";

const Email = z
  .string()
  .trim()
  .email()
  .max(200)
  .transform((value) => value.toLowerCase());
const Password = z.string().min(8).max(200);

export const AccountCredentials = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("signin"),
    email: Email,
    password: Password,
  }),
  z.object({
    mode: z.literal("create"),
    name: z.string().trim().min(2).max(80),
    email: Email,
    password: Password,
  }),
]);
