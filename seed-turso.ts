import fs from 'fs';
import readline from 'readline';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import "dotenv/config";
import _dotenv from "dotenv";

_dotenv.config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN!;

const libsql = createClient({ url, authToken });
const adapter = new PrismaLibSql({ url, authToken });
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log("Connecting to Turso:", url);
  
  const metricsPath = './ml_churn_prediction/models/metrics.json';
  if (fs.existsSync(metricsPath)) {
    console.log("Seeding ModelMetrics...");
    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    await prisma.modelMetrics.create({
      data: {
        version: `v${Date.now()}`,
        accuracy: metrics.accuracy,
        precision: metrics.precision,
        recall: metrics.recall,
        f1Score: metrics.f1_score,
        rocAuc: metrics.roc_auc,
        trainedAt: new Date(metrics.trained_at || Date.now())
      }
    });
    console.log("✅ ModelMetrics seeded.");
  }

  const csvPath = './ml_churn_prediction/predictions.csv';
  if (!fs.existsSync(csvPath)) {
    console.error("CSV not found:", csvPath);
    return;
  }

  console.log("Reading and seeding Customers from", csvPath);
  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isHeader = true;
  let headers: string[] = [];
  let batch: any[] = [];
  let totalInserted = 0;
  
  for await (const line of rl) {
    if (isHeader) {
      headers = line.split(',');
      isHeader = false;
      continue;
    }
    
    const values = line.split(',');
    if (values.length !== headers.length) continue;
    
    const row: any = {};
    headers.forEach((h, i) => { row[h.trim()] = values[i].trim(); });

    batch.push({
      id: row.CustomerID,
      tenure: parseInt(row.Tenure_Months),
      orderFreqMonth: parseFloat(row.Order_Freq_Month),
      discountUsagePct: parseFloat(row.Discount_Usage_Pct),
      avgRating: parseFloat(row.Avg_Rating),
      paymentFailures: parseInt(row.Payment_Failures),
      supportCalls: parseInt(row.Support_Calls),
      competitorOffers: parseInt(row.Competitor_Offers_Clicked),
      avgDeliveryTime: parseFloat(row.Avg_Delivery_Time),
      lateDeliveries: parseInt(row.Late_Deliveries),
      churnProbability: parseFloat(row.churn_probability),
      riskLevel: row.risk_level,
      predictedChurn: parseInt(row.predicted_churn),
      monthlyCharges: parseFloat(row.Monthly_Charges),
      contractType: row.Contract_Type,
      paymentMethod: row.Payment_Method,
      predictedRevLoss: parseFloat(row.predicted_rev_loss),
      lifetimeValue: parseFloat(row.lifetime_value),
      discountDependency: parseFloat(row.discount_dependency),
      engagementScore: parseFloat(row.engagement_score),
      paymentReliability: parseFloat(row.payment_reliability),
      orderFreqTrend: parseFloat(row.order_freq_trend),
      competitorExposure: parseFloat(row.competitor_exposure),
      predictedAt: new Date()
    });

    if (batch.length >= 100) {
      await prisma.customer.createMany({
        data: batch
      });
      totalInserted += batch.length;
      console.log(`Inserted ${totalInserted} customers...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await prisma.customer.createMany({
      data: batch
    });
    totalInserted += batch.length;
  }

  console.log(`✅ Successfully inserted ${totalInserted} customers into Turso.`);
}

seed()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
