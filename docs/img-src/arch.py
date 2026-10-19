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
def fig(W,H):
    f=plt.figure(figsize=(W,H),dpi=220,facecolor=BG); ax=f.add_axes([0,0,1,1]); ax.set_xlim(0,W); ax.set_ylim(0,H); ax.axis("off"); return f,ax

def vline(ax,x,y0,y1,c=INK): ax.plot([x,x],[y0,y1],color=c,lw=1)
def arrow(ax,x,y0,y1):
    ax.annotate("",xy=(x,y1),xytext=(x,y0),arrowprops=dict(arrowstyle="-|>",color=INK,lw=1,mutation_scale=9))
def tbox(ax,x,y,w,h,title,sub=None,fill=BG,fg=INK,ec=INK,lw=1.1,wrapn=None):
    ax.add_patch(Rectangle((x,y),w,h,fc=fill,ec=ec,lw=lw))
    ax.text(x+w/2,y+h-0.14,title,ha="center",va="top",fontsize=9.5,fontweight="bold",color=fg)
    if sub:
        n=wrapn or int(w*10.5)
        ax.text(x+w/2,y+h-0.42,"\n".join(textwrap.wrap(sub,n)),ha="center",va="top",fontsize=8.3,color=(GREY if fill==BG else fg),linespacing=1.3)
W=5.4;H=8.1
f,ax=fig(W,H)
bx,bw_=0.7,W-1.4
y=H-0.3
tbox(ax,bx,y-0.85,bw_,0.85,"Người dùng","6 vai trò: chủ nuôi, lễ tân, bác sĩ, thu ngân, thủ kho, admin")
arrow(ax,W/2,y-0.85,y-1.3)
y2=y-1.3
tbox(ax,bx,y2-0.85,bw_,0.85,"Trình duyệt","Giao diện HTML, CSS, JavaScript thuần")
ysplit=y2-0.85-0.3
cfx=1.2; sbx=3.85
vline(ax,W/2,y2-0.85,ysplit); ax.plot([cfx,sbx],[ysplit,ysplit],color=INK,lw=1)
ytop=ysplit-0.75
arrow(ax,cfx,ysplit,ytop); arrow(ax,sbx,ysplit,ytop)
ax.text(cfx+0.08,ysplit-0.35,"tải trang",fontsize=8,color=GREY,va="center")
ax.text(sbx-0.08,ysplit-0.32,"gửi khóa công khai\nvà token đăng nhập",fontsize=8,color=GREY,va="center",ha="right",linespacing=1.3)
tbox(ax,0.2,ytop-1.15,2.0,1.15,"Cloudflare Pages","Chỉ phục vụ file giao diện, không chạy nghiệp vụ")
cx,cw=2.5,2.7
ch=0.5+0.8+0.12+0.8+0.45+1.55+0.2
cy=ytop-ch
ax.add_patch(Rectangle((cx,cy),cw,ch,fc="#F3F3F0",ec=INK,lw=1.1))
ax.text(cx+0.12,ytop-0.12,"Supabase",fontsize=10,fontweight="bold",va="top",color=INK)
gw=(cw-0.3)/2
gy1=ytop-0.5-0.8
items=[("Auth","đăng nhập, cấp token"),("API","đọc bảng, gọi hàm"),("Storage","ảnh bác sĩ"),("Realtime","tin nhắn tức thời")]
pos=[(cx+0.1,gy1),(cx+0.2+gw,gy1),(cx+0.1,gy1-0.92),(cx+0.2+gw,gy1-0.92)]
for (t,s_),(x,yy) in zip(items,pos): tbox(ax,x,yy,gw,0.8,t,s_,wrapn=15)
gbot=gy1-0.92
pgh=1.55; pgy=cy+0.2
arrow(ax,cx+cw/2,gbot,pgy+pgh)
tbox(ax,cx+0.1,pgy,cw-0.2,pgh,"PostgreSQL","23 bảng, 26 hàm nghiệp vụ, trigger, phân quyền theo dòng (RLS). Mọi quy tắc và quyền nằm ở đây.",fill=INK,fg="#FFFFFF",wrapn=26)
f.savefig(OUT+"hinh-3-1-kien-truc.png"); plt.close(f)
