import textwrap, glob
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.patches import Rectangle
for f_ in glob.glob("/usr/share/fonts/opentype/inter/Inter-*.otf"): fm.fontManager.addfont(f_)
plt.rcParams["font.family"]="Inter"
INK="#14161A"; GREY="#5B6068"; LINE="#9A9DA3"; ACC="#C2410C"; BG="#FFFFFF"
OUT="../img/"
roles=[("Chủ nuôi",["Tổng quan","Lịch của tôi","Thú cưng","Hóa đơn","Đặt lịch mới"]),
("Lễ tân",["Lịch trong ngày","Đặt lịch hộ","Khách hàng","Việc cần nhắc"]),
("Bác sĩ",["Lịch khám của tôi","Lịch làm việc","Hồ sơ giới thiệu"]),
("Thủ kho",["Tồn kho","Nhập kho","Lịch sử biến động","Danh mục thuốc"]),
("Admin",["Tổng quan","Doanh thu","Tài khoản","Dịch vụ và giá","Lịch làm việc","Tham số hệ thống","Nhật ký thao tác","Trao đổi nội bộ"]),
("Thu ngân",["Chờ thanh toán","Hóa đơn đã lập","Thu hôm nay"])]
W=5.4; cw=1.65; gap=0.1; mar=0.2
ih=0.3; ig=0.07; hh=0.5
def colh(items): return hh+0.15+len(items)*(ih+ig)
rows=[roles[0:3],roles[3:6]]
rowh=[max(colh(i) for _,i in r) for r in rows]
H=0.3+0.55+0.3+0.55+0.35+rowh[0]+0.5+rowh[1]+0.3
f=plt.figure(figsize=(W,H),dpi=220,facecolor=BG); ax=f.add_axes([0,0,1,1]); ax.set_xlim(0,W); ax.set_ylim(0,H); ax.axis("off")
def box(x,y,w,h,t,bold=False,fill=BG,fg=INK,ec=INK,lw=1.1,fs=9,ls="-"):
    ax.add_patch(Rectangle((x,y),w,h,fc=fill,ec=ec,lw=lw,ls=ls))
    ax.text(x+w/2,y+h/2,t,ha="center",va="center",fontsize=fs,color=fg,fontweight="bold" if bold else "normal")
def arrow(y0,y1): ax.annotate("",xy=(W/2,y1),xytext=(W/2,y0),arrowprops=dict(arrowstyle="-|>",color=INK,lw=1,mutation_scale=9))
y=H-0.3-0.55
box(0.9,y,W-1.8,0.55,"Trang chủ công khai: dịch vụ, bác sĩ, giờ trống",True,fill=INK,fg="white",fs=9.2)
arrow(y,y-0.3); y2=y-0.3-0.55
box(1.7,y2,W-3.4,0.55,"Đăng nhập (theo vai trò)",True)
y=y2
cur=y
busys=[]
for r,grp in enumerate(rows):
    ybus=cur-0.35
    busys.append(ybus)
    if r==0: ax.plot([W/2,W/2],[cur,ybus],color=LINE,lw=1)
    xs=[mar+i*(cw+gap) for i in range(3)]
    ax.plot([0.08 if r==1 else xs[0]+cw/2,xs[2]+cw/2],[ybus,ybus],color=LINE,lw=1)
    if r==0: ax.plot([0.08,xs[0]+cw/2],[ybus,ybus],color=LINE,lw=1)
    for (name,items),x in zip(grp,xs):
        ax.plot([x+cw/2]*2,[ybus,ybus-0.15],color=LINE,lw=1)
        top=ybus-0.15
        missing=False
        box(x,top-hh,cw,hh,name,True,fill="#F3F3F0",ls="--" if missing else "-",ec=GREY if missing else INK)
        yy=top-hh-0.12
        for it in items:
            box(x+0.08,yy-ih,cw-0.16,ih,it,False,ec=GREY,lw=0.9,fs=8.3,fg=ACC if missing else INK,ls="--" if missing else "-")
            yy-=ih+ig
    cur=ybus-0.15-rowh[r]-0.2
    if r==0:
        # trunk to next row
        pass
ax.plot([0.08,0.08],[busys[0],busys[1]],color=LINE,lw=1)
f.savefig(OUT+"hinh-6-1-dieu-huong-theo-vai-tro.png"); plt.close(f)
