-- 手動執行此 SQL 來修復 email 欄位
-- 將 users 表的 email 欄位改為可選（nullable）

ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
