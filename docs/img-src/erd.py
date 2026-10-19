import subprocess
OUT="../img/"
INK="#14161A"; GREY="#5B6068"
def node(name, cols, ref=False):
    rows="".join(f'<TR><TD ALIGN="LEFT" BORDER="0"><FONT POINT-SIZE="10" COLOR="{INK if not c.startswith("FK") else GREY}">{c}</FONT></TD></TR>' for c in cols)
    fill="#F3F3F0" if ref else "white"
    return f'''"{name}" [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="4" BGCOLOR="{fill}">
<TR><TD BGCOLOR="{INK if not ref else "#5B6068"}"><FONT COLOR="white" POINT-SIZE="11"><B>{name}</B></FONT></TD></TR>{rows}</TABLE>>];'''
def edge(a,b,t="1",h="N",label=None):
    l=f', label="  {label}", fontsize=9, fontcolor="{GREY}"' if label else ""
    return f'"{a}" -> "{b}" [taillabel="{t}", headlabel="{h}"{l}];'
def render(fname, nodes, edges, extra=""):
    dot=f'''digraph G {{ rankdir=TB; nodesep=0.45; ranksep=0.7; pad=0.25; bgcolor="white"; dpi=200;
node [shape=plain, fontname="Inter"]; edge [arrowhead=none, color="#5B6068", fontname="Inter", fontsize=10, labeldistance=1.6, labelangle=0, penwidth=1.1];
{extra}
{chr(10).join(nodes)}
{chr(10).join(edges)}
}}'''
    subprocess.run(["dot","-Tpng","-o",OUT+fname],input=dot.encode(),check=True)

# 4.1
render("hinh-4-1-erd-nguoi-dung-lich-hen.png",[
 node("tai_khoan",["PK id","ho_ten","so_dien_thoai","vai_tro","trang_thai"]),
 node("chu_nuoi",["PK id","FK tai_khoan_id","ho_ten","so_dien_thoai","dia_chi"]),
 node("ho_so_bac_si",["PK id","FK tai_khoan_id","chuyen_mon","gioi_thieu","anh_dai_dien"]),
 node("lich_lam_viec",["PK id","FK bac_si_id","thu_trong_tuan","gio_bat_dau","gio_ket_thuc"]),
 node("thu_cung",["PK id","FK chu_nuoi_id","ten","loai","ngay_sinh"]),
 node("dich_vu",["PK id","ten","loai","gia","dang_ap_dung"]),
 node("lich_hen",["PK id","FK thu_cung_id","FK bac_si_id","FK dich_vu_id","FK vaccine_id","FK nguoi_xac_nhan_id","thoi_gian","trang_thai","ly_do_huy"]),
],[
 edge("tai_khoan","chu_nuoi","1","0..1"),
 edge("tai_khoan","ho_so_bac_si","1","0..1"),
 edge("tai_khoan","lich_lam_viec","1","N",label="bác sĩ"),
 edge("chu_nuoi","thu_cung"),
 edge("thu_cung","lich_hen"),
 edge("dich_vu","lich_hen"),
 edge("tai_khoan","lich_hen","1","N",label="bác sĩ, người xác nhận"),
])
# 4.2
render("hinh-4-2-erd-kham-thuoc-kho.png",[
 node("lich_hen",["PK id","..."],ref=True),
 node("ho_so_kham",["PK id","FK lich_hen_id (duy nhất)","chan_doan","can_nang","nhiet_do"]),
 node("don_thuoc",["PK id","FK ho_so_kham_id (duy nhất)"]),
 node("ct_don_thuoc",["PK id","FK don_thuoc_id","FK thuoc_id","so_luong","lieu_dung"]),
 node("mui_tiem",["PK id","FK thu_cung_id","FK thuoc_id","FK bac_si_id","FK lich_hen_id","ngay_tiem","ngay_tiem_tiep"]),
 node("thuoc",["PK id","ten","loai (thuốc, vaccine)","don_vi","gia_ban","nguong_canh_bao"]),
 node("lo_thuoc",["PK id","FK thuoc_id","so_lo","han_dung"]),
 node("bien_dong_kho",["PK id","FK lo_thuoc_id","FK nguoi_thuc_hien_id","FK ct_don_thuoc_id","FK mui_tiem_id","loai","so_luong","ly_do","thoi_gian"]),
],[
 edge("lich_hen","ho_so_kham","1","0..1"),
 edge("lich_hen","mui_tiem","1","0..N"),
 edge("ho_so_kham","don_thuoc","1","0..1"),
 edge("don_thuoc","ct_don_thuoc"),
 edge("thuoc","ct_don_thuoc"),
 edge("thuoc","mui_tiem"),
 edge("thuoc","lo_thuoc"),
 edge("lo_thuoc","bien_dong_kho"),
 edge("ct_don_thuoc","bien_dong_kho","1","0..N"),
 edge("mui_tiem","bien_dong_kho","1","0..N"),
])
# 4.3
render("hinh-4-3-erd-hoa-don-nhac-lich.png",[
 node("lich_hen",["PK id","..."],ref=True),
 node("mui_tiem",["PK id","..."],ref=True),
 node("hoa_don",["PK id","FK lich_hen_id","FK thu_ngan_id","tong_tien","trang_thai"]),
 node("ct_hoa_don",["PK id","FK hoa_don_id","mo_ta","so_luong","don_gia","thanh_tien"]),
 node("thanh_toan",["PK id","FK hoa_don_id","FK thu_ngan_id","so_tien","phuong_thuc","thoi_gian"]),
 node("nhac_lich",["PK id","FK lich_hen_id hoặc mui_tiem_id","kenh","trang_thai"]),
],[
 edge("lich_hen","hoa_don","1","N",label="tối đa 1 còn hiệu lực"),
 edge("hoa_don","ct_hoa_don"),
 edge("hoa_don","thanh_toan"),
 edge("lich_hen","nhac_lich","1","0..N"),
 edge("mui_tiem","nhac_lich","1","0..N"),
])
# 4.4
render("hinh-4-4-erd-nhat-ky-trao-doi.png",[
 node("tai_khoan",["PK id","..."],ref=True),
 node("tin_nhan",["PK id","FK nhan_vien_id","FK nguoi_gui_id","noi_dung","created_at"]),
 node("doc_tin_nhan",["PK nhan_vien_id, tai_khoan_id","doc_den"]),
 node("nhat_ky",["PK id","FK tai_khoan_id","hanh_dong","bang_tac_dong","gia_tri_cu, gia_tri_moi"]),
 node("gioi_han_goi",["PK id","FK nguoi_dung_id","hanh_dong","thoi_gian"]),
],[
 edge("tai_khoan","tin_nhan"),
 edge("tai_khoan","doc_tin_nhan"),
 edge("tai_khoan","nhat_ky"),
 edge("tai_khoan","gioi_han_goi"),
],extra="")

# 4.5 trang thai lich
def plain(name,label,final=False,start=False):
    per=2 if final else 1
    return f'"{name}" [shape=box, peripheries={per}, style=filled, fillcolor="white", fontname="Inter", fontsize=12, label="{label}", margin="0.25,0.14"];'
dot=f'''digraph G {{ rankdir=TB; nodesep=0.6; ranksep=0.65; pad=0.3; dpi=200; bgcolor="white";
edge [fontname="Inter", fontsize=10, color="#14161A", fontcolor="#5B6068", arrowsize=0.8];
"s1" [shape=box, style=filled, fillcolor="#14161A", fontcolor="white", fontname="Inter", fontsize=11, label="Chủ nuôi đặt lịch", margin="0.2,0.1"];
"s2" [shape=box, style=filled, fillcolor="#14161A", fontcolor="white", fontname="Inter", fontsize=11, label="Lễ tân đặt hộ", margin="0.2,0.1"];
{plain("cho","Chờ xác nhận")}
{plain("xn","Đã xác nhận")}
{plain("ht","Đã hoàn thành",True)}
{plain("huy","Đã hủy",True)}
{plain("kd","Không đến",True)}
s1 -> cho; s2 -> xn;
cho -> xn [label="  lễ tân xác nhận (trước giờ hẹn)"];
xn -> ht [label="  bác sĩ ghi hồ sơ khám hoặc mũi tiêm"];
xn -> kd [label="  lễ tân đánh dấu (sau giờ hẹn)"];
cho -> huy [label="  hủy kèm lý do"];
xn -> huy [label="  hủy kèm lý do"];
{{rank=same; ht; kd; huy}}
}}'''
subprocess.run(["dot","-Tpng","-o",OUT+"hinh-4-5-trang-thai-lich-hen.png"],input=dot.encode(),check=True)

# 4.6 kho
def bx(n,t,fill="white",fc=INK): return f'"{n}" [shape=box, style=filled, fillcolor="{fill}", fontcolor="{fc}", fontname="Inter", fontsize=11, label="{t}", margin="0.22,0.12"];'
dot=f'''digraph G {{ rankdir=TB; nodesep=0.5; ranksep=0.55; pad=0.3; dpi=200; bgcolor="white";
edge [fontname="Inter", fontsize=10, color="#14161A", fontcolor="#5B6068", arrowsize=0.8];
{bx("nhap","Nhập kho (thủ kho)\\nsố lô, hạn dùng, số lượng")}
{bx("ke","Kê đơn hoặc ghi mũi tiêm (bác sĩ)")}
{bx("dc","Điều chỉnh (thủ kho)\\nbắt buộc có lý do")}
{bx("fefo","Xuất kho tự động theo lô\\n1. Khóa các lô của thuốc\\n2. Bỏ lô quá hạn\\n3. Lấy lô gần hết hạn trước")}
{bx("loi","Không đủ hàng\\nlỗi KHO_KHONG_DU, hủy cả đơn", "#F3F3F0")}
{bx("so","Sổ cái bien_dong_kho\\nchỉ thêm dòng: nhập (+), xuất (−), điều chỉnh (±)", "#14161A", "white")}
{bx("ton","Tồn kho của lô = tổng so_luong các dòng\\nview ton_kho_lo, ton_kho_thuoc, canh_bao_kho")}
nhap -> so [label="  dòng +"];
dc -> so [label="  dòng ±"];
ke -> fefo;
fefo -> so [label="  đủ hàng: dòng −"];
fefo -> loi [label="  thiếu hàng"];
so -> ton;
{{rank=same; nhap; dc}}
nhap -> ke [style=invis];
}}'''
subprocess.run(["dot","-Tpng","-o",OUT+"hinh-4-6-kho-theo-lo.png"],input=dot.encode(),check=True)
