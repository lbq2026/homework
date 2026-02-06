-- 修复 trigger 已存在错误
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 重新创建触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT '触发器修复完成！' AS status;
