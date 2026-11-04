/** 家长中心孩子管理弹窗的表单校验（纯函数，返回 null 表示通过） */

export function validateChildProfileForm(username: string): string | null {
  if (!username.trim()) return '昵称不能为空';
  return null;
}

export function validateResetPasswordForm(password: string, confirmPassword: string): string | null {
  if (password.length < 6) return '密码至少需要 6 位';
  if (password !== confirmPassword) return '两次输入的密码不一致';
  return null;
}

export function validateBindEmailForm(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return '请输入孩子登录邮箱';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return '邮箱格式不正确';
  return null;
}
