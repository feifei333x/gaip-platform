
from pathlib import Path
import sys
import qrcode

base_url = sys.argv[1] if len(sys.argv) > 1 else "https://your-domain.example/gaip-platform"
base_url = base_url.rstrip("/")
assets = Path(__file__).resolve().parents[1] / "assets"
assets.mkdir(exist_ok=True)

targets = {
    "qr-login.png": f"{base_url}/index.html",
    "qr-task-1.png": f"{base_url}/index.html?role=student&task=1",
    "qr-task-2.png": f"{base_url}/index.html?role=student&task=2",
}
for filename, url in targets.items():
    img = qrcode.make(url)
    img.save(assets / filename)
print(f"已生成 {len(targets)} 个二维码到 {assets}")
