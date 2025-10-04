-- Supabase 演示种子数据（CNY 为主，包含收入与支出）
insert into public.transactions (type, category, amount, note, date, currency) values
('income','salary',8000,'十月工资','2025-10-01','CNY'),
('expense','food',36,'午餐','2025-10-03','CNY'),
('expense','entertainment',120,'电影','2025-10-05','CNY'),
('expense','transport',8,'地铁','2025-10-05','CNY'),
('expense','daily',68,'超市杂货','2025-10-06','CNY'),
('expense','subscription',25,'流媒体','2025-10-08','CNY'),
('expense','rent',3000,'房租','2025-10-10','CNY'),
('expense','utilities',180,'电费','2025-10-12','CNY'),
('income','salary',8000,'九月工资','2025-09-01','CNY'),
('expense','food',28,'晚餐','2025-09-03','CNY'),
('expense','entertainment',90,'KTV','2025-09-07','CNY');

