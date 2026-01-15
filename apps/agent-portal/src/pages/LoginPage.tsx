import { useState, useEffect } from "react";
import { useLogin } from "@refinedev/core";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import { Label } from "@saas-platform/ui";
import { Checkbox } from "@saas-platform/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@saas-platform/ui";
import { Lock, User, Users, AlertCircle } from "lucide-react";

export default function LoginPage() {
  // 設置頁面標題
  useEffect(() => {
    document.title = "登入 - 代理商後台";
  }, []);

  const { mutate: login, isPending } = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 從 localStorage 恢復記住的用戶名
  useEffect(() => {
    const savedUsername = localStorage.getItem("agent_portal_username");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 處理記住我功能
    if (rememberMe) {
      localStorage.setItem("agent_portal_username", username);
    } else {
      localStorage.removeItem("agent_portal_username");
    }

    login(
      {
        username,
        password,
      },
      {
        onError: (error: any) => {
          setError(
            error?.error?.message ||
              error?.message ||
              "登入失敗，請檢查您的帳號和密碼"
          );
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo 和標題區域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <Users className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            代理商後台
          </h1>
          <p className="text-muted-foreground">請登入以繼續使用系統</p>
        </div>

        {/* 登入表單卡片 */}
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">登入</CardTitle>
            <CardDescription className="text-center">
              輸入您的帳號和密碼以存取系統
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">帳號</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="請輸入帳號"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError(null);
                    }}
                    required
                    className="pl-10"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="請輸入密碼"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    required
                    className="pl-10"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked === true)
                    }
                  />
                  <Label
                    htmlFor="remember-me"
                    className="text-sm font-normal cursor-pointer text-muted-foreground"
                  >
                    記住我
                  </Label>
                </div>
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => {
                    // TODO: 實作忘記密碼功能
                    alert("忘記密碼功能開發中");
                  }}
                >
                  忘記密碼？
                </button>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isPending}
              >
                {isPending ? "登入中..." : "登入"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 底部資訊 */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2024 SaaS Platform. 保留所有權利。
        </p>
      </div>
    </div>
  );
}
