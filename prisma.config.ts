// In this environment, "prisma/config" might not be available in node_modules.
// We use a local defineConfig wrapper to maintain the structure and provide flexibility.
const defineConfig = (config: any) => config;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
});
