import requests
from bs4 import BeautifulSoup
import sys

url = "https://jianqiaoxu.xyz/"

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

try:
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    print(f"状态码: {response.status_code}")
    print(f"编码: {response.encoding}")
    print("\n=== 标题 ===")
    print(soup.title.string if soup.title else "无标题")

    print("\n=== meta 描述 ===")
    meta_desc = soup.find("meta", attrs={"name": "description"})
    print(meta_desc["content"] if meta_desc else "无")

    print("\n=== h1 标题 ===")
    for h1 in soup.find_all("h1"):
        print(f"- {h1.get_text(strip=True)}")

    print("\n=== 导航链接 ===")
    nav = soup.find("nav")
    if nav:
        for a in nav.find_all("a", href=True):
            print(f"- {a.get_text(strip=True)}: {a['href']}")
    else:
        for a in soup.find_all("a", href=True)[:10]:
            print(f"- {a.get_text(strip=True)}: {a['href']}")

    print("\n=== 主要文本内容 ===")
    main = soup.find("main") or soup.find("body")
    if main:
        # 移除 script 和 style 标签
        for tag in main.find_all(["script", "style"]):
            tag.decompose()
        text = main.get_text(separator="\n", strip=True)
        print(text[:2000])  # 限制输出长度

    print("\n=== 所有外部链接 ===")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("http"):
            print(f"- {href}")

except requests.exceptions.RequestException as e:
    print(f"请求失败: {e}", file=sys.stderr)
