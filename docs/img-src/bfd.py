import textwrap, glob
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.patches import Rectangle
for f in glob.glob("/usr/share/fonts/opentype/inter/Inter-*.otf"): fm.fontManager.addfont(f)
plt.rcParams["font.family"]="Inter"
INK="#14161A"; GREY="#5B6068"; LINE="#9A9DA3"; ACC="#C2410C"; BG="#FFFFFF"
OUT="../img/"

G=[("1.0","Quản lý hệ thống",["1.1 Đăng ký, đăng nhập, đăng xuất","1.2 Quản lý tài khoản và phân quyền","1.3 Tham số hệ thống và chế độ bảo trì","1.4 Nhật ký thao tác"]),
("2.0","Quản lý danh mục",["2.1 Dịch vụ và giá","2.2 Thuốc và vaccine","2.3 Lịch làm việc của bác sĩ","2.4 Trang giới thiệu bác sĩ"]),
("3.0","Quản lý chủ nuôi và thú cưng",["3.1 Hoàn tất hồ sơ chủ nuôi","3.2 Hồ sơ thú cưng","3.3 Gộp hồ sơ khách vãng lai","3.4 Tra cứu lịch sử khám"]),
("4.0","Quản lý lịch hẹn",["4.1 Xem khung giờ trống","4.2 Đặt lịch","4.3 Đổi lịch","4.4 Hủy lịch","4.5 Xác nhận lịch","4.6 Đánh dấu khách không đến"]),
("5.0","Khám, kê đơn và tiêm phòng",["5.1 Ghi hồ sơ khám","5.2 Kê đơn và trừ kho","5.3 Xem hồ sơ bệnh án","5.4 Ghi mũi tiêm","5.5 Nhắc lịch tiêm"]),
("6.0","Hóa đơn và thanh toán",["6.1 Lập hóa đơn","6.2 Hủy hóa đơn","6.3 Ghi nhận thanh toán","6.4 Theo dõi công nợ"]),
("7.0","Quản lý kho thuốc",["7.1 Nhập kho theo lô","7.2 Xuất kho tự động","7.3 Cảnh báo hết hạn, sắp hết","7.4 Kiểm kê, điều chỉnh tồn"]),
("8.0","Báo cáo và thống kê",["8.1 Doanh thu theo tháng","8.2 Doanh số theo dịch vụ","8.3 Công nợ","8.4 Doanh thu theo ngày"]),
("9.0","Trao đổi nội bộ",["9.1 Nhắn tin nhân viên với admin","9.2 Đánh dấu đã đọc"])]

def box(ax,x,y,w,h,txt,bold=False,fill=BG,fg=INK,fs=9.5,wrap=30,lw=1.1,ec=INK,align="left"):
    ax.add_patch(Rectangle((x,y),w,h,fc=fill,ec=ec,lw=lw))
    t="\n".join(textwrap.wrap(txt,wrap))
    if align=="left": ax.text(x+0.1,y+h/2,t,ha="left",va="center",fontsize=fs,color=fg,fontweight="bold" if bold else "normal",linespacing=1.25)
    else: ax.text(x+w/2,y+h/2,t,ha="center",va="center",fontsize=fs,color=fg,fontweight="bold" if bold else "normal",linespacing=1.25)

def elbow(ax,x0,y0,x1,y1,c=LINE):
    xm=(x0+x1)/2
    ax.plot([x0,xm,xm,x1],[y0,y0,y1,y1],color=c,lw=1,solid_capstyle="butt")

def fig(W,H):
    f=plt.figure(figsize=(W,H),dpi=220,facecolor=BG); ax=f.add_axes([0,0,1,1]); ax.set_xlim(0,W); ax.set_ylim(0,H); ax.axis("off"); return f,ax

# ---- top-down ----
def vline(ax,x,y0,y1,c=LINE): ax.plot([x,x],[y0,y1],color=c,lw=1,solid_capstyle="butt")
def hline(ax,x0,x1,y,c=LINE): ax.plot([x0,x1],[y,y],color=c,lw=1,solid_capstyle="butt")
def wrapn(t,n): return textwrap.wrap(t,n)

# Hinh 2.1 - so do day du
cw=1.62; gap=0.1; mar=0.2; n=9
W=mar*2+n*cw+(n-1)*gap
ind=0.22; kw=cw-ind; fs=8.8
hs=[[0.2+0.18*len(wrapn(k,18)) for k in g[2]] for g in G]
colh=max(sum(h)+0.1*len(h) for h in hs)
gh=0.9; rh=0.7; rw=3.2
H=0.3+rh+0.45+gh+0.3+colh+0.25
f,ax=fig(W,H)
ry=H-0.3-rh
box(ax,(W-rw)/2,ry,rw,rh,"0.0  Quản lý phòng khám thú y Pethy",bold=True,fill=INK,fg="#FFFFFF",wrap=40,fs=11.5,align="center")
ybus=ry-0.25
vline(ax,W/2,ry,ybus)
cx0=mar+cw/2; cxn=mar+(n-1)*(cw+gap)+cw/2
hline(ax,cx0,cxn,ybus)
ygb=ybus-0.2-gh
for i,(num,name,kids) in enumerate(G):
    x=mar+i*(cw+gap)
    vline(ax,x+cw/2,ybus,ygb+gh)
    box(ax,x,ygb,cw,gh,f"{num}\n{name}",bold=True,wrap=16,fs=9.5,align="center")
    y=ygb-0.3; sx=x+0.1; ylast=None
    for k,h in zip(kids,hs[i]):
        yk=y-h
        box(ax,x+ind,yk,kw,h,k,wrap=18,fs=fs,lw=0.9,ec=GREY)
        hline(ax,sx,x+ind,yk+h/2); ylast=yk+h/2; y=yk-0.1
    vline(ax,sx,ygb,ylast)
f.savefig(OUT+"hinh-2-1-bfd-day-du.png",dpi=200); plt.close(f)

# Hinh 2.4 luong
steps=[("Chủ nuôi","Xem khung giờ trống và đặt lịch","Lịch: chờ xác nhận"),
("Lễ tân","Xác nhận lịch","Lịch: đã xác nhận"),
("Bác sĩ","Khám, ghi hồ sơ khám","Hồ sơ khám được lưu"),
("Bác sĩ","Kê đơn; kho tự trừ theo lô gần hết hạn. Lịch tiêm: ghi mũi tiêm","Kho giảm trong cùng giao dịch"),
("Thu ngân","Lập hóa đơn, ghi nhận thanh toán","Hóa đơn: đã thanh toán"),
("Admin","Xem doanh thu và công nợ","Báo cáo theo tháng, theo dịch vụ")]
W=5.4; gap=0.34
lines=[len(textwrap.wrap(w,36)) for _,w,_ in steps]
hs=[0.62+0.2*l for l in lines]
H=0.5+sum(hs)+gap*len(steps)+0.2
f,ax=fig(W,H)
x0=1.2; bw=W-x0-0.2
y=H-0.3
for i,(who,what,st) in enumerate(steps):
    bh=hs[i]; y-=bh
    ax.text(0.2,y+bh/2,who,ha="left",va="center",fontsize=9.5,fontweight="bold",color=INK)
    ax.add_patch(Rectangle((x0,y),bw,bh,fc=BG,ec=INK,lw=1.1))
    ax.text(x0+0.12,y+bh-0.12,f"{i+1}.  "+"\n".join(textwrap.wrap(what,36)),ha="left",va="top",fontsize=9.5,color=INK,linespacing=1.25)
    ax.text(x0+0.12,y+0.1,st,ha="left",va="bottom",fontsize=8.5,color=ACC)
    if i<len(steps)-1:
        ax.annotate("",xy=(x0+bw/2,y-gap+0.02),xytext=(x0+bw/2,y-0.0),arrowprops=dict(arrowstyle="-|>",color=INK,lw=1,mutation_scale=9))
    y-=gap
ax.text(0.2,0.2,"Lễ tân hủy kèm lý do → lịch “đã hủy”. Khách vắng → “không đến”.",fontsize=8,color=GREY,ha="left")
f.savefig(OUT+"hinh-2-2-luong-mot-luot-kham.png"); plt.close(f)
