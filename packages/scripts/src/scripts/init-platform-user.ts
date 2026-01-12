#!/usr/bin/env node

// ⚠️ 必須在導入任何其他模組之前導入 reflect-metadata
// 這對於 MikroORM 的裝飾器正常工作至關重要
import "reflect-metadata";

// 確保 reflect-metadata 已經被加載
if (!Reflect || !Reflect.getMetadata) {
  throw new Error("reflect-metadata 未正確加載");
}

import { MikroORM } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import * as readline from "readline";
import * as dotenv from "dotenv";
import {
  User,
  UserRole,
  UserStatus,
  Tenant,
  Agent,
  Customer,
  CommissionPayout,
  RevenueDistribution,
  SystemFeeDistribution,
  SystemWallet,
} from "@saas-platform/database";
import { PasswordService } from "@saas-platform/auth";

// 載入環境變數
dotenv.config();

interface UserInput {
  username: string;
  email?: string;
  password: string;
  name: string;
}

/**
 * 從命令行參數解析輸入
 */
function parseArgs(): Partial<UserInput> {
  const args = process.argv.slice(2);
  const result: Partial<UserInput> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case "--username":
      case "-u":
        result.username = value;
        break;
      case "--email":
      case "-e":
        result.email = value;
        break;
      case "--password":
      case "-p":
        result.password = value;
        break;
      case "--name":
      case "-n":
        result.name = value;
        break;
    }
  }

  return result;
}

/**
 * 交互式輸入提示
 */
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * 安全輸入密碼（不顯示在終端）
 * 注意：在某些環境下可能無法完全隱藏，但會顯示 * 號
 */
function promptPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // 使用 stdin 的原始模式來隱藏輸入
    const wasRaw = process.stdin.isRaw;
    if (!wasRaw) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdout.write(question);

    let password = "";
    const onData = (char: Buffer) => {
      const str = char.toString("utf8");
      switch (str) {
        case "\n":
        case "\r":
        case "\u0004": // Ctrl+D
          process.stdin.setRawMode(wasRaw);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          rl.close();
          resolve(password);
          break;
        case "\u0003": // Ctrl+C
          process.stdin.setRawMode(wasRaw);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          rl.close();
          process.exit(130);
          break;
        case "\u007f": // Backspace
        case "\b": // Backspace (alternative)
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write("\b \b");
          }
          break;
        default:
          // 只接受可打印字符
          if (str.length === 1 && str.charCodeAt(0) >= 32) {
            password += str;
            process.stdout.write("*");
          }
          break;
      }
    };

    process.stdin.on("data", onData);
  });
}

/**
 * 驗證輸入
 */
function validateInput(input: UserInput): string[] {
  const errors: string[] = [];

  if (!input.username || input.username.trim().length === 0) {
    errors.push("用戶名不能為空");
  } else if (input.username.length < 3) {
    errors.push("用戶名至少需要 3 個字符");
  }

  // Email 為可選，但如果提供了則需要驗證格式
  if (input.email && input.email.trim().length > 0) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      errors.push("電子郵件格式不正確");
    }
  }

  if (!input.password || input.password.length === 0) {
    errors.push("密碼不能為空");
  } else if (input.password.length < 8) {
    errors.push("密碼至少需要 8 個字符");
  }

  if (!input.name || input.name.trim().length === 0) {
    errors.push("姓名不能為空");
  }

  return errors;
}

/**
 * 收集用戶輸入（命令行參數 + 交互式補充）
 */
async function collectInput(): Promise<UserInput> {
  const args = parseArgs();
  const input: Partial<UserInput> = { ...args };

  console.log("=== 初始化 Platform User ===\n");

  // 如果缺少參數，使用交互式輸入
  if (!input.username) {
    input.username = await prompt("請輸入用戶名 (username): ");
  }

  if (!input.email) {
    const emailInput = await prompt("請輸入電子郵件 (email，可選，直接按 Enter 跳過): ");
    if (emailInput.trim().length > 0) {
      input.email = emailInput;
    }
  }

  if (!input.password) {
    input.password = await promptPassword("請輸入密碼 (password): ");
    const confirmPassword = await promptPassword("請再次確認密碼: ");
    if (input.password !== confirmPassword) {
      console.error("\n❌ 密碼不一致，請重新執行腳本");
      process.exit(1);
    }
  }

  if (!input.name) {
    input.name = await prompt("請輸入姓名 (name): ");
  }

  return input as UserInput;
}

/**
 * 主函數
 */
async function main() {
  try {
    // 收集輸入
    const input = await collectInput();

    // 驗證輸入
    const errors = validateInput(input);
    if (errors.length > 0) {
      console.error("\n❌ 輸入驗證失敗:");
      errors.forEach((error) => console.error(`  - ${error}`));
      process.exit(1);
    }

    console.log("\n⏳ 正在連接資料庫...");

    // 初始化 MikroORM
    const orm = await MikroORM.init<PostgreSqlDriver>({
      driver: PostgreSqlDriver,
      host: process.env.DB_HOST || process.env.PLATFORM_DB_HOST || "localhost",
      port: parseInt(
        process.env.DB_PORT ||
          process.env.PLATFORM_DB_PORT ||
          "5432"
      ),
      user: process.env.DB_USER || process.env.PLATFORM_DB_USER || "postgres",
      password:
        process.env.DB_PASSWORD ||
        process.env.PLATFORM_DB_PASSWORD ||
        "postgres",
      dbName:
        process.env.DB_NAME ||
        process.env.PLATFORM_DB_NAME ||
        "saas_platform",
      entities: [
        Tenant,
        User,
        Agent,
        Customer,
        CommissionPayout,
        RevenueDistribution,
        SystemFeeDistribution,
        SystemWallet,
      ],
      debug: false,
    });

    console.log("✅ 資料庫連接成功");

    // 檢查用戶是否已存在
    const em = orm.em.fork();
    const queryConditions: any[] = [
      { username: input.username, tenant: null },
    ];
    
    // 如果有 email，也檢查 email 是否已存在
    if (input.email && input.email.trim().length > 0) {
      queryConditions.push({ email: input.email.trim().toLowerCase(), tenant: null });
    }
    
    const existingUser = await em.findOne(User, {
      $or: queryConditions,
    });

    if (existingUser) {
      const conflictField = existingUser.username === input.username ? "用戶名" : "電子郵件";
      console.error(
        `\n❌ 用戶已存在: ${conflictField}已被使用`
      );
      await orm.close();
      process.exit(1);
    }

    console.log("⏳ 正在創建用戶...");

    // Hash 密碼
    const passwordService = new PasswordService();
    const hashedPassword = await passwordService.hashPassword(input.password);

    // 創建用戶
    const user = new User();
    user.username = input.username.trim();
    // 如果沒有提供 email，生成一個基於 username 的預設 email
    user.email = input.email && input.email.trim().length > 0
      ? input.email.trim().toLowerCase()
      : `${input.username.trim().toLowerCase()}@platform.local`;
    user.password = hashedPassword;
    user.name = input.name.trim();
    user.role = UserRole.PLATFORM_ADMIN;
    user.status = UserStatus.ACTIVE;
    user.tenant = null; // Platform Admin 沒有 tenant
    // 如果有提供 email，設為已驗證；否則設為未驗證
    user.emailVerified = !!(input.email && input.email.trim().length > 0);
    if (user.emailVerified) {
      user.emailVerifiedAt = new Date();
    }

    await em.persistAndFlush(user);

    console.log("\n✅ Platform User 創建成功！");
    console.log("\n📋 用戶資訊:");
    console.log(`   ID: ${user.id}`);
    console.log(`   用戶名: ${user.username}`);
    console.log(`   電子郵件: ${user.email}${!input.email || input.email.trim().length === 0 ? " (自動生成)" : ""}`);
    console.log(`   姓名: ${user.name}`);
    console.log(`   角色: ${user.role}`);
    console.log(`   狀態: ${user.status}`);
    console.log(`   Email 已驗證: ${user.emailVerified ? "是" : "否"}`);
    console.log(`   創建時間: ${user.createdAt}`);

    // 關閉連接
    await orm.close();

    console.log("\n🎉 完成！");
  } catch (error) {
    console.error("\n❌ 發生錯誤:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (process.env.DEBUG === "true") {
        console.error("\n詳細錯誤:");
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// 執行主函數
main();
