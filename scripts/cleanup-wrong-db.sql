-- 清理錯誤創建的租戶資料庫
-- 執行前請確認這是錯誤的資料庫！

-- 1. 先斷開所有連接
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'tenant_test_001'
  AND pid <> pg_backend_pid();

-- 2. 刪除資料庫
DROP DATABASE IF EXISTS tenant_test_001;

-- 驗證：查看剩餘的租戶資料庫
SELECT datname FROM pg_database WHERE datname LIKE 'tenant%' ORDER BY datname;
