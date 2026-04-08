# 线上演示版平台说明

本目录为纯前端可部署版本，可直接部署到 GitHub Pages、Netlify、Vercel 或任何静态网站空间。

## 已实现闭环
教师建课 -> 学生扫码进入 -> 上传CSV -> AI提示 -> 小组讨论 -> 报告生成 -> 教师评分反馈

## 演示账号
- 教师：teacher01 / Teacher@123
- 学生：student01 / Student@123
- 管理员：admin01 / Admin@123

## 使用方法
1. 直接双击 `index.html` 可本地打开；
2. 或使用任意静态服务器托管；
3. 部署后将真实公网地址写入 `scripts/generate_qr.py` 或运行：
   `python scripts/generate_qr.py https://your-domain.com/path`
4. 将生成的二维码图片替换到 `assets` 目录，即可形成扫码入口。

## 竞赛建议
- 将本平台作为线上演示版平台；
- 将二维码截图、页面截图插入申报书附件；
- 将课程名称、学校名称、案例名称替换为真实信息；
- 将软著扫描件、课程应用证明、教学成果证明一并提交。
