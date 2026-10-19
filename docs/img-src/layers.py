import textwrap, glob
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.patches import Rectangle
for f_ in glob.glob("/usr/share/fonts/opentype/inter/Inter-*.otf"): fm.fontManager.addfont(f_)
plt.rcParams["font.family"]="Inter"
INK="#14161A"; GREY="#5B6068"; ACC="#C2410C"; BG="#FFFFFF"
OUT="../img/"
W=5.4
layers=[("Lớp 1 · Ứng dụng (trình duyệt)","Hiển thị bằng textContent, tiêu đề bảo mật, CSP, không để bí mật ở giao diện","Cần viết mã và cấu hình",False),
("Lớp 2 · Biên (Cloudflare)","CDN, giảm DDoS, ép HTTPS, luật giới hạn tần suất","Cần cấu hình khi triển khai",False),
("Lớp 3 · Xác thực (Supabase Auth)","Giới hạn theo IP, CAPTCHA, xác nhận email, SMTP riêng, xác thực hai lớp cho admin","Cần cấu hình khi triển khai",False),
("Lớp 4 · Dữ liệu (PostgreSQL)","RLS, quyền theo cột, hàm nghiệp vụ, giới hạn gọi, bảng chỉ thêm, nhật ký xem hồ sơ","Đã làm, 279 kiểm thử đạt",True)]
bh=1.15; gap=0.4
H=0.3+0.7+0.35+len(layers)*(bh+gap)+0.1
f=plt.figure(figsize=(W,H),dpi=220,facecolor=BG); ax=f.add_axes([0,0,1,1]); ax.set_xlim(0,W); ax.set_ylim(0,H); ax.axis("off")
y=H-0.3-0.55
ax.add_patch(Rectangle((1.2,y),W-2.4,0.55,fc=INK,ec=INK)); ax.text(W/2,y+0.275,"Yêu cầu từ người dùng hoặc kẻ tấn công",color="white",fontsize=9.5,ha="center",va="center",fontweight="bold")
prev=y
for (t,s,st,done) in layers:
    ytop=prev-0.35
    ax.annotate("",xy=(W/2,ytop),xytext=(W/2,prev),arrowprops=dict(arrowstyle="-|>",color=INK,lw=1,mutation_scale=9))
    yb=ytop-bh
    ax.add_patch(Rectangle((0.3,yb),W-0.6,bh,fc="#F3F3F0" if done else BG,ec=INK,lw=1.6 if done else 1.1))
    ax.text(0.45,yb+bh-0.15,t,fontsize=10,fontweight="bold",va="top",color=INK)
    ax.text(0.45,yb+bh-0.43,"\n".join(textwrap.wrap(s,52)),fontsize=8.6,va="top",color=GREY,linespacing=1.3)
    ax.text(0.45,yb+0.12,st,fontsize=8.6,va="bottom",color=ACC if not done else INK,fontweight="bold" if done else "normal")
    prev=yb
f.savefig(OUT+"hinh-5-1-bon-lop-phong-thu.png"); plt.close(f)
