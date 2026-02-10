import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // WeChat OAuth - custom provider
    {
      id: "wechat",
      name: "微信",
      type: "oauth",
      authorization: {
        url: "https://open.weixin.qq.com/connect/qrconnect",
        params: {
          appid: process.env.WECHAT_APP_ID,
          scope: "snsapi_login",
          response_type: "code",
        },
      },
      token: "https://api.weixin.qq.com/sns/oauth2/access_token",
      userinfo: "https://api.weixin.qq.com/sns/userinfo",
      clientId: process.env.WECHAT_APP_ID,
      clientSecret: process.env.WECHAT_APP_SECRET,
      profile(profile) {
        return {
          id: profile.unionid || profile.openid,
          name: profile.nickname,
          image: profile.headimgurl,
        };
      },
    },
    // Email + Password
    Credentials({
      id: "credentials",
      name: "邮箱密码",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.password
        );
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    // Phone SMS - custom credentials provider
    Credentials({
      id: "phone-sms",
      name: "手机验证码",
      credentials: {
        phone: { label: "手机号", type: "tel" },
        code: { label: "验证码", type: "text" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone as string;
        const code = credentials?.code as string;
        if (!phone || !code) return null;

        // Verify SMS code (stored in DB or cache)
        const verification = await prisma.verificationToken.findFirst({
          where: {
            identifier: `phone:${phone}`,
            token: code,
            expires: { gt: new Date() },
          },
        });

        if (!verification) return null;

        // Delete used verification token
        await prisma.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: verification.identifier,
              token: verification.token,
            },
          },
        });

        // Find or create user
        let user = await prisma.user.findUnique({ where: { phone } });
        if (!user) {
          user = await prisma.user.create({
            data: { phone, name: `用户${phone.slice(-4)}` },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After sign in, redirect to dashboard if onboarded, otherwise onboarding
      if (url.startsWith(baseUrl)) return url;
      return baseUrl + "/overview";
    },
  },
});
