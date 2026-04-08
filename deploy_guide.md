# 快速上线建议

## 方案一：GitHub Pages
适用于纯前端示范平台。将本目录上传到 GitHub 仓库后，在 Pages 中选择 `main` 分支发布。

## 方案二：Netlify / Vercel
拖拽本目录即可发布。发布后获得公网地址，例如：
`https://your-project.netlify.app`

## 发布后操作
1. 将公网地址复制出来；
2. 运行：
   `python scripts/generate_qr.py https://your-project.netlify.app`
3. 把生成的二维码图片放在申报书附件中；
4. 在登录页、教师任务页中同步填写真实公网链接。
