CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
    due_date DATE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tasks (title, due_date) VALUES
    ('亲手完成第一次 Git 提交', '2026-10-20'),
    ('跑通 STM32 屏幕显示例程', '2026-10-21'),
    ('完成网页任务管理功能', '2026-10-22'),
    ('验证 Netlify 公网访问与数据保存', '2026-10-23'),
    ('收到 GitHub Actions 发来的第一封邮件', '2026-10-24'),
    ('演示 STM32 专注计时器', '2026-10-25'),
    ('完成三个项目的验收', '2026-10-26'),
    ('整理照片、截图和交付网址', '2026-10-27');
