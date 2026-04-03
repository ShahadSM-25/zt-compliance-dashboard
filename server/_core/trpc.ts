import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId } from "../db";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ── Local Dev Mode ────────────────────────────────────────────────────────────
// When OAUTH_SERVER_URL is not set, we run in local dev mode with a mock user.
// This allows testing the dashboard without a real OAuth server.
const LOCAL_DEV_MODE = !process.env.OAUTH_SERVER_URL;

// Fallback user (used only if DB is not ready yet)
const LOCAL_DEV_USER_FALLBACK: User = {
  id: 1,
  openId: "local-dev-user",
  name: "Local Dev User",
  email: "dev@healthcomply.local",
  loginMethod: "local",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

if (LOCAL_DEV_MODE) {
  console.log("[Auth] ⚠️  LOCAL DEV MODE: OAuth is disabled. Using mock admin user.");
}

// Fetch the real local dev user from DB (to get the correct auto-increment id)
async function getLocalDevUser(): Promise<User> {
  try {
    const user = await getUserByOpenId("local-dev-user");
    if (user) return user;
  } catch {
    // DB not ready yet, fall back to hardcoded user
  }
  return LOCAL_DEV_USER_FALLBACK;
}

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  // In local dev mode, fetch the real user from DB (with correct id)
  const user = LOCAL_DEV_MODE ? await getLocalDevUser() : ctx.user;

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // In local dev mode, fetch the real user from DB (with correct id)
    const user = LOCAL_DEV_MODE ? await getLocalDevUser() : ctx.user;

    if (!user || user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user,
      },
    });
  }),
);
