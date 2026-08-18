import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../../prisma/lib/prisma";
import { admin } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },
  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    },
    additionalFields: {
      isActive: {
        type: "boolean",
        defaultValue: true,
        input: false, // Prevent users from changing this during sign-up
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [
    admin({ adminUserIds: ["6QvZE3E2qKvQApVvStyieaOHbNZk2Poz"] }), 
  ],

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      console.log('inside the hook from : ', ctx.path);
      
      if (ctx.path === "/sign-in/email") {
        const body = ctx.body as { email?: string };

        if (body?.email) {
          const user = await prisma.user.findUnique({
            where: { email: body.email },
            select: { isActive: true },
          });
          console.log('inside the userin the hook', user);

          if (user && user.isActive === false) { 
            console.log('inside the user inactive in the hook');
            throw new Error("This account has been deactivated.");

          }
        }
      }
    }),
  },
});
