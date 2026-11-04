import { describe, it, expect } from 'vitest';
import {
  validateChildProfileForm,
  validateResetPasswordForm,
  validateBindEmailForm,
} from '../childFormValidation';

describe('validateChildProfileForm', () => {
  it('空昵称返回错误', () => {
    expect(validateChildProfileForm('   ')).toBe('昵称不能为空');
  });
  it('合法昵称返回 null', () => {
    expect(validateChildProfileForm('小宝')).toBeNull();
  });
});

describe('validateResetPasswordForm', () => {
  it('密码少于 6 位返回错误', () => {
    expect(validateResetPasswordForm('abc12', 'abc12')).toBe('密码至少需要 6 位');
  });
  it('两次输入不一致返回错误', () => {
    expect(validateResetPasswordForm('abcdef', 'abcdeg')).toBe('两次输入的密码不一致');
  });
  it('合法密码返回 null', () => {
    expect(validateResetPasswordForm('abcdef', 'abcdef')).toBeNull();
  });
});

describe('validateBindEmailForm', () => {
  it('空邮箱返回错误', () => {
    expect(validateBindEmailForm('  ')).toBe('请输入孩子登录邮箱');
  });
  it('不含 @ 返回错误', () => {
    expect(validateBindEmailForm('not-an-email')).toBe('邮箱格式不正确');
  });
  it('合法邮箱返回 null', () => {
    expect(validateBindEmailForm('kid@example.com')).toBeNull();
  });
});
