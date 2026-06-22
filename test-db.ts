import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });


async function test() {
  const url = 'file:./dev.db';
  const authToken = undefined;

  console.log("Testing connection to:", url);

  try {
    const client = createClient({ url, authToken });
    const adapter = new PrismaLibSql({ url, authToken });
    const prisma = new PrismaClient({ adapter });

    const users = await prisma.user.findMany();
    console.log("Users found:", users.length);
    console.log("User emails:", users.map(u => u.email));

    const demoUser = users.find(u => u.email === 'demo@datasync.app');
    if (demoUser) {
      console.log("Demo user exists!");
      const bcrypt = await import('bcryptjs');
      const isMatch = await bcrypt.compare('Demo@1234', demoUser.password!);
      console.log("Password 'Demo@1234' matches hash:", isMatch);
    } else {
      console.log("Demo user NOT found.");
    }

  } catch (error) {
    console.error("Database test failed:", error);
  }
}

test();
