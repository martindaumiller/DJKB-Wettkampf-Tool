"""Export reviewed SDM winners and generate separate public discipline PDFs.
Optional tooling only: Python with pypdf/reportlab. No participant-contact export.
"""
from pathlib import Path
import json,shutil,sys,base64,tempfile
from xml.sax.saxutils import escape
from pypdf import PdfReader,PdfWriter
from reportlab.platypus import SimpleDocTemplate,Paragraph,Table,TableStyle,Spacer,KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
root=Path(__file__).resolve().parent.parent
source=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root.parent/'siegerliste'
data=json.loads((source/'validated-data.json').read_text(encoding='utf-8'))
out=root/'public/ergebnisse';out.mkdir(parents=True,exist_ok=True)
alias={'SKD Singen':'SKD-Singen','Hohenschwangau':'Karate Dojo Hohenschwangau'}
groups=[]
for group in data['groups']:
 winners=[]
 for person in sorted(group['winners'],key=lambda w:w['rank']):
  name,*members=person['name'].split('\n',1)
  rec={'rank':person['rank'],'name':name,'dojo':alias.get(person['dojo'],person['dojo'])}
  if members:rec['members']=members[0]
  winners.append(rec)
 g={k:group[k] for k in ['code','title','desc','kind']}|{'winners':winners}
 if g['code']=='B4 M':g['code']='B4 M/W'
 if g['code']=='B1 M':g['desc']='männlich; B1: 8.-6. Kyu, 8-10 Jahre; A3: ab 6. Kyu, bis 7 Jahre'
 if g['code']=='B2 M':g['desc']='männlich; B2: 8.-6. Kyu, 8-10 Jahre; A4: ab 6. Kyu, bis 7 Jahre'
 groups.append(g)
assert len(groups)==57 and sum(len(g['winners']) for g in groups)==213
groups.sort(key=lambda g:(['Kata Einzel','Kata Team','Kumite Einzel','Kumite Team'].index(g['kind']),g['code']))
pdf=source/'SDM-2026-Siegerliste.pdf';shutil.copyfile(pdf,out/pdf.name)
reader=PdfReader(pdf);writer=PdfWriter();writer.add_page(reader.pages[-1])
with (out/'SDM-2026-Gesamtklassement-Wanderpokal.pdf').open('wb') as stream:writer.write(stream)
# Generate by competition, because several disciplines share pages in the full PDF.
(root/'tmp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(dir=root/'tmp') as tmp:
 font=Path(tmp)/'NotoSans.ttf';font.write_bytes(base64.b64decode(json.loads((root/'lib/tournament/invoice-font.json').read_text())['data']))
 pdfmetrics.registerFont(TTFont('Noto',str(font)))
 W,H=A4;left=17*mm;width=W-2*left
 styles={'title':ParagraphStyle('title',fontName='Noto',fontSize=19,leading=24,spaceAfter=12,textColor=colors.HexColor('#183b35')),'body':ParagraphStyle('body',fontName='Noto',fontSize=9,leading=12),'small':ParagraphStyle('small',fontName='Noto',fontSize=8,leading=11),'head':ParagraphStyle('head',fontName='Noto',fontSize=10,leading=13,textColor=colors.HexColor('#183b35'))}
 def p(value,style='body'):return Paragraph(escape(str(value)),styles[style])
 def header(c,doc):
  c.saveState();c.setFont('Noto',9);c.setFillColor(colors.HexColor('#183b35'));c.drawString(left,H-17*mm,'Süddeutsche Meisterschaft 2026');c.drawRightString(W-left,H-17*mm,'24. Oktober 2026 - Nürnberg');c.setStrokeColor(colors.HexColor('#bec8bc'));c.line(left,H-22*mm,W-left,H-22*mm);c.setFont('Noto',7);c.setFillColor(colors.HexColor('#5d6b63'));c.drawString(left,12*mm,'Auszug aus der freigegebenen Siegerliste - Stand 25.10.2026');c.drawRightString(W-left,12*mm,str(doc.page));c.restoreState()
 for section in ['Kata Einzel','Kata Team','Kumite Einzel','Kumite Team']:
  story=[p(section,'title')];team='Team' in section
  for group in [g for g in groups if g['kind']==section]:
   heading=Table([[p(group['code'],'head'),p(group['desc'],'head')]],colWidths=[53,width-53]);heading.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
   rows=[]
   for winner in group['winners']:
    name=escape(winner['name'])
    if winner.get('members'):name+='<br/><font size="7.6">'+escape(winner['members'])+'</font>'
    rows.append([p(winner['rank']),Paragraph(name,styles['body']),p(winner['dojo'],'small')])
   table=Table(rows,colWidths=[30,width*.56,width*.44-30]);table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7 if team else 3)]))
   story.append(KeepTogether([heading,table,Spacer(1,13)]))
  target=out/('SDM-2026-'+section.replace(' ','-')+'.pdf')
  doc=SimpleDocTemplate(str(target),pagesize=A4,leftMargin=left,rightMargin=left,topMargin=29*mm,bottomMargin=22*mm,title='SDM 2026 - '+section,author='DJKB Stützpunkt Süd')
  doc.build(story,onFirstPage=header,onLaterPages=header)
result={'date':'2026-10-24','source':'Freigegebene Siegerliste, Stand 25.10.2026','dojoCount':len(data['ranking']),'pdfBytes':pdf.stat().st_size,'trophy':[{'rank':1,'dojo':'KD Sportfreunde Reichenberg','points':43},{'rank':2,'dojo':'TV Bushido Tamm','points':39},{'rank':3,'dojo':'SV 1880 München','points':37}],'groups':groups}
(out/'results.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('Public results:',len(groups),'groups,',sum(len(g['winners']) for g in groups),'placements.')
