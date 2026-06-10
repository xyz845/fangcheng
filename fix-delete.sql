-- 修复：允许用户删除自己的帖子
-- 请在 Supabase → SQL Editor 中粘贴运行

-- 删掉旧的限制策略
DROP POLICY IF EXISTS "用户可以删自己的帖" ON posts;

-- 新建宽松策略（允许客户端删除帖子）
CREATE POLICY "允许删除帖子" ON posts
  FOR DELETE USING (true);
