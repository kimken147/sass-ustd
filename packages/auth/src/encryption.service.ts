import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

/**
 * 加密服務
 * 用於加密/解密敏感資訊（如私鑰）
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 64; // 512 bits
  private readonly tagLength = 16; // 128 bits
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    // 從環境變數獲取加密密鑰
    const envKey = this.configService.get<string>("ENCRYPTION_KEY");
    if (!envKey) {
      throw new Error(
        "ENCRYPTION_KEY 環境變數未設定。請設定一個 32 字節（64 個十六進制字符）的密鑰。"
      );
    }

    // 將環境變數中的密鑰轉換為 Buffer
    // 如果提供的是 hex 字串，直接使用；否則使用 SHA-256 哈希
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      this.encryptionKey = Buffer.from(envKey, "hex");
    } else {
      // 如果不是 hex 格式，使用 SHA-256 哈希
      this.encryptionKey = crypto
        .createHash("sha256")
        .update(envKey)
        .digest();
    }

    if (this.encryptionKey.length !== this.keyLength) {
      throw new Error(
        `加密密鑰長度必須為 ${this.keyLength} 字節（${this.keyLength * 2} 個十六進制字符）`
      );
    }
  }

  /**
   * 加密字串
   * @param plaintext 明文
   * @returns 加密後的字符串（格式：iv:tag:encryptedData，都是 base64 編碼）
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return "";
    }

    try {
      // 生成隨機 IV
      const iv = crypto.randomBytes(this.ivLength);

      // 創建加密器
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );

      // 加密
      let encrypted = cipher.update(plaintext, "utf8");
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // 獲取認證標籤
      const tag = cipher.getAuthTag();

      // 組合：iv:tag:encryptedData（都是 base64）
      const ivBase64 = iv.toString("base64");
      const tagBase64 = tag.toString("base64");
      const encryptedBase64 = encrypted.toString("base64");

      return `${ivBase64}:${tagBase64}:${encryptedBase64}`;
    } catch (error) {
      throw new Error(`加密失敗: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 解密字串
   * @param ciphertext 密文（格式：iv:tag:encryptedData）
   * @returns 解密後的明文
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) {
      return "";
    }

    try {
      // 解析密文格式：iv:tag:encryptedData
      const parts = ciphertext.split(":");
      if (parts.length !== 3) {
        throw new Error("無效的密文格式");
      }

      const [ivBase64, tagBase64, encryptedBase64] = parts;

      // 解碼 base64
      const iv = Buffer.from(ivBase64, "base64");
      const tag = Buffer.from(tagBase64, "base64");
      const encrypted = Buffer.from(encryptedBase64, "base64");

      // 創建解密器
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );

      // 設置認證標籤
      decipher.setAuthTag(tag);

      // 解密
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString("utf8");
    } catch (error) {
      throw new Error(`解密失敗: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 檢查字串是否已加密（簡單檢查格式）
   */
  isEncrypted(text: string): boolean {
    if (!text) {
      return false;
    }
    // 檢查是否符合加密格式：iv:tag:encryptedData（都是 base64）
    const parts = text.split(":");
    return parts.length === 3 && parts.every((part) => {
      try {
        Buffer.from(part, "base64");
        return true;
      } catch {
        return false;
      }
    });
  }
}
