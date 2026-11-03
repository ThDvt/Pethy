import glob, textwrap
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.patches import Rectangle, Ellipse, FancyBboxPatch
for f_ in glob.glob("/usr/share/fonts/opentype/inter/Inter-*.otf"): fm.fontManager.addfont(f_)
plt.rcParams["font.family"]="Inter"
INK="#14161A"; GREY="#5B6068"; LINE="#9A9DA3"; ACC="#C2410C"; SOFT="#F5EEE8"; OUT="../img/"
def fig(W,H):
    f=plt.figure(figsize=(W,H),dpi=200,facecolor="white"); ax=f.add_axes([0,0,1,1]); ax.set_xlim(0,W); ax.set_ylim(0,H); ax.axis("off"); return f,ax
def seg(ax,a,b,c=LINE,ls="-",lw=0.9,arrow=False,z=1):
    if arrow: ax.annotate("",xy=b,xytext=a,arrowprops=dict(arrowstyle="-|>",color=c,lw=lw,ls=ls,mutation_scale=9,shrinkA=0,shrinkB=0),zorder=z)
    else: ax.plot([a[0],b[0]],[a[1],b[1]],color=c,lw=lw,ls=ls,zorder=z)
def ell(ax,cx,cy,t,w=2.9,h=0.46):
    ax.add_patch(Ellipse((cx,cy),w,h,fc="white",ec=INK,lw=1,zorder=3)); ax.text(cx,cy,t,ha="center",va="center",fontsize=8.6,color=INK,zorder=4)
def actor(ax,x,y,t):
    ax.add_patch(Rectangle((x-0.7,y-0.25),1.4,0.5,fc=SOFT,ec=INK,lw=1.3,zorder=3)); ax.text(x,y,t,ha="center",va="center",fontsize=9.5,fontweight="bold",color=INK,zorder=4)
def usecase(name,groups,extra,fname,W=10.6,title="Hệ thống Pethy"):
    step=0.62; n=sum(len(g[1]) for g in groups)+len(groups)*0.5
    H=n*step+1.0; f,ax=fig(W,H)
    ax.add_patch(FancyBboxPatch((3.0,0.25),W-3.3,H-0.5,boxstyle="round,pad=0,rounding_size=0.12",fc="white",ec=INK,lw=1.3))
    ax.text(3.2,H-0.45,title,fontsize=10.5,fontweight="bold",va="center",color=INK)
    y=H-0.95; pos={}
    for actor_name,items in groups:
        ys=[]
        for it in items:
            ell(ax,5.5,y,it); ys.append(y); pos[it]=(5.5,y); y-=step
        cy=sum(ys)/len(ys); 
        for yy in ys: seg(ax,(1.5,cy),(5.5-1.45*0.96,yy))
        actor(ax,0.9,cy,actor_name); y-=step*0.5
    for a,b,lab in extra:
        xa,ya=pos[a]; xb,yb=pos[b]; xr=8.2 if lab=="include" else 8.2
        # route to the right
        seg(ax,(xa+1.45,ya),(xr,ya),ACC,"--"); seg(ax,(xr,ya),(xr,yb),ACC,"--"); seg(ax,(xr,yb),(xb+1.45,yb),ACC,"--",arrow=True)
        ax.text(xr+0.1,(ya+yb)/2,"«%s»"%lab,fontsize=8,color=ACC,va="center")
    f.savefig(OUT+fname,dpi=200); plt.close(f)
usecase("a",[("Khách",["Xem trang chủ, dịch vụ, bác sĩ","Đọc tin tức","Đăng ký tài khoản","Xác nhận email"]),
 ("Chủ nuôi",["Đăng nhập, đăng xuất, quên mật khẩu","Quản lý thú cưng của mình","Đặt lịch khám, tiêm","Xem khung giờ trống","Đổi, hủy lịch","Xem hóa đơn, hồ sơ khám","Gửi đánh giá"]),
 ("Lễ tân",["Tạo khách trực tiếp và thú cưng","Đặt lịch hộ khách","Xác nhận, từ chối lịch","Đánh dấu khách không đến","Xem việc cần nhắc (lịch, mũi tiêm)","Gộp hồ sơ khách trùng","Nhắn tin với quản trị"])],
 [("Đăng ký tài khoản","Xác nhận email","extend"),("Đặt lịch khám, tiêm","Xem khung giờ trống","include"),("Đặt lịch hộ khách","Xem khung giờ trống","include")],"hinh-2-3-usecase-khach-chu-nuoi-le-tan.png")
usecase("b",[("Bác sĩ",["Xem lịch khám trong ngày","Ghi hồ sơ khám","Kê đơn thuốc (trừ kho)","Ghi mũi tiêm, hẹn mũi tiếp","Xem bệnh án (có ghi nhật ký)","Sửa hồ sơ công khai"]),
 ("Thu ngân",["Lập hóa đơn","Ghi nhận thanh toán","Hủy hóa đơn","Xem doanh thu ngày"]),
 ("Thủ kho",["Nhập kho theo lô","Kiểm kê, điều chỉnh tồn","Xem cảnh báo hết hạn, sắp hết"]),
 ("Quản trị viên",["Quản lý tài khoản, vai trò, khóa","Quản lý dịch vụ, thuốc, lịch làm việc","Xem báo cáo doanh thu","Duyệt đánh giá, viết tin tức","Xem nhật ký, đặt tham số, bảo trì"])],
 [("Kê đơn thuốc (trừ kho)","Ghi hồ sơ khám","include"),("Ghi mũi tiêm, hẹn mũi tiếp","Ghi hồ sơ khám","include")],"hinh-2-4-usecase-nhan-vien-quan-tri.png")

# ---------- DFD ----------
def proc(ax,cx,cy,t,r=0.95):
    ax.add_patch(Ellipse((cx,cy),2*r*1.25,2*r,fc="white",ec=INK,lw=1.6,zorder=3)); ax.text(cx,cy,t,ha="center",va="center",fontsize=9,fontweight="bold",color=INK,zorder=4,linespacing=1.3)
def ent(ax,cx,cy,t,w=1.7,h=0.55,fill=SOFT):
    ax.add_patch(Rectangle((cx-w/2,cy-h/2),w,h,fc=fill,ec=INK,lw=1.3,zorder=3)); ax.text(cx,cy,t,ha="center",va="center",fontsize=9,fontweight="bold",color=INK,zorder=4,linespacing=1.2)
def store(ax,cx,cy,code,t,w=2.7,h=0.5):
    ax.add_patch(Rectangle((cx-w/2,cy-h/2),w,h,fc="white",ec=INK,lw=1.1,zorder=3)); ax.plot([cx-w/2+0.45]*2,[cy-h/2,cy+h/2],color=INK,lw=1.1,zorder=4)
    ax.text(cx-w/2+0.22,cy,code,ha="center",va="center",fontsize=8.5,fontweight="bold",zorder=4); ax.text(cx-w/2+0.55,cy,t,ha="left",va="center",fontsize=8.2,zorder=4)
def flow(ax,a,b,lab=None,lp=None,c=INK,ls="-",both=False,fs=7.6,ha="center"):
    ax.annotate("",xy=b,xytext=a,arrowprops=dict(arrowstyle="<|-|>" if both else "-|>",color=c,lw=1,ls=ls,mutation_scale=9,shrinkA=0,shrinkB=0),zorder=2)
    if lab:
        p=lp or ((a[0]+b[0])/2,(a[1]+b[1])/2)
        ax.text(p[0],p[1],lab,ha=ha,va="center",fontsize=fs,color=GREY,linespacing=1.25,zorder=5,bbox=dict(fc="white",ec="none",pad=1.2))
import math
def lab(ax,p,t,fs=7.6,ha="center"): ax.text(p[0],p[1],t,ha=ha,va="center",fontsize=fs,color=GREY,linespacing=1.25,zorder=5,bbox=dict(fc="white",ec="none",pad=1.2))
def flow(ax,a,b,t=None,at=0.5,c=INK,ls="-",both=False,off=(0,0),ha="center"):
    ax.annotate("",xy=b,xytext=a,arrowprops=dict(arrowstyle="<|-|>" if both else "-|>",color=c,lw=1,ls=ls,mutation_scale=9,shrinkA=0,shrinkB=0),zorder=2)
    if t: lab(ax,(a[0]+(b[0]-a[0])*at+off[0],a[1]+(b[1]-a[1])*at+off[1]),t,ha=ha)
def proc(ax,cx,cy,t,a=1.25,b=0.85):
    ax.add_patch(Ellipse((cx,cy),2*a,2*b,fc="white",ec=INK,lw=1.6,zorder=3)); ax.text(cx,cy,t,ha="center",va="center",fontsize=9,fontweight="bold",zorder=4,linespacing=1.3)
def ent(ax,cx,cy,t,w=1.7,h=0.55,fill=SOFT):
    ax.add_patch(Rectangle((cx-w/2,cy-h/2),w,h,fc=fill,ec=INK,lw=1.3,zorder=3)); ax.text(cx,cy,t,ha="center",va="center",fontsize=9,fontweight="bold",zorder=4)
def store(ax,cx,cy,code,t,w=2.6,h=0.5):
    ax.add_patch(Rectangle((cx-w/2,cy-h/2),w,h,fc="white",ec=INK,lw=1.1,zorder=3)); ax.plot([cx-w/2+0.45]*2,[cy-h/2,cy+h/2],color=INK,lw=1.1,zorder=4)
    ax.text(cx-w/2+0.22,cy,code,ha="center",va="center",fontsize=8.5,fontweight="bold",zorder=4); ax.text(cx-w/2+0.55,cy,t,ha="left",va="center",fontsize=8.2,zorder=4)
# ---- level 0
W,H=13,8.8; f,ax=fig(W,H); cx,cy,a,b=6.5,4.4,1.9,1.35
ax.add_patch(Ellipse((cx,cy),2*a,2*b,fc="white",ec=INK,lw=2.2,zorder=3)); ax.text(cx,cy,"0\nHệ thống quản lý\nphòng khám thú y\nPethy",ha="center",va="center",fontsize=11,fontweight="bold",linespacing=1.35,zorder=4)
def pt(t): return (cx+a*math.cos(t),cy+b*math.sin(t))
def side(name,x,y,out,inn,left):
    ent(ax,x,y,name,w=1.9); ex=x+0.95 if left else x-0.95
    phi=math.atan2((y-cy)/b,(x-cx)/a)
    p1=pt(phi+(0.13 if left else -0.13)*(1 if True else 1)); p2=pt(phi-(0.13 if left else -0.13))
    # out: entity -> process (upper line), in: process -> entity (lower line)
    up,low=(p1,p2) if p1[1]>p2[1] else (p2,p1)
    flow(ax,(ex,y+0.14),up,out,at=0.45,off=(0,0.0)); flow(ax,low,(ex,y-0.14),inn,at=0.55)
for n,x,y,o,i in [("Chủ nuôi",1.2,7.6,"thông tin đăng ký, thú cưng,\nyêu cầu đặt, đổi, hủy lịch, đánh giá","khung giờ trống, trạng thái lịch,\nhồ sơ khám, hóa đơn"),
  ("Lễ tân",1.2,4.4,"khách trực tiếp, xác nhận,\ntừ chối lịch, ghi nhận nhắc","lịch chờ,\nviệc cần nhắc"),
  ("Bác sĩ",1.2,1.2,"hồ sơ khám, đơn thuốc,\nmũi tiêm, hồ sơ công khai","lịch khám,\nbệnh án thú cưng")]: side(n,x,y,o,i,True)
for n,x,y,o,i in [("Thu ngân",11.8,7.6,"yêu cầu lập hóa đơn,\nghi nhận thanh toán","hóa đơn,\ndoanh thu ngày"),
  ("Thủ kho",11.8,4.4,"nhập kho theo lô,\nđiều chỉnh tồn","tồn kho, cảnh báo\nhết hạn, sắp hết"),
  ("Quản trị viên",11.8,1.2,"tài khoản, vai trò, danh mục,\ntham số, bài viết","báo cáo doanh thu,\nnhật ký thao tác")]: side(n,x,y,o,i,False)
ent(ax,6.5,8.3,"Cloudflare Turnstile",w=2.6,fill="#EDEDED"); ent(ax,6.5,0.5,"Dịch vụ gửi email (SMTP)",w=2.9,fill="#EDEDED")
flow(ax,(6.0,8.02),(6.0,5.75),"mã kiểm tra",at=0.5,off=(-0.75,0)); flow(ax,(7.0,5.78),(7.0,8.02),'kết quả\n"không phải robot"',at=0.5,off=(1.0,0))
flow(ax,(6.5,3.05),(6.5,0.78),"thư xác nhận email,\nthư đặt lại mật khẩu",at=0.5,off=(1.15,0))
f.savefig(OUT+"hinh-2-5-dfd-ngu-canh.png",dpi=200); plt.close(f)
# ---- level 1
W,H=15,11; f,ax=fig(W,H)
P={1:(5,9.0,"1.0\nXác thực và\ntài khoản"),2:(3,6.0,"2.0\nKhách hàng và\nthú cưng"),3:(7,6.0,"3.0\nĐặt lịch và\nquản lý lịch hẹn"),4:(11,6.0,"4.0\nKhám, kê đơn,\ntiêm phòng"),
   7:(3,2.6,"7.0\nBáo cáo và\nnhật ký"),6:(7,2.6,"6.0\nHóa đơn và\nthanh toán"),5:(11,2.6,"5.0\nKho thuốc")}
for k,(x,y,t) in P.items(): proc(ax,x,y,t)
for (x,y,c,t,w) in [(9,9.0,"D1","Tài khoản, vai trò",2.6),(3.5,7.6,"D2","Chủ nuôi, thú cưng",2.4),(7,7.6,"D3","Lịch hẹn, dịch vụ",2.5),(11,7.6,"D4","Hồ sơ khám, đơn, mũi tiêm",3.0),
    (3,0.8,"D7","Nhật ký thao tác",2.5),(7,0.8,"D6","Hóa đơn, thanh toán",2.5),(11.3,0.8,"D5","Thuốc, lô, biến động kho",2.8)]: store(ax,x,y,c,t,w=w)
ent(ax,1.1,9.0,"Chủ nuôi",w=1.5); ent(ax,5,10.4,"Quản trị viên",w=1.8); ent(ax,5,4.1,"Lễ tân",w=1.3); ent(ax,13.9,6.9,"Bác sĩ",w=1.3)
ent(ax,13.9,2.6,"Thủ kho",w=1.3); ent(ax,9.0,0.8,"Thu ngân",w=1.3); ent(ax,1.0,4.3,"Quản trị viên",w=1.6)
# 1.0
flow(ax,(1.85,9.0),(3.75,9.0),"đăng ký,\nđăng nhập",off=(0,0.42))
flow(ax,(5,10.12),(5,9.85),both=False); lab(ax,(6.2,10.0),"phân quyền, khóa",ha="left")
flow(ax,(6.25,9.0),(7.7,9.0),both=True)
# 2.0 / 3.0 / 4.0 with stores
flow(ax,(1.1,8.72),(2.2,6.78),"thông tin\nthú cưng",at=0.4,off=(-0.7,0))
for x in (3,7,11): flow(ax,(x,7.35),(x,6.85),both=True)
flow(ax,(4.4,4.3),(3.4,5.25),both=True); lab(ax,(2.6,4.5),"khách trực tiếp,\ngộp hồ sơ")
flow(ax,(5.6,4.3),(6.4,5.25),both=True); lab(ax,(5.0,3.55),"đặt hộ, xác nhận /\nlịch chờ, việc nhắc")
flow(ax,(4.25,6.0),(5.75,6.0),"thú cưng\ncủa chủ",off=(0,0.42))
flow(ax,(8.25,6.0),(9.75,6.0),"lịch đã xác nhận /\nhoàn thành",both=True,off=(0,0.45))
flow(ax,(13.25,6.7),(11.95,6.5),both=True); lab(ax,(13.5,5.9),"hồ sơ khám, đơn,\nmũi tiêm / lịch khám")
# 4.0 -> 5.0, 3.0 -> 6.0, 4.0 -> 6.0
flow(ax,(11,5.15),(11,3.45),"xuất kho\ntheo đơn",off=(0.8,0))
flow(ax,(7,5.15),(7,3.45),"lịch hoàn\nthành",off=(0.75,0))
flow(ax,(10.1,5.4),(8.1,3.3)); lab(ax,(9.45,4.35),"thuốc,\nmũi tiêm")
# 5.0
flow(ax,(11,1.75),(11,1.05),both=True)
flow(ax,(13.25,2.6),(12.25,2.6),both=True); lab(ax,(12.9,3.5),"nhập kho, kiểm kê /\ntồn, cảnh báo")
# 6.0
flow(ax,(7,1.75),(7,1.05),both=True)
# 7.0
flow(ax,(5.75,2.6),(4.25,2.6),"thanh toán\n(từ D6)",off=(0,0.42))
flow(ax,(3,1.75),(3,1.05),both=True)
flow(ax,(1.2,4.0),(2.3,3.3),both=True); lab(ax,(0.9,3.5),"xem báo cáo /\ndoanh thu, nhật ký")
flow(ax,(9.0,1.08),(8.0,2.0),both=True); lab(ax,(9.2,1.75),"lập hóa đơn,\nthu tiền / hóa đơn",)
f.savefig(OUT+"hinh-2-6-dfd-muc-1.png",dpi=200); plt.close(f)
