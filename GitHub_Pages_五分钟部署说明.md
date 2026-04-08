# GitHub Pages 五分钟部署说明

## 适用范围
本包适用于 GitHub Pages 静态部署。部署后会自动识别站点地址，无需手动修改 `app.js` 中的 BASE_URL。

## 部署步骤
1. 登录 GitHub，新建一个 **public** 仓库，例如：`gaip-platform`。
2. 将本目录全部文件上传到仓库根目录。
3. 进入仓库 **Settings → Pages**。
4. 在 **Build and deployment** 中选择：
   - **Source**: Deploy from a branch
   - **Branch**: `main`
   - **Folder**: `/ (root)`
5. 保存后，等待 GitHub Pages 发布完成。
6. 公网地址通常为：`https://你的用户名.github.io/仓库名/`
7. 发布成功后，在本目录 `scripts` 下运行：
   ```bash
   python generate_qr.py https://你的用户名.github.io/仓库名/
   ```
8. 生成的二维码图片会输出到 `assets` 目录，可直接插入申报书和操作手册。

## 建议保留的演示账号
- 教师：`teacher01 / Teacher@123`
- 学生：`student01 / Student@123`
- 管理员：`admin01 / Admin@123`

## 适合提交的截图
- 登录页（带网址栏）
- 教师任务页（带二维码）
- 学生上传分析页
- AI 提示与报告生成页
- 教师评分反馈页