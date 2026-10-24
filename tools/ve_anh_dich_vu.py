# Sinh tranh minh họa dịch vụ (SVG, tự vẽ cho Pethy). Chạy: python3 tools/ve_anh_dich_vu.py
import os
INK='#2A2420'; TEAL='#14A39A'; YEL='#FFC83D'; PINK='#FFD6CC'; MINT='#C9EFEA'; CREAM='#FFF0C2'; WHITE='#fff'
def svg(bg, body, deco=''):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" aria-hidden="true">'
      f'<rect width="320" height="180" fill="{bg}"/>{deco}'
      f'<g fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">{body}</g></svg>')
def dots(c1,c2):
    return (f'<circle cx="38" cy="42" r="22" fill="{c1}"/><circle cx="288" cy="140" r="30" fill="{c1}"/><circle cx="270" cy="34" r="9" fill="{c2}"/><circle cx="52" cy="146" r="7" fill="{c2}"/>'
            f'<path d="M232 22l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="{c2}" stroke="none"/>')
paw=lambda x,y,s,f: (f'<g transform="translate({x} {y}) scale({s})" fill="{f}"><path d="M0 8c-9 0-14 7-14 13 0 5 5 7 14 7s14-2 14-7c0-6-5-13-14-13z"/>'
  '<ellipse cx="-17" cy="-3" rx="5" ry="7"/><ellipse cx="-6" cy="-12" rx="5" ry="8"/><ellipse cx="6" cy="-12" rx="5" ry="8"/><ellipse cx="17" cy="-3" rx="5" ry="7"/></g>')
S={}
# Khám tổng quát: bảng ghi chép + ống nghe
S['kham']=svg(MINT,
 f'<rect x="60" y="30" width="96" height="124" rx="10" fill="{WHITE}"/><rect x="92" y="22" width="32" height="16" rx="6" fill="{YEL}"/>'
 f'<path d="M78 64h60M78 82h60M78 100h40"/><path d="M78 124h14l6-12 8 22 6-10h18"/>'
 f'<path d="M206 40v36a26 26 0 0 0 52 0V40" /><path d="M232 102v14a22 22 0 0 0 44 0v-6"/><circle cx="276" cy="100" r="9" fill="{PINK}"/><path d="M206 40h-8M258 40h8"/>', dots('#E3F7F4',YEL))
# Tiêm phòng: ống tiêm + khiên
S['tiem']=svg(PINK,
 f'<g transform="rotate(-35 120 92)"><rect x="66" y="78" width="110" height="28" rx="6" fill="{WHITE}"/><path d="M176 92h30M206 86v12M66 92H44M44 82v20"/><rect x="104" y="78" width="46" height="28" fill="{MINT}"/><path d="M88 78v10M104 78v10M120 78v10"/></g>'
 f'<path d="M244 46l36 12v30c0 24-16 38-36 46-20-8-36-22-36-46V58z" fill="{CREAM}"/><path d="M226 92l13 13 24-26"/>'
 f'<path d="M72 138c0-9 8-14 8-22 8 6 10 14 8 22a8 8 0 0 1-16 0z" fill="{MINT}"/>', dots('#FFE9E3',YEL))
# Tái khám: lịch + dấu tích + mũi tên vòng
S['tai-kham']=svg(CREAM,
 f'<rect x="78" y="40" width="130" height="112" rx="12" fill="{WHITE}"/><path d="M78 72h130M110 28v22M176 28v22"/><path d="M104 108l14 14 28-30"/>'
 f'<circle cx="240" cy="108" r="30" fill="{MINT}"/><path d="M240 92v18l12 8"/><path d="M262 78l2 12-12-2"/>', dots('#FFF7DA',TEAL))
# Tắm, spa: bồn tắm + bọt + vịt
S['tam']=svg(MINT,
 f'<path d="M58 98h204v14a38 38 0 0 1-38 38H96a38 38 0 0 1-38-38z" fill="{WHITE}"/><path d="M80 150l-6 12M240 150l6 12"/><path d="M58 98h204"/>'
 f'<circle cx="104" cy="74" r="16" fill="{WHITE}"/><circle cx="128" cy="58" r="11" fill="{PINK}"/><circle cx="82" cy="52" r="8" fill="{WHITE}"/><circle cx="150" cy="80" r="9" fill="{WHITE}"/>'
 f'<path d="M190 98c-16 0-20-16-8-24 0-10 8-16 18-14 8 2 10 8 8 14 8 2 12 8 12 12 0 8-8 12-30 12z" fill="{YEL}"/><circle cx="196" cy="68" r="2" fill="{INK}"/><path d="M212 70l10 2-9 5"/>', dots('#E3F7F4',YEL))
# Cắt tỉa lông: kéo + lược
S['cat-tia']=svg(PINK,
 f'<circle cx="104" cy="128" r="17" fill="{WHITE}"/><circle cx="154" cy="128" r="17" fill="{WHITE}"/><path d="M114 116L196 36M144 116L62 36"/>'
 f'<rect x="196" y="76" width="82" height="22" rx="6" fill="{YEL}" transform="rotate(20 237 87)"/><path d="M206 100l-4 14M218 105l-4 14M230 110l-4 14M242 115l-4 14M254 120l-4 14" />', dots('#FFE9E3',TEAL))
# Xét nghiệm, siêu âm: ống nghiệm + giọt
S['xet-nghiem']=svg(MINT,
 f'<path d="M92 32v90a22 22 0 0 0 44 0V32z" fill="{WHITE}"/><path d="M92 82h44v40a22 22 0 0 1-44 0z" fill="{PINK}"/><path d="M84 32h60"/>'
 f'<path d="M168 52v70a22 22 0 0 0 44 0V52z" fill="{WHITE}"/><path d="M168 92h44v30a22 22 0 0 1-44 0z" fill="{YEL}"/><path d="M160 52h60"/>'
 f'<path d="M258 74c-14 18-20 28-20 38a20 20 0 0 0 40 0c0-10-6-20-20-38z" fill="{CREAM}"/><path d="M250 112a8 8 0 0 0 8 8"/>', dots('#E3F7F4',TEAL))
# Phẫu thuật, điều trị: băng cá nhân + dấu thập
S['phau-thuat']=svg(CREAM,
 f'<g transform="rotate(-30 160 90)"><rect x="70" y="66" width="180" height="48" rx="24" fill="{PINK}"/><rect x="132" y="66" width="56" height="48" fill="{WHITE}"/><circle cx="148" cy="82" r="2" fill="{INK}"/><circle cx="172" cy="82" r="2" fill="{INK}"/><circle cx="148" cy="98" r="2" fill="{INK}"/><circle cx="172" cy="98" r="2" fill="{INK}"/></g>'
 f'<path d="M252 118v36M234 136h36" stroke="{TEAL}" stroke-width="8"/>', dots('#FFF7DA',TEAL))
# Nha khoa: răng + bàn chải
S['nha-khoa']=svg(MINT,
 f'<path d="M96 48c14-14 34-8 48 0 14-8 34-14 48 0 12 14 4 34-2 52-4 22-8 44-20 44-10 0-8-30-26-30s-16 30-26 30c-12 0-16-22-20-44-6-18-14-38-2-52z" fill="{WHITE}"/>'
 f'<path d="M116 66c4-6 10-8 16-6" />'
 f'<rect x="212" y="120" width="76" height="14" rx="7" fill="{YEL}" transform="rotate(-35 250 127)"/><path d="M232 98l8-8M240 106l8-8M248 114l8-8" stroke="{TEAL}"/><path d="M258 36l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="{YEL}"/>', dots('#E3F7F4',PINK))
# Lưu chuồng, trông giữ: nhà + dấu chân
S['luu-chuong']=svg(PINK,
 f'<path d="M72 88L160 28l88 60v62H72z" fill="{WHITE}"/><path d="M60 94L160 24l100 70"/><path d="M130 150v-36a30 30 0 0 1 60 0v36z" fill="{CREAM}"/>'
 f'<path d="M160 70c-8 0-12 5-12 9s5 6 12 6 12-2 12-6-4-9-12-9z" fill="{TEAL}" stroke="none"/>', dots('#FFE9E3',YEL))
# Mặc định: dấu chân + dấu thập
S['chung']=svg(CREAM,
 paw(150,96,2.6,PINK).replace('<g ','<g stroke="'+INK+'" stroke-width="2.4" ')+
 f'<path d="M248 56v32M232 72h32" stroke="{TEAL}" stroke-width="8"/>', dots('#FFF7DA',YEL))
os.makedirs('web/img/dv',exist_ok=True)
for k,v in S.items(): open(f'web/img/dv/{k}.svg','w').write(v)
print(len(S),'ảnh')
