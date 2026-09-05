import urllib.request
import json
import io

token = "8907079812:AAF2K8UmXDWYbM2D668Ea45UIh0AO6dGsU0"
group_id = "-1003509251885"
photo_url = "https://i.pinimg.com/736x/87/46/7d/87467dc014cf05c6d3df399c75525fc9.jpg"

req = urllib.request.Request(photo_url, headers={"User-Agent": "Mozilla/5.0"})
img_bytes = urllib.request.urlopen(req).read()
print(f"Downloaded img_bytes: {len(img_bytes)} bytes")

boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = io.BytesIO()
body.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n{group_id}\r\n".encode("utf-8"))
body.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"caption\"\r\n\r\nTest caption\r\n".encode("utf-8"))
body.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"poster.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".encode("utf-8"))
body.write(img_bytes)
body.write(f"\r\n--{boundary}--\r\n".encode("utf-8"))

req_tg = urllib.request.Request(
    f"https://api.telegram.org/bot{token}/sendPhoto",
    data=body.getvalue(),
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
)
try:
    with urllib.request.urlopen(req_tg) as resp:
        print("SUCCESS:", resp.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code, e.read().decode("utf-8"))
