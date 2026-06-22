import { execSync } from 'child_process';

const envVars = {
  NEXTAUTH_URL: "https://churn-dashboard-kappa.vercel.app",
  NEXTAUTH_SECRET: "hQEhxNJKBlpm7r0AjPAR20wqmbk7tMZF5ceKSiVxdsU=",
  TURSO_DATABASE_URL: "libsql://churn-dashboard-hari-007.aws-ap-south-1.turso.io"
};

const environments = ['production', 'preview', 'development'];

for (const [key, value] of Object.entries(envVars)) {
  console.log(`\n--- Processing ${key} ---`);
  for (const env of environments) {
    try {
      console.log(`Removing ${key} from ${env}...`);
      execSync(`npx vercel env rm ${key} ${env} -y`, { stdio: 'ignore' });
    } catch (e) {
      console.log(`  (Note: could not remove ${key} from ${env}, or it didn't exist)`);
    }
    try {
      console.log(`Adding corrected ${key} to ${env}...`);
      // Use bash pipeline to feed the exact string to vercel cli without trailing newline
      execSync(`printf "%s" "${value}" | npx vercel env add ${key} ${env}`, { stdio: 'inherit' });
    } catch (e) {
      console.error(`  ERROR: Failed to add ${key} for ${env}`);
    }
  }
}

console.log("\nFinished updating Vercel environment variables.");
